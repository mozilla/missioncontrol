import datetime
import math
import random

import pytest

from missioncontrol.base.models import (Build,
                                        Channel,
                                        Datum,
                                        Measure,
                                        Platform,
                                        Series)
from missioncontrol.etl.measuresummary import get_measure_summary


# silly helper function to generate some fake data
def _generate_fake_data(platform_name, channel_name, measure_name, buildid,
                        version, base_datapoint_time, num_datapoints):
    build = Build.objects.create(
        platform=Platform.objects.get(name=platform_name),
        channel=Channel.objects.get(name=channel_name),
        build_id=buildid,
        version=version)
    measure = Measure.objects.get(name=measure_name,
                                  platform__name=platform_name)
    series = Series.objects.create(build=build, measure=measure)
    latest_timestamp = None
    random.seed(42)
    for i in range(num_datapoints):
        latest_timestamp = base_datapoint_time + datetime.timedelta(hours=i)
        (value, usage_hours, client_count) = (
            math.floor((i + 1) / 2.0) + random.randint(0, 5), float(i + 1), i)
        Datum.objects.create(series=series, timestamp=latest_timestamp,
                             value=value, usage_hours=usage_hours,
                             client_count=client_count)
    return latest_timestamp


@pytest.mark.parametrize('num_datapoints', [2, 1, 0, 200])
def test_get_measure_summary(base_datapoint_time, prepopulated_version_cache,
                             initial_data, num_datapoints):
    '''
    Test getting the measure summary with a small number of datapoints

    Small number of endpoints are edge cases of the summarization algorithm
    '''
    (platform_name, channel_name, measure_name) = ('linux', 'release',
                                                   'main_crashes')
    latest_timestamp = _generate_fake_data(platform_name, channel_name,
                                           measure_name,
                                           '20170629075044', '55.0',
                                           base_datapoint_time,
                                           num_datapoints)

    if num_datapoints == 0:
        assert get_measure_summary(
            platform_name, channel_name, measure_name) == {
                "versions": [],
                "lastUpdated": None
            }
    elif num_datapoints == 1:
        assert get_measure_summary(
            platform_name, channel_name, measure_name) == {
                "versions": [],
                "lastUpdated": latest_timestamp
            }
    elif num_datapoints == 2:  # num_datapoints == 2
        assert get_measure_summary(
            platform_name, channel_name, measure_name) == {
                "versions": [
                    {
                        "version": "55.0",
                        "adjustedCount": 6,
                        "count": 6,
                        "adjustedRate": 2000.0,
                        "rate": 2000.0,
                        "fieldDuration": 3600
                    },
                    {
                        "version": "55",
                        "adjustedCount": 6,
                        "adjustedRate": 2000.0,
                        "count": 6,
                        "rate": 2000.0,
                        "fieldDuration": 3600
                    }
                ],
                "lastUpdated": latest_timestamp
            }
    else:  # num_datapoints == 100
        assert get_measure_summary(
            platform_name, channel_name, measure_name) == {
                "versions": [
                    {
                        "version": "55.0",
                        "adjustedCount": 10305,
                        "count": 10305,
                        "adjustedRate": 520.23,
                        "rate": 520.23,
                        "fieldDuration": 716400
                    },
                    {
                        "version": "55",
                        "adjustedCount": 10305,
                        "adjustedRate": 520.23,
                        "count": 10305,
                        "rate": 520.23,
                        "fieldDuration": 716400
                    }
                ],
                "lastUpdated": latest_timestamp
            }


def test_get_measure_summary_high_beta(base_datapoint_time, prepopulated_version_cache,
                                       initial_data):
    (platform_name, channel_name, measure_name) = ('linux', 'release',
                                                   'main_crashes')
    for (version, buildid, delta) in [('55.0b1', '20170629075044', datetime.timedelta()),
                                      ('55.0b2', '20180629075044', datetime.timedelta(hours=1)),
                                      ('55.0b10', '20190629075044', datetime.timedelta(hours=2))]:
        latest_timestamp = _generate_fake_data(platform_name, channel_name,
                                               measure_name, buildid, version,
                                               base_datapoint_time + delta, 2)

    assert get_measure_summary(
        platform_name, channel_name, measure_name) == {
            "versions": [
                {
                    "version": "55.0b10",
                    "adjustedCount": 6,
                    "count": 6,
                    "adjustedRate": 2000.0,
                    "rate": 2000.0,
                    "fieldDuration": 3600
                },
                {
                    "version": "55",
                    "adjustedCount": 18,
                    "adjustedRate": 2000.0,
                    "count": 18,
                    "rate": 2000.0,
                    "fieldDuration": 10800
                }
            ],
            "lastUpdated": latest_timestamp
        }
