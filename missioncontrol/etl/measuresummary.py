import datetime
import math

from django.db.models import (Max, Min)
from pkg_resources import parse_version

from missioncontrol.base.models import Datum
from missioncontrol.settings import MEASURE_SUMMARY_VERSION_INTERVAL
from .versions import (get_current_firefox_version,
                       get_major_version)


def get_measure_summary_cache_key(application_name, platform_name,
                                  channel_name, measure_name):
    return ':'.join(
        [s.lower() for s in [application_name, platform_name, channel_name,
                             measure_name, 'summary']])


# returns a list of (rate, value, usage_hours) tuples in the interval for that
# version
def _get_data_interval_for_version(application_name, platform_name,
                                   channel_name, measure_name, version, start,
                                   end):
    datums = Datum.objects.filter(
        measure__name=measure_name,
        build__application__name=application_name,
        build__channel__name=channel_name,
        build__platform__name=platform_name,
        build__version__startswith=version)
    value_usage_hours = list(
        datums.filter(
            timestamp__range=(start, end)
        ).values_list('value', 'usage_hours')
    )
    return sorted([(value/(usage_hours*1000.0), value, usage_hours) for
                   (value, usage_hours) in value_usage_hours])


def get_measure_summary(application_name, platform_name, channel_name, measure_name):
    '''
    Returns a data structure summarizing the "current" status of a measure

    A dictionary with a summary of the current median result over the last
    24 hours, compared to previous versions.
    '''
    datums = Datum.objects.filter(
        measure__name=measure_name,
        build__application__name=application_name,
        build__channel__name=channel_name,
        build__platform__name=platform_name)

    current_version = get_current_firefox_version(channel_name)
    current_major_version = get_major_version(current_version)

    # if we are on esr, we will look up to 7 versions back
    # all other channels, just 2
    if channel_name == 'esr':
        min_version = current_major_version - 7
    else:
        min_version = current_major_version - MEASURE_SUMMARY_VERSION_INTERVAL

    raw_version_data = sorted(
        datums.filter(
            build__version__gte=min_version,
            build__version__lt=str(current_major_version + 1)
        ).values_list('build__version').distinct().annotate(
            Min('timestamp'), Max('timestamp')
        ), key=lambda d: parse_version(d[0]))
    if not raw_version_data:
        return None

    # group versions by major version -- we'll aggregate
    grouped_versions = {}
    for (version, min_timestamp, max_timestamp) in raw_version_data:
        major_version = get_major_version(version)
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
            for (rate_id, count_id, interval) in (
                    ('rate', 'count', version_end - version_start),
                    ('adjustedRate', 'adjustedCount', latest_version_interval)
            ):
                values = _get_data_interval_for_version(application_name,
                                                        platform_name,
                                                        channel_name,
                                                        measure_name,
                                                        version[0],
                                                        version_start,
                                                        version_start + interval)
                if not values:
                    # in rare cases (mostly during backfilling) we might not
                    # have any actual data for the version in question in the
                    # interval we want
                    continue
                raw_count = int(sum([v[1] for v in values]))
                version_data[count_id] = raw_count

                # to prevent outliers from impacting our rate calculation, we'll use
                # the 99th percentile of captured values
                end = math.ceil(len(values) * 0.99)
                rate_values = values[:end]
                version_data[rate_id] = round(
                    sum([v[1] for v in rate_values]) /
                    sum([v[2]/1000.0 for v in rate_values]), 2)

            version_summaries.append(version_data)

    if not version_summaries:
        return None

    return {
        "versions": list(reversed(version_summaries)),
        "lastUpdated": datums.aggregate(Max('timestamp'))['timestamp__max']
    }
