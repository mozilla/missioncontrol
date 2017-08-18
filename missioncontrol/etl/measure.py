import datetime
import logging
from distutils.version import LooseVersion

from django.core.cache import cache

from missioncontrol.celery import celery
from missioncontrol.settings import DATA_EXPIRY_INTERVAL
from .presto import raw_query
from .schema import (CHANNELS, TELEMETRY_PLATFORM_MAPPING, get_measure_cache_key)
from .versions import get_firefox_versions

logger = logging.getLogger(__name__)


@celery.task
def update_measure(platform_name, channel_name, measure_name):
    '''
    Updates (or creates) a local cache entry for a specify platform/channel/measure
    aggregate, which can later be retrieved by the API

    The data is stored in the following format:
    {
        'buildid': {
          'version': 'XXX',
          'data': [[<timestamp>, value, usage hours], [<timestamp>, value, usage hours], ...]
        },
        'buildid2': {
          ...
        },
     ...
    }

    Every channel has a different minimum build_id/timestamp,
    defined in the settings. For any given point later than the
    minimum timestamp we may reject it because it's too old.
    '''
    logger.info('Updating measure: %s %s %s', channel_name, platform_name,
                measure_name)
    channel = CHANNELS[channel_name]
    cache_key = get_measure_cache_key(platform_name, channel_name, measure_name)

    min_timestamp = datetime.datetime.utcnow() - DATA_EXPIRY_INTERVAL
    min_buildid_timestamp = min_timestamp - channel['update_interval']
    data = cache.get(cache_key, {})
    if data:
        min_timestamp = max([min_timestamp] +
                            [existing_build_data['data'][-1][0]
                             for existing_build_data in data.values()])

    # also place a restriction on version (to avoid fetching data
    # for bogus versions)
    versions = get_firefox_versions()
    current_version = versions[channel_name]
    if channel == 'esr':
        min_version = str(LooseVersion(versions[channel_name]).version[0] - 7)
    else:
        min_version = str(LooseVersion(versions[channel_name]).version[0] - 1)

    query_template = '''
        select window_start, build_id, version, sum({}), sum(usage_hours)
        from error_aggregates where
        application=\'Firefox\' and
        version >= %(min_version)s and version <= %(current_version)s and
        build_id > %(min_build_id)s and
        os_name=%(os_name)s and
        channel=%(channel_name)s and
        window_start > timestamp %(min_timestamp)s
        group by (window_start, build_id, version)'''.format(measure_name).replace('\n', '').strip()
    params = {
        'min_version': min_version,
        'current_version': current_version,
        'min_build_id': min_buildid_timestamp.strftime('%Y%m%d'),
        'os_name': TELEMETRY_PLATFORM_MAPPING[platform_name],
        'channel_name': channel_name,
        'min_timestamp': min_timestamp.strftime("%Y-%m-%d %H:%M:%S")
    }
    logger.info('Querying: %s', query_template % params)

    for (window_start, build_id, version, measure_count, usage_hours) in raw_query(query_template,
                                                                                   params):
        # skip datapoints with no measures / usage hours
        if not measure_count or not usage_hours:
            continue

        try:
            buildstamp = datetime.datetime.strptime(build_id, '%Y%m%d%H%M%S')
        except:
            logger.error('build id %s not valid', build_id)
            continue
        if buildstamp < window_start - channel['update_interval']:
            continue
        if not data.get(build_id):
            data[build_id] = {'version': version, 'data': []}
        data[build_id]['data'].append((window_start, measure_count, usage_hours))

    # (re)sort all data, so we can safely get the "most recent timestamp" from
    # the last element (keeping things sorted on the server-side also makes
    # things a bit easier on the client side)
    for build_data in data.values():
        build_data['data'].sort(key=lambda d: d[0])

    cache.set(cache_key, data, None)
