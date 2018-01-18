import datetime
import logging
from dateutil.tz import tzutc

from django.db.models import Max
from django.utils import timezone

from missioncontrol.base.models import (Build,
                                        Datum,
                                        Experiment,
                                        ExperimentBranch,
                                        Measure,
                                        Series)
from missioncontrol.celery import celery
from missioncontrol.settings import (DATA_EXPIRY_INTERVAL,
                                     PRESTO_EXPERIMENTS_ERROR_AGGREGATES_TABLE)
from .presto import raw_query


logger = logging.getLogger(__name__)


@celery.task
def update_experiment(experiment_name):
    # for now we process all measures which have no platform specified
    measures = Measure.objects.filter(platform=None)
    measure_names = measures.values_list('name', flat=True)
    experiment = Experiment.objects.get(name=experiment_name)

    min_timestamp = timezone.now() - DATA_EXPIRY_INTERVAL
    min_timestamp_in_data = Datum.objects.filter(
        series__build__experiment_branch__experiment__name=experiment_name,
        series__measure__in=measures).aggregate(Max('timestamp'))['timestamp__max']
    if min_timestamp_in_data:
        min_timestamp = max([min_timestamp, min_timestamp_in_data])

    # we prefer to specify parameters in a seperate params dictionary
    # where possible (to reduce the risk of creating a malformed
    # query from incorrect parameters)
    measure_name_query = ', '.join([f'sum({measure_name})' for measure_name
                                    in measure_names])
    query_template = f'''
        select window_start, experiment_branch,
        sum(usage_hours), sum(count) as client_count,
        {measure_name_query}
        from {PRESTO_EXPERIMENTS_ERROR_AGGREGATES_TABLE} where
        experiment_id=%(experiment_name)s and
        window_start > timestamp %(min_timestamp)s
        group by (window_start, experiment_branch)'''.replace('\n', '').strip()
    params = {
        'experiment_name': experiment_name,
        'min_timestamp': min_timestamp.strftime("%Y-%m-%d %H:%M:%S")
    }
    logger.info('Querying: %s', query_template % params)

    series_cache = {}
    datum_objs = []
    for (window_start, experiment_branch_name, usage_hours, client_count,
         *measure_counts) in raw_query(query_template, params):
        # skip datapoints with no usage hours
        if not usage_hours:
            continue
        for (measure_name, measure_count) in zip(measure_names, measure_counts):
            series = series_cache.get((experiment_branch_name, measure_name))
            if not series:
                experiment_branch, _ = ExperimentBranch.objects.get_or_create(
                    experiment=experiment, name=experiment_branch_name)
                build, _ = Build.objects.get_or_create(
                    platform=None, channel=None, build_id=None, version=None,
                    experiment_branch=experiment_branch)
                measure = Measure.objects.get(platform=None, name=measure_name)
                series, _ = Series.objects.get_or_create(build=build,
                                                         measure=measure)
                series_cache[(experiment_branch_name, measure_name)] = series

            # presto doesn't specify timezone information (but it's really utc)
            window_start = datetime.datetime.fromtimestamp(
                window_start.timestamp(), tz=tzutc())
            datum_objs.append(Datum(
                series=series,
                timestamp=window_start,
                value=measure_count or 0,
                usage_hours=usage_hours,
                client_count=client_count))
    Datum.objects.bulk_create(datum_objs)
