import datetime
import logging
from django.http import (HttpResponseBadRequest, HttpResponseNotFound, JsonResponse)
from django.core.cache import cache

from missioncontrol.etl.presto import (QueryBuilder, DIMENSION_LIST)
from missioncontrol.etl.schema import (CHANNELS, PLATFORMS, get_measure_cache_key)

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

    summaries = []
    for channel_name in filter(lambda c: not channel_filter or c in channel_filter,
                               CHANNELS.keys()):
        for (platform_name, platform) in PLATFORMS.items():
            if not platform_filter or platform_name in platform_filter:
                summaries.append({
                    'channel': channel_name,
                    'platform': platform_name,
                    'measures': platform['measures']
                })

    return JsonResponse(data={'summaries': summaries})


def measure(request):
    channel_name = request.GET.get('channel')
    platform_name = request.GET.get('platform')
    measure_name = request.GET.get('measure')
    interval = request.GET.get('interval')
    if not all([channel_name, platform_name, measure_name]):
        return HttpResponseBadRequest("All of channel, platform, measure required")
    data = cache.get(get_measure_cache_key(platform_name, channel_name, measure_name))
    if not data:
        return HttpResponseNotFound("Data not available for this measure combination")
    if interval:
        try:
            min_time = datetime.datetime.now() - datetime.timedelta(seconds=int(interval))
        except ValueError:
            return HttpResponseBadRequest("Interval must be specified in seconds (as an integer)")

        # Return any build data in the interval
        empty_buildids = set()
        for (build_id, build_data) in data.items():
            build_data['data'] = [d for d in build_data['data'] if d[0] > min_time]
            if not build_data['data']:
                empty_buildids.add(build_id)

        # don't bother returning empty indexed data
        for empty_buildid in empty_buildids:
            del data[empty_buildid]

    return JsonResponse(data={'measure_data': data})
