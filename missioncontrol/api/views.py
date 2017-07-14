import requests
from django.http import JsonResponse
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.core.validators import validate_slug

from .presto import (QueryBuilder, DIMENSION_LIST, raw_query)
from missioncontrol.settings import FIREFOX_VERSION_URL


def _get_firefox_versions():
    firefox_versions = cache.get('firefox_versions')
    if firefox_versions:
        return firefox_versions

    r = requests.get(FIREFOX_VERSION_URL)
    firefox_versions = r.json()
    cache.set('firefox_versions', firefox_versions)
    return firefox_versions


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


# simple function to validate request input parameters to ensure sanity
def _validate_list_params(request, param_name, minimum=0):
    params = request.GET.getlist(param_name)
    if len(params) < minimum:
        raise ValidationError('Must supply at least {} {}'.format(minimum,
                              param_name))
    for param in params:
        validate_slug(param)
    return params


def measures_with_interval(request):
    url_path = request.GET.urlencode()

    cached_data = cache.get('measures_with_interval:%s' % url_path)
    if cached_data is not None:
        return JsonResponse(data=cached_data)

    interval = int(request.GET.get('interval', 86400))
    dimensions = _validate_list_params(request, 'dimensions')
    measures = _validate_list_params(request, 'measures', minimum=1)
    os_names = _validate_list_params(request, 'os_names', minimum=1)
    channels = _validate_list_params(request, 'channels', minimum=1)

    columns = [('window_start', 'time'),
               ('channel', 'channel'),
               ('os_name', 'os_name')] + [(dimension, dimension) for
                                          dimension in dimensions]
    raw_sql = '''
        select {}
        from error_aggregates where application=\'Firefox\' and
        ({}) and
        ({}) and
        window_start > current_timestamp - (1 * interval \'{}\' second)
        group by {}
        '''.format(','.join(['{} as {}'.format(*column_tuple) for column_tuple
                             in columns] +
                            ['sum({}) as {}'.format(*([measure] * 2)) for measure
                             in measures]),
                   ' or '.join(['os_name=\'{}\''.format(os_name) for os_name
                                in os_names]),
                   ' or '.join(['channel=\'{}\''.format(channel) for channel
                                in channels]),
                   interval,
                   ','.join([ct[0] for ct in columns])).replace('\n', '')
    rows = [list(row) for row in raw_query(raw_sql)]
    response = {
        'sql': raw_sql,
        'columns': [ct[1] for ct in columns] + measures,
        'rows': rows
    }
    cache.set('measures_with_interval:%s' % url_path, response)

    return JsonResponse(data=response)


def versions(request):
    return JsonResponse(data=_get_firefox_versions())
