import datetime
import logging

from dateutil.tz import tzutc
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
    start = request.GET.get('start')

    if not all([channel_name, platform_name, measure_name, interval]):
        return HttpResponseBadRequest("All of channel, platform, measure, interval required")
    data = cache.get(get_measure_cache_key(platform_name, channel_name, measure_name))
    if not data:
        return HttpResponseNotFound("Data not available for this measure combination")

    # process min/max time based on parameters
    try:
        if start is not None:
            min_time = datetime.datetime.fromtimestamp(int(start))
            max_time = min_time + datetime.timedelta(seconds=int(interval))
        else:
            (min_time, max_time) = (datetime.datetime.now() -
                                    datetime.timedelta(seconds=int(interval)),
                                    None)
    except ValueError:
        raise HttpResponseBadRequest(
            "Interval / start time must be specified in seconds (as an integer)")

    empty_buildids = set()
    for (build_id, build_data) in data.items():
        datums = build_data['data']
        # filter out elements that don't match our date range
        if min_time:
            datums = filter(lambda d: d[0] >= min_time, datums)
        if max_time:
            datums = filter(lambda d: d[0] <= max_time, datums)
        # add utc timezone info to each date, so django will serialize a
        # 'Z' to the end of the string (and so javascript's date constructor
        # will know it's utc)
        datums = list(map(lambda d: [datetime.datetime.fromtimestamp(d[0].timestamp(),
                                                                     tz=tzutc())] +
                          list(d[1:]), datums))
        if not datums:
            empty_buildids.add(build_id)
        build_data['data'] = datums

    # don't bother returning empty indexed data
    for empty_buildid in empty_buildids:
        del data[empty_buildid]

    return JsonResponse(data={'measure_data': data})
