import datetime
import logging

import newrelic.agent
from django.db.models import Max
from django.utils import timezone
from dateutil.tz import tzutc

from missioncontrol.base.models import (Datum,
                                        Experiment,
                                        ExperimentBranch,
                                        Measure)
from missioncontrol.celery import celery
from missioncontrol.settings import (DATA_EXPIRY_INTERVAL,
                                     PRESTO_EXPERIMENTS_ERROR_AGGREGATES_TABLE)
from .presto import raw_query


logger = logging.getLogger(__name__)


@celery.task
def update_experiment(experiment_name):
    logger.info('Updating experiment: %s', experiment_name)
    newrelic.agent.add_custom_parameter("experiment", experiment_name)

    # for now we process all measures which have no platform specified
    measures = Measure.objects.filter(platform=None)
    measure_names = measures.values_list('name', flat=True)
    experiment = Experiment.objects.get(name=experiment_name)

    min_timestamp = timezone.now() - DATA_EXPIRY_INTERVAL
    min_timestamp_in_data = Datum.objects.filter(
        experiment_branch__experiment=experiment,
        measure__in=measures).aggregate(Max('timestamp'))['timestamp__max']
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
        window_start > timestamp %(min_timestamp)s and
        submission_date_s3 >= %(min_submission_date)s
        group by (window_start, experiment_branch)'''.replace('\n', '').strip()
    params = {
        'experiment_name': experiment_name,
        'min_timestamp': min_timestamp.strftime("%Y-%m-%d %H:%M:%S"),
        'min_submission_date': min_timestamp.strftime("%Y%m%d")
    }
    logger.info('Querying: %s', query_template % params)
    newrelic.agent.add_custom_parameter("query", query_template % params)

    experiment_cache = {}
    datum_objs = []
    for (window_start, experiment_branch_name, usage_hours, client_count,
         *measure_counts) in raw_query(query_template, params):
        # skip datapoints with no usage hours
        if usage_hours <= 0:
            continue
        for (measure_name, measure_count) in zip(measure_names, measure_counts):
            # skip any negative measure counts
            # (in theory negative measures should be rejected at the ping
            # validation level, but this is not yet the case at the time of this
            # writing -- https://bugzilla.mozilla.org/show_bug.cgi?id=1447038)
            if measure_count is None or measure_count < 0:
                continue
            experiment_branch_tuple = experiment_cache.get(
                (experiment_branch_name, measure_name))
            if not experiment_branch_tuple:
                experiment_branch, _ = ExperimentBranch.objects.get_or_create(
                    experiment=experiment, name=experiment_branch_name)
                measure = Measure.objects.get(platform=None, name=measure_name)
                experiment_cache[(experiment_branch_name, measure_name)] = (experiment_branch,
                                                                            measure)
            else:
                (experiment_branch, measure) = experiment_branch_tuple
            # presto doesn't specify timezone information (but it's really utc)
            window_start = datetime.datetime.fromtimestamp(
                window_start.timestamp(), tz=tzutc())
            datum_objs.append(Datum(
                experiment_branch=experiment_branch,
                measure=measure,
                timestamp=window_start,
                value=measure_count or 0,
                usage_hours=usage_hours,
                client_count=client_count))
    Datum.objects.bulk_create(datum_objs)
