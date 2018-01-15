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
from missioncontrol.etl.measuresummary import get_measure_summary_cache_key
from missioncontrol.etl.presto import (QueryBuilder, DIMENSION_LIST)

logger = logging.getLogger(__name__)


def aggregates(request):
    '''
    Returns a set of aggregates for a specific set of dimensions

    This method is unused in the frontend currently and may be removed
    soon. It is also quite slow. Using it is not recommended.
    '''
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
    '''
    Lists measures available for specified channel/platform combinations

    Query parameters:

    * `platform` (optional): Limit response to those combinations with
      this specific platform (e.g. `windows`)
    * `channel` (optional): Limit response to those combinations with
      this specific channel (e.g. `channel`)

    Example output:

    ```
    {
        "summaries": [
            {
                "channel": "release",
                "platform": "windows"
                "measures": [
                    {
                        "name": "content_crashes",
                        "lastUpdated": "2018-01-15T18:15:00Z",
                        "latest": {
                            "median": 35.565,
                            "stdev": 7.669,
                            "usageHours": 470699362.23159295,
                            "version": "57.0.4"
                        },
                        "previous": {
                            "median": 24.62,
                            "stdev": 11.579,
                            "usageHours": 1072071172.0898802,
                            "version": null
                        }
                    },

                ...
                ]
            },

            ...
        ]
    }
    '''
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
    '''
    Gets data specific to a channel/platform/measure combination

    Query parameters:

    * `channel` (required): Channel for measure (e.g. `release`)
    * `platform` (required): Platform for measure (e.g. `release`)
    * `measure` (required): Name for measure (e.g. `main_crashes`)
    * `interval` (required): Interval of data to gather, in seconds
    * `start` (optional): Starting point to gather measure data from. If
      not specified, will return `interval` worth of data, counting back
      from the time of the query. This parameter is ignored if `relative`
      is specified (see below)
    * `relative` (optional): If true (specified and non-zero), return results
      *from* the time of release of the latest version

    Returns a dictionary with one element called `measure_data`, a dictionary
    whose keys are a set of buildids representing unique version, and whose
    values are in turn a dictionary with `data` (a series of date/measure
    value/usage hour tuples representing samples) and `version` (the actual
    version e.g. `57.0.5`). If relative is false, the `date` part of the data
    samples will be the actual date of the sample. If true, it will be the number
    of relative seconds since the release was made.

    Example output (relative=0):

    {
        "measure_data": {
            "20171024165158": {
                "data": [
                    [
                        "2018-01-15T17:25:00Z",
                        80.0,
                        18878.4066443571
                    ],
                    [
                        "2018-01-15T17:30:00Z",
                        58.0,
                        18949.5233110985
                    ],
                    ...
                ],
                "version": "57.0.4"
            },
            ...
        }
    }

    Example output (relative=1):

    {
        "measure_data": {
            "20171024165158": {
                "data": [
                    [
                        0,
                        80.0,
                        18878.4066443571
                    ],
                    [
                        300,
                        58.0,
                        18949.5233110985
                    ],
                    ...
                ],
                "version": "57.0.4"
            },
            ...
        }
    }
    '''
    channel_name = request.GET.get('channel')
    platform_name = request.GET.get('platform')
    measure_name = request.GET.get('measure')
    interval = request.GET.get('interval')
    start = request.GET.get('start')
    relative = request.GET.get('relative')

    if not all([channel_name, platform_name, measure_name, interval]):
        return HttpResponseBadRequest("All of channel, platform, measure, interval required")
    if not all([val is None or val.isdigit() for val in (start, interval)]):
        return HttpResponseBadRequest(
            "Interval / start time must be specified in seconds (as an integer) %s" % interval)

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
        latest_build_id = datums.aggregate(
            Max('series__build__build_id'))['series__build__build_id__max']
        if int(interval) == 0:
            # if interval is 0 for relative, just use the interval of the latest
            # released version
            timestamps_for_latest = datums.filter(
                series__build__build_id=latest_build_id).aggregate(
                    Min('timestamp'), Max('timestamp'))
            interval = (timestamps_for_latest['timestamp__max'] -
                        timestamps_for_latest['timestamp__min']).total_seconds()
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


def experiment(request):
    '''
    Gets data specific to an experiment for a specific measure

    Query parameters:

    * `experiment` (required): Experiment slug to get data for (e.g.
      `pref-flip-activity-stream-58-beta-pocket-personalization-bug-1425490`)
    * `measure` (required): Name for measure (e.g. `main_crashes`)
    * `interval` (required): Interval of data to gather, in seconds
    * `start` (optional): Starting point to gather measure data from. If
      not specified, will return `interval` worth of data, counting back
      from the time of the query.

    The format of the response is much the same as for `measure`, above,
    except the keys of the `measure_data` dictionary are different
    branches of the same experiment (aggregated across all platforms,
    channels, and versions).

    Example output:

    {
        "measure_data": {
            "control": [
                [
                    "2018-01-10T11:50:00Z",
                    1.0,
                    144.65138933179
                ],
                [
                    "2018-01-10T11:55:00Z",
                    2.0,
                    201.722498629009
                ],
                ...
            ],
            "personalized": [
                ...
            ]
        }
    }
    '''
    measure_name = request.GET.get('measure')
    interval = request.GET.get('interval')
    start = request.GET.get('start')
    experiment_name = request.GET.get('experiment')

    if not all([measure_name, experiment_name, interval]):
        return HttpResponseBadRequest("Must specify measure, experiment, interval")
    if not all([val is None or val.isdigit() for val in (start, interval)]):
        raise HttpResponseBadRequest(
            "Interval / start time must be specified in seconds (as an integer)")

    datums = Datum.objects.filter(
        series__measure__name=measure_name,
        series__build__channel=None,
        series__build__platform=None,
        series__build__build_id=None,
        series__build__version=None,
        series__build__experiment_branch__experiment__name=experiment_name)

    if not datums.exists():
        return HttpResponseNotFound("No data available for this experiment")

    ret = {}

    datums = _filter_datums_to_time_interval(datums, start, interval)
    for (experiment_branch, timestamp, value, usage_hours) in datums.values_list(
            'series__build__experiment_branch__name',
            'timestamp', 'value', 'usage_hours').order_by('timestamp'):
        if not ret.get(experiment_branch):
            ret[experiment_branch] = []
        ret[experiment_branch].append((timestamp, value, usage_hours))

    return JsonResponse(data={'measure_data': ret})
