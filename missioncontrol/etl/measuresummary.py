import statistics

from django.db.models import Max
from django.utils import timezone

from missioncontrol.base.models import Datum
from missioncontrol.settings import DATA_EXPIRY_INTERVAL
from .versions import get_current_firefox_version


def _get_summary_dict(values, version=None):
    return {
        "version": version,
        "median": statistics.median([v[0]/(v[1]/1000.0) for v in values]) if values else None,
        "usageHours": sum([v[1] for v in values]) if values else 0
    }


def get_measure_summary(platform_name, channel_name, measure_name):
    min_timestamp = timezone.now() - DATA_EXPIRY_INTERVAL
    current_version = get_current_firefox_version(channel_name)

    datums = Datum.objects.filter(series__measure__name=measure_name,
                                  series__build__channel__name=channel_name,
                                  series__build__platform__name=platform_name,
                                  timestamp__gt=min_timestamp)
    if not datums.exists():
        return {
            "latest": _get_summary_dict([], current_version),
            "previous": _get_summary_dict([]),
            "lastUpdated": None
        }

    latest_values = datums.filter(
        series__build__version=current_version).values_list(
            'value', 'usage_hours')
    previous_values = datums.exclude(
        series__build__version=current_version).values_list(
            'value', 'usage_hours')

    # set the last updated field
    if latest_values or previous_values:
        last_updated = datums.aggregate(Max('timestamp'))['timestamp__max']
    else:
        last_updated = None

    return {
        "latest": _get_summary_dict(latest_values, current_version),
        "previous": _get_summary_dict(previous_values),
        "lastUpdated": last_updated
    }
