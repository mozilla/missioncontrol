import datetime

import pytest
from freezegun import freeze_time
from unittest.mock import (call, patch)

from missioncontrol.base.models import (Datum,
                                        Measure)
from missioncontrol.etl.date import datetime_to_utc


@pytest.fixture
def mock_raw_query_data(monkeypatch, base_datapoint_time):
    base_datapoint_time_without_utc = datetime.datetime.fromtimestamp(
        base_datapoint_time.timestamp(), tz=None)
    return [
        [base_datapoint_time_without_utc, '20170629075044', '55.0', 120, 10, 120],
        [base_datapoint_time_without_utc +
         datetime.timedelta(minutes=10), '20170629075044', '55.0', 120, 20, 120]
    ]


@pytest.fixture
def mock_raw_query(monkeypatch, mock_raw_query_data):
    import missioncontrol.etl.presto

    def _raw_query(sql, params):
        return mock_raw_query_data

    monkeypatch.setattr(missioncontrol.etl.presto, 'raw_query', _raw_query)


@freeze_time('2017-07-01 13:00')
def test_update_measure(prepopulated_builds,
                        mock_raw_query,
                        mock_raw_query_data,
                        base_datapoint_time):
    from missioncontrol.etl.measure import update_measure
    update_measure('firefox', 'linux', 'release', 'main_crashes')
    # assert that data gets inserted as expected
    assert list(Datum.objects.filter(
        measure__name='main_crashes',
        build__build_id='20170629075044',
        build__version='55.0',
        build__channel__name='release',
        build__platform__name='linux').values_list(
            'timestamp', 'value', 'usage_hours').order_by(
                'timestamp')) == sorted(
                    [(datetime_to_utc(d[0]), d[3], d[4]) for d in mock_raw_query_data],
                    key=lambda d: d[0])

    # assert that we have the expected number of total datums
    assert Datum.objects.count() == 2


def test_all_measure_update_tasks_scheduled(initial_data, *args):
    # this test is a bit tautological, but at least exercises the function
    expected_calls = []
    for measure in Measure.objects.exclude(platform=None, application=None):
        for channel in measure.channels.all():
            expected_calls.append(call(args=[measure.application.name,
                                             measure.platform.name,
                                             channel.name,
                                             measure.name]))

    from missioncontrol.etl.tasks import update_measures
    with patch('missioncontrol.etl.measure.update_measure.apply_async') as mock_task:
        update_measures()
        mock_task.assert_has_calls(expected_calls, any_order=True)
