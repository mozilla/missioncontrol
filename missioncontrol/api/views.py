import datetime
import logging
import pytz

from django.http import (HttpResponseBadRequest, HttpResponseNotFound, JsonResponse)
from django.core.cache import cache
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


def measure(request):
    channel_name = request.GET.get('channel')
    platform_name = request.GET.get('platform')
    measure_name = request.GET.get('measure')
    interval = request.GET.get('interval')
    start = request.GET.get('start')

    if not all([channel_name, platform_name, measure_name, interval]):
        return HttpResponseBadRequest("All of channel, platform, measure, interval required")

    datums = Datum.objects.filter(
        series__build__channel__name=channel_name,
        series__build__platform__name=platform_name,
        series__measure__name=measure_name)

    if not datums.exists():
        return HttpResponseNotFound("Data not available for this measure combination")

    # process min/max time based on parameters
    try:
        if start is not None:
            min_time = datetime.datetime.fromtimestamp(int(start), tz=pytz.UTC)
            datums = datums.filter(
                timestamp__range=(min_time,
                                  min_time + datetime.timedelta(seconds=int(interval))))
        else:
            datums = datums.filter(
                timestamp__gte=(timezone.now() -
                                datetime.timedelta(seconds=int(interval))))
    except ValueError:
        raise HttpResponseBadRequest(
            "Interval / start time must be specified in seconds (as an integer)")

    data = {}
    for (build_id, version) in datums.values_list(
            'series__build__build_id',
            'series__build__version').distinct():
        data[build_id] = {
            'data': [],
            'version': version
        }
    for (build_id, timestamp, value, usage_hours) in datums.values_list(
            'series__build__build_id',
            'timestamp', 'value', 'usage_hours').order_by('timestamp'):
        data[build_id]['data'].append((timestamp, value, usage_hours))

    return JsonResponse(data={'measure_data': data})
