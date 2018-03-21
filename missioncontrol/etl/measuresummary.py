import datetime
import statistics

from distutils.version import LooseVersion
from django.db.models import (Max, Min)
from pkg_resources import parse_version

from missioncontrol.base.models import Datum
from missioncontrol.settings import MEASURE_SUMMARY_VERSION_INTERVAL
from .versions import get_current_firefox_version


def get_measure_summary_cache_key(platform_name, channel_name, measure_name):
    return ':'.join(
        [s.lower() for s in [platform_name, channel_name, measure_name,
                             'summary']])


def _get_data_interval_for_version(platform_name, channel_name, measure_name,
                                   version, start, end):
    datums = Datum.objects.filter(
        series__measure__name=measure_name,
        series__build__channel__name=channel_name,
        series__build__platform__name=platform_name,
        series__build__version__startswith=version)
    return list(
        datums.filter(
            timestamp__range=(start, end)
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

    current_version = get_current_firefox_version(channel_name)

    # if we are on esr, we will look up to 7 versions back
    # all other channels, just 2
    if channel_name == 'esr':
        min_version = LooseVersion(current_version).version[0] - 7
    else:
        min_version = LooseVersion(current_version).version[0] - MEASURE_SUMMARY_VERSION_INTERVAL

    raw_version_data = sorted(
        datums.filter(
            series__build__version__gte=min_version,
            series__build__version__lte=current_version
        ).values_list('series__build__version').distinct().annotate(
            Min('timestamp'), Max('timestamp')
        ), key=lambda d: parse_version(d[0]))
    if not raw_version_data:
        return {
            "versions": [],
            "lastUpdated": None
        }

    # group versions by major version -- we'll aggregate
    grouped_versions = {}
    for (version, min_timestamp, max_timestamp) in raw_version_data:
        major_version = LooseVersion(version).version[0]
        if not grouped_versions.get(major_version):
            grouped_versions[major_version] = []
        grouped_versions[major_version].append(
            (version, min_timestamp, max_timestamp))
    versions = []

    for major_version in sorted(grouped_versions.keys()):
        subversions = sorted(grouped_versions[major_version], key=lambda d: parse_version(d[0]))
        versions.append((str(major_version), subversions[0][1], subversions[-1][2]))

    latest_version_interval = versions[-1][2] - versions[-1][1]

    # we tack the latest version on at the end just to give people an idea of
    # what's happening with the latest point release / beta
    versions.append(raw_version_data[-1])  # always include the latest full version in our list

    # this somewhat confusing bit of code tries to determine the end of each major
    # version programatically by looking at when the next one started (we take the
    # latest major version and the latest version at face value -- i.e. what we
    # see in the data)
    version_summaries = []
    for (version, next_version) in zip(versions, versions[1:-1] + [None, None]):
        version_start = version[1]

        if next_version is not None:
            version_end = next_version[1]
        else:
            version_end = version[2]

        field_duration = version_end - version_start

        # if we can, ignore the first 24 hours as it tends to be very noisy
        # (we only want to do this if the latest version has been out for more than 24 hours)
        if (latest_version_interval > datetime.timedelta(days=1) and
            field_duration > datetime.timedelta(days=2)):
            version_start = version[1] + datetime.timedelta(days=1)

        if version_start >= version_end:
            # this version was either super-short lived or we have truncated
            # data set for it, in either case we shouldn't pretend that we can
            # provide a valid summary of it
            continue
        else:
            version_data = {
                'version': version[0],
                'fieldDuration': int(field_duration.total_seconds())
            }
            for (mean_id, interval) in (('mean', version_end - version_start),
                                        ('adjustedMean', latest_version_interval)):

                values = _get_data_interval_for_version(platform_name,
                                                        channel_name,
                                                        measure_name,
                                                        version[0],
                                                        version_start,
                                                        version_start + interval)
                normalized_values = [v[0]/(v[1]/1000.0) for v in values]
                if len(normalized_values) > 1:
                    version_data[mean_id] = round(statistics.mean(normalized_values), 2)
                else:
                    version_data[mean_id] = round(normalized_values[0], 2)
            version_summaries.append(version_data)

    return {
        "versions": list(reversed(version_summaries)),
        "lastUpdated": datums.aggregate(Max('timestamp'))['timestamp__max']
    }
