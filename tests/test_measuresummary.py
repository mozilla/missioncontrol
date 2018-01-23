import datetime

import pytest

from missioncontrol.base.models import (Build,
                                        Channel,
                                        Datum,
                                        Measure,
                                        Platform,
                                        Series)
from missioncontrol.etl.measuresummary import get_measure_summary


@pytest.mark.parametrize('num_datapoints', [2, 1, 0])
def test_get_measure_summary(base_datapoint_time, initial_data, num_datapoints):
    '''
    Test getting the measure summary with a small number of datapoints

    Small number of endpoints are edge cases of the summarization algorithm
    '''
    (platform_name, channel_name, measure_name) = ('linux', 'release',
                                                   'main_crashes')
    build = Build.objects.create(
        platform=Platform.objects.get(name=platform_name),
        channel=Channel.objects.get(name=channel_name),
        build_id='20170629075044',
        version='55.0')
    measure = Measure.objects.get(name=measure_name,
                                  platform__name=platform_name)
    series = Series.objects.create(build=build, measure=measure)
    latest_timestamp = None
    for i in range(num_datapoints):
        latest_timestamp = base_datapoint_time + datetime.timedelta(hours=i)
        (value, usage_hours, client_count) = (float(i), float(i + 1), i)
        Datum.objects.create(series=series, timestamp=latest_timestamp,
                             value=value, usage_hours=usage_hours,
                             client_count=client_count)

    if num_datapoints == 0:
        assert get_measure_summary(
            platform_name, channel_name, measure_name) == {
                "latest": {
                    "version": None,
                    "median": None,
                    "stdev": 0.0,
                    "usageHours": 0.0
                },
                "previous": {
                    "version": None,
                    "median": None,
                    "stdev": 0.0,
                    "usageHours": 0.0
                },
                "lastUpdated": None
            }
    elif num_datapoints == 1:
        assert get_measure_summary(
            platform_name, channel_name, measure_name) == {
                "latest": {
                    "version": "55.0",
                    "median": 0.0,
                    "stdev": 0.0,
                    "usageHours": 1.0
                },
                "previous": {
                    "version": None,
                    "median": None,
                    "stdev": 0.0,
                    "usageHours": 0.0
                },
                "lastUpdated": latest_timestamp
            }
    else:  # num_datapoints == 2
        assert get_measure_summary(
            platform_name, channel_name, measure_name) == {
                "latest": {
                    "version": "55.0",
                    "median": 250.0,
                    "stdev": 353.553,
                    "usageHours": 3.0
                },
                "previous": {
                    "version": None,
                    "median": None,
                    "stdev": 0.0,
                    "usageHours": 0.0
                },
                "lastUpdated": latest_timestamp
            }
