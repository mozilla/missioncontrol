import datetime
import logging
import pytz

from django.core.cache import cache
from django.db.models import (Max, Min)
from django.http import (HttpResponseBadRequest, HttpResponseNotFound, JsonResponse)
from django.utils import timezone

from missioncontrol.base.models import (Channel,
                                        Datum,
                                        Measure,
                                        Platform)
from missioncontrol.etl.date import datetime_to_utc
from missioncontrol.etl.presto import (QueryBuilder, DIMENSION_LIST)
from missioncontrol.etl.schema import get_measure_summary_cache_key

logger = logging.getLogger(__name__)


def aggregates(request):
    url_path = request.GET.urlencode()
    results = cache.get('aggregates:%s' % url_path)

    if results is None:
        measurements = request.GET.getlist('measurements')
        dimensions = request.GET.getlist('dimensions')
        conditions = {}
        for dimension in DIMENSION_LIST:
            if dimension in request.GET:
                conditions[dimension] = request.GET.getlist(dimension)
        query_builder = QueryBuilder(measurements, conditions, dimensions)
        results = [dict(row) for row in query_builder.execute().fetchall()]
        cache.set('aggregates:%s' % url_path, results)

    return JsonResponse(data=dict(results=results))


def channel_platform_summary(request):
    platform_filter = [platform.lower() for platform in request.GET.getlist('platform')]
    channel_filter = [channel.lower() for channel in request.GET.getlist('channel')]

    platforms = Platform.objects.all()
    if platform_filter:
        platforms = platforms.filter(name__in=platform_filter)

    channels = Channel.objects.all()
    if channel_filter:
        channels = channels.filter(name__in=channel_filter)

    summaries = []
    for channel in channels:
        for platform in platforms:
            measures = []
            measure_name_map = {
                get_measure_summary_cache_key(platform.name, channel.name,
                                              measure_name): measure_name
                for measure_name in Measure.objects.filter(
                        platform=platform).values_list('name', flat=True)
            }
            measure_summaries = cache.get_many(measure_name_map.keys())
            for (measure_summary_cache_key, measure_summary) in measure_summaries.items():
                measures.append({
                    'name': measure_name_map[measure_summary_cache_key],
                    **measure_summary,
                    'lastUpdated': (datetime_to_utc(measure_summary['lastUpdated'])
                                    if measure_summary.get('lastUpdated') else None)
                })
            summaries.append({
                'channel': channel.name,
                'platform': platform.name,
                'measures': measures
            })
    return JsonResponse(data={'summaries': summaries})


def _filter_datums_to_time_interval(datums, start, interval,
                                    offset=datetime.timedelta()):
    if start is not None:
        min_time = datetime.datetime.fromtimestamp(int(start), tz=pytz.UTC)
        return datums.filter(
            timestamp__range=(
                min_time + offset,
                min_time + offset + datetime.timedelta(seconds=int(interval))))
    else:
        return datums.filter(
            timestamp__range=(timezone.now() + offset -
                              datetime.timedelta(seconds=int(interval)),
                              timezone.now() + offset)
        )


def measure(request):
    channel_name = request.GET.get('channel')
    platform_name = request.GET.get('platform')
    measure_name = request.GET.get('measure')
    interval = request.GET.get('interval')
    start = request.GET.get('start')
    relative = request.GET.get('relative')

    if not all([channel_name, platform_name, measure_name, interval]):
        return HttpResponseBadRequest("All of channel, platform, measure, interval required")
    if not all([val is None or val.isdigit() for val in (start, interval)]):
        raise HttpResponseBadRequest(
            "Interval / start time must be specified in seconds (as an integer)")

    datums = Datum.objects.filter(
        series__build__channel__name=channel_name,
        series__build__platform__name=platform_name,
        series__measure__name=measure_name)

    if not datums.exists():
        return HttpResponseNotFound("Data not available for this measure combination")

    ret = {}

    if relative is None or (relative.isdigit() and not int(relative)):
        # default is to get latest data for all series
        datums = _filter_datums_to_time_interval(datums, start, interval)

        for (build_id, version) in datums.values_list(
                'series__build__build_id',
                'series__build__version').distinct():
            ret[build_id] = {
                'data': [],
                'version': version
            }
        for (build_id, timestamp, value, usage_hours) in datums.values_list(
                'series__build__build_id',
                'timestamp', 'value', 'usage_hours').order_by('timestamp'):
            ret[build_id]['data'].append((timestamp, value, usage_hours))
    else:
        latest = datums.aggregate(
            Max('series__build__version'),
            Max('series__build__build_id'))
        (latest_version, latest_build_id) = [latest.get(x) for x in [
            'series__build__version__max', 'series__build__build_id__max']]

        # get data for current + up to three previous versions (handling each
        # build id for each version, if there are multiple)
        versions = datums.values_list(
            'series__build__version').distinct().order_by(
                '-series__build__version')[0:4]
        version_timestamps = {
            (d[0], d[1]): d[2] for d in datums.filter(
                series__build__version__in=versions).values_list(
                    'series__build__version', 'series__build__build_id').distinct().annotate(
                        Min('timestamp'))
        }

        # for each version/buildid combo, grab their data relative to the
        # latest version
        for (version_tuple, base_timestamp) in version_timestamps.items():
            (version, build_id) = version_tuple
            ret[build_id] = {
                'version': version,
                'data': []
            }
            ret[build_id]['data'] = [
                [int((timestamp - base_timestamp).total_seconds()), value, usage_hours] for
                (timestamp, value, usage_hours) in datums.filter(
                    series__build__version=version,
                    series__build__build_id=build_id,
                    timestamp__range=(base_timestamp,
                                      base_timestamp + datetime.timedelta(seconds=int(interval)))
                ).order_by('timestamp').values_list('timestamp', 'value', 'usage_hours')]

    return JsonResponse(data={'measure_data': ret})
