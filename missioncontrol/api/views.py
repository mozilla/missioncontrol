from django.http import JsonResponse
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.core.validators import validate_slug

from .presto import (QueryBuilder, DIMENSION_LIST, raw_query)


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
def _validate_list_params(request, param_name):
    params = request.GET.getlist(param_name)
    if len(params) < 1:
        raise ValidationError('Must supply at least one {}'.format(param_name))
    for param in params:
        validate_slug(param)
    return params


def measures_with_interval(request):
    url_path = request.GET.urlencode()

    cached_data = cache.get('windowed_aggregates:%s' % url_path)
    if cached_data is not None:
        return JsonResponse(data=cached_data)

    interval = int(request.GET.get('interval', 86400))
    measures = _validate_list_params(request, 'measures')
    os_names = _validate_list_params(request, 'os_names')
    channels = _validate_list_params(request, 'channels')

    default_columns = [('window.start', 'time'),
                       ('channel', 'channel'),
                       ('os_name', 'os_name'),
                       ('version', 'version')]
    raw_sql = '''
        select {}
        from error_aggregates where application=\'Firefox\' and
        ({}) and
        ({}) and
        window.start > current_timestamp - (1 * interval \'{}\' second)
        group by {}
        '''.format(','.join(['{} as {}'.format(*column_tuple) for column_tuple
                             in default_columns] +
                            ['sum({}) as {}'.format(*([measure] * 2)) for measure
                             in measures]),
                   ' or '.join(['os_name=\'{}\''.format(os_name) for os_name
                                in os_names]),
                   ' or '.join(['channel=\'{}\''.format(channel) for channel
                                in channels]),
                   interval,
                   ','.join([ct[0] for ct in default_columns])).replace('\n', '')
    rows = [list(row) for row in raw_query(raw_sql)]
    response = {
        'sql': raw_sql,
        'columns': [ct[1] for ct in default_columns] + measures,
        'rows': rows
    }
    cache.set('windowed_aggregates:%s' % url_path, response)

    return JsonResponse(data=response)
