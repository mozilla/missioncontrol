import datetime
import statistics

from missioncontrol.settings import DATA_EXPIRY_INTERVAL
from .versions import get_current_firefox_version


def _get_summary_dict(values, version=None):
    return {
        "version": version,
        "median": statistics.median([v[1]/(v[2]/1000.0) for v in values]) if values else None,
        "usageHours": sum([v[2] for v in values]) if values else 0
    }


def get_measure_summary(platform_name, channel_name, measure_name, data):
    current_version = get_current_firefox_version(channel_name)
    build_ids = list(reversed(sorted(data.keys())))
    if not build_ids:
        return {
            "latest": _get_summary_dict([], current_version),
            "previous": _get_summary_dict([]),
            "lastUpdated": None
        }

    (latest_buildid, previous_buildids) = (build_ids[0], build_ids[1:])

    min_timestamp = datetime.datetime.utcnow() - DATA_EXPIRY_INTERVAL

    if data[latest_buildid]['version'] != current_version:
        # does the latest version correspond to the latest released version?
        # if not, then we will say it is missing
        previous_buildids.append(latest_buildid)
        latest_values = []
    else:
        latest_values = [d for d in data[latest_buildid]['data'] if
                         d[0] > min_timestamp]

    # amalgamate all previous recent results into "previous"
    data_map = {}
    for build_id in previous_buildids:
        filtered_data = [d for d in data[build_id]['data'] if d[0] > min_timestamp]
        for (timestamp, measure_count, usage_hours) in filtered_data:
            if not data_map.get(timestamp):
                data_map[timestamp] = [timestamp, measure_count, usage_hours]
            else:
                data_map[timestamp][1] += measure_count
                data_map[timestamp][2] += usage_hours
    previous_values = sorted(data_map.values())

    # set the last updated field
    if latest_values or previous_values:
        last_updated = max([d[0] for d in latest_values + previous_values])
    else:
        last_updated = None

    return {
        "latest": _get_summary_dict(latest_values, current_version),
        "previous": _get_summary_dict(previous_values),
        "lastUpdated": last_updated
    }
