import datetime
import logging
import pytz
from dateutil.tz import tzutc
from pkg_resources import parse_version

import newrelic.agent
from django.core.cache import cache
from django.db.models import Max
from django.utils import timezone

from missioncontrol.celery import celery
from missioncontrol.base.models import (Build,
                                        Channel,
                                        Datum,
                                        Measure,
                                        Platform,
                                        Series)
from missioncontrol.settings import (MEASURE_SUMMARY_CACHE_EXPIRY,
                                     MISSION_CONTROL_TABLE)
from .measuresummary import (get_measure_summary_cache_key,
                             get_measure_summary)
from .versions import (get_current_firefox_version,
                       get_min_recent_firefox_version)


logger = logging.getLogger(__name__)


@celery.task
def update_measure(platform_name, channel_name, measure_name):
    '''
    Updates (or creates) a local cache entry for a specify platform/channel/measure
    aggregate, which can later be retrieved by the API

    Every channel has a different minimum build_id/timestamp,
    defined in the settings. For any given point later than the
    minimum timestamp we may reject it because it's too old.
    '''
    # hack: importing raw_query here to make monkeypatching work
    # (if we put it on top it is impossible to override if something
    # else imports this module first)
    from .presto import raw_query

    logger.info('Updating measure: %s %s %s', channel_name, platform_name,
                measure_name)

    newrelic.agent.add_custom_parameter("platform", platform_name)
    newrelic.agent.add_custom_parameter("channel", channel_name)
    newrelic.agent.add_custom_parameter("measure", measure_name)

    platform = Platform.objects.get(name=platform_name)
    channel = Channel.objects.get(name=channel_name)
    measure = Measure.objects.get(name=measure_name,
                                  platform=platform)

    min_timestamp = timezone.now() - channel.update_interval
    min_timestamp_in_data = Datum.objects.filter(
        series__build__channel=channel,
        series__measure=measure).aggregate(Max('timestamp'))['timestamp__max']
    if min_timestamp_in_data:
        min_timestamp = max([min_timestamp, min_timestamp_in_data])

    # ignore any buildids older than twice the update interval
    min_buildid_timestamp = timezone.now() - (channel.update_interval * 2)

    # also place a restriction on version (to avoid fetching data
    # for bogus versions)
    current_version = get_current_firefox_version(channel_name)
    min_version = get_min_recent_firefox_version(channel_name)

    # we prefer to specify parameters in a seperate params dictionary
    # where possible (to reduce the risk of creating a malformed
    # query from incorrect parameters
    query_template = f'''
        select window_start, build_id, version, display_version, sum({measure_name}),
        sum(usage_hours), sum(count) as client_count
        from {MISSION_CONTROL_TABLE} where
        application=\'Firefox\' and
        version >= %(min_version)s and version <= %(current_version)s and
        build_id > %(min_build_id)s and
        os_name=%(os_name)s and
        channel=%(channel_name)s and
        window_start > timestamp %(min_timestamp)s and
        submission_date >= %(min_submission_date)s
        group by (window_start, build_id, version, display_version)
        having sum(count) > %(min_client_count)s'''.replace('\n', '').strip()
    params = {
        'min_version': min_version,
        'current_version': current_version,
        'min_build_id': min_buildid_timestamp.strftime('%Y%m%d'),
        'os_name': platform.telemetry_name,
        'channel_name': channel_name,
        'min_client_count': channel.min_expected_client_count,
        'min_timestamp': min_timestamp.strftime("%Y-%m-%d %H:%M:%S"),
        'min_submission_date': min_timestamp.strftime("%Y-%m-%d")
    }
    logger.info('Querying: %s', query_template % params)

    # bulk create any new datum objects from the returned results
    series_cache = {}
    datum_objs = []
    for (window_start, build_id, version, display_version, measure_count,
         usage_hours, client_count) in raw_query(query_template, params):
        if measure_count is None:
            measure_count = 0
        # skip datapoints with negative measure counts or no usage hours
        # (in theory negative measures should be rejected at the ping
        # validation level, but this is not yet the case at the time of this
        # writing -- https://bugzilla.mozilla.org/show_bug.cgi?id=1447038)
        if measure_count < 0 or usage_hours <= 0:
            continue
        # presto doesn't understand that 59.0 > 59.0b2 for beta, so reject
        # early releases here
        if channel == 'beta' and display_version and \
           parse_version(display_version) > parse_version(current_version):
            continue
        series = series_cache.get((build_id, version))
        if not series:
            build, _ = Build.objects.get_or_create(
                platform=platform, channel=channel, build_id=build_id,
                version=(display_version or version))
            series, _ = Series.objects.get_or_create(build=build,
                                                     measure=measure)
            series_cache[(build_id, version)] = series

        try:
            buildstamp = pytz.utc.localize(
                datetime.datetime.strptime(build_id, '%Y%m%d%H%M%S'))
        except ValueError:
            logger.error('build id %s not valid', build_id)
            continue

        # presto doesn't specify timezone information (but it's really utc)
        window_start = datetime.datetime.fromtimestamp(
            window_start.timestamp(), tz=tzutc())
        if buildstamp < window_start - channel.update_interval:
            continue
        datum_objs.append(Datum(
            series=series,
            timestamp=window_start,
            value=measure_count,
            usage_hours=usage_hours,
            client_count=client_count))
    Datum.objects.bulk_create(datum_objs)

    # update the measure summary in our cache
    cache.set(get_measure_summary_cache_key(platform_name, channel_name, measure_name),
              get_measure_summary(platform_name, channel_name, measure_name),
              MEASURE_SUMMARY_CACHE_EXPIRY)
