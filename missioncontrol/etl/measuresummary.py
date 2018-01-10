import statistics

from django.db.models import (Max, Min)

from missioncontrol.base.models import Datum
from missioncontrol.settings import (MEASURE_SUMMARY_VERSION_INTERVAL,
                                     MEASURE_SUMMARY_SAMPLING_INTERVAL)


def _get_summary_dict(values, version=None):
    if not values:
        return {
            "version": version,
            "mean": None,
            "usageHours": 0
        }

    normalized_values = [v[0]/(v[1]/1000.0) for v in values]
    return {
        "version": version,
        "median": round(statistics.median(normalized_values), 3),
        "stdev": round(statistics.stdev(normalized_values), 3),
        "usageHours": sum([v[1] for v in values])
    }


def _get_data_interval_for_version(platform_name, channel_name, measure_name,
                                   version, timestamp_offset, interval):
    datums = Datum.objects.filter(
        series__measure__name=measure_name,
        series__build__channel__name=channel_name,
        series__build__platform__name=platform_name,
        series__build__version=version)
    return list(
        datums.filter(
            timestamp__range=(timestamp_offset - interval, timestamp_offset)
        ).values_list('value', 'usage_hours')
    )


def get_measure_summary(platform_name, channel_name, measure_name):
    '''
    Returns a data structure summarizing the "current" status of a measure

    A dictionary with a summary of the current median result over the last
    24 hours, compared to previous versions.
    '''
    datums = Datum.objects.filter(
        series__measure__name=measure_name,
        series__build__channel__name=channel_name,
        series__build__platform__name=platform_name)

    version_data = datums.values_list(
            'series__build__version').distinct().order_by(
                '-series__build__version').annotate(Min('timestamp'), Max('timestamp'))
    if not version_data:
        return {
            "latest": _get_summary_dict([]),
            "previous": _get_summary_dict([]),
            "lastUpdated": None
        }

    latest_version = version_data[0][0]
    latest_values = _get_data_interval_for_version(
        platform_name,
        channel_name,
        measure_name,
        latest_version,
        version_data[0][2],
        MEASURE_SUMMARY_SAMPLING_INTERVAL)

    start_offset = version_data[0][2] - version_data[0][1]
    previous_values = []
    for (version, start_timestamp, _) in version_data[1:1+MEASURE_SUMMARY_VERSION_INTERVAL]:
        previous_values.extend(_get_data_interval_for_version(
            platform_name,
            channel_name,
            measure_name,
            version,
            start_timestamp + start_offset,
            MEASURE_SUMMARY_SAMPLING_INTERVAL))

    # set the last updated field
    if latest_values or previous_values:
        last_updated = datums.aggregate(Max('timestamp'))['timestamp__max']
    else:
        last_updated = None

    return {
        "latest": _get_summary_dict(latest_values, latest_version),
        "previous": _get_summary_dict(previous_values),
        "lastUpdated": last_updated
    }
