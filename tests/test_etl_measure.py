import datetime

import pytest
from freezegun import freeze_time
from dateutil.tz import tzutc
from unittest.mock import (call, patch)

from missioncontrol.base.models import (Datum,
                                        Measure)
from missioncontrol.etl.date import datetime_to_utc


@pytest.fixture
def mock_raw_query_data(monkeypatch, base_datapoint_time):
    # we test the case where display_version is None (currently happens with old data,
    # probably will not be a problem in the future)
    base_datapoint_time_without_utc = datetime.datetime.fromtimestamp(
        base_datapoint_time.timestamp(), tz=None)
    return [
        [base_datapoint_time_without_utc, '20170629075044', '55.0.2', None, 120, 10, 120],
        [base_datapoint_time_without_utc -
         datetime.timedelta(minutes=10), '20170629075044', '55.0.2', '55.0.2', 120, 20, 120]
    ]


@pytest.fixture
def mock_raw_query(monkeypatch, mock_raw_query_data):
    import missioncontrol.etl.presto

    def _raw_query(sql, params):
        return mock_raw_query_data

    monkeypatch.setattr(missioncontrol.etl.presto, 'raw_query', _raw_query)


@freeze_time('2017-07-01 13:00')
def test_update_measure_new_series(initial_data, prepopulated_version_cache,
                                   mock_raw_query, mock_raw_query_data):
    from missioncontrol.etl.measure import update_measure
    update_measure('linux', 'release', 'main_crashes')
    assert list(Datum.objects.filter(
        series__measure__name='main_crashes',
        series__build__build_id='20170629075044',
        series__build__version='55.0.2',
        series__build__channel__name='release',
        series__build__platform__name='linux').values_list(
            'timestamp', 'value', 'usage_hours').order_by(
                'timestamp')) == sorted(
                    [(datetime_to_utc(d[0]), d[4], d[5]) for d in mock_raw_query_data],
                    key=lambda d: d[0])


@freeze_time('2017-07-01 13:00')
def test_update_measure_existing_series(fake_measure_data,
                                        prepopulated_version_cache,
                                        mock_raw_query,
                                        mock_raw_query_data,
                                        base_datapoint_time):
    from missioncontrol.etl.measure import update_measure
    update_measure('linux', 'release', 'main_crashes')
    # assert that new data gets inserted as expected
    assert list(Datum.objects.filter(
        series__measure__name='main_crashes',
        series__build__build_id='20170629075044',
        series__build__version='55.0.2',
        series__build__channel__name='release',
        series__build__platform__name='linux').values_list(
            'timestamp', 'value', 'usage_hours').order_by(
                'timestamp')) == sorted(
                    [(datetime_to_utc(d[0]), d[4], d[5]) for d in mock_raw_query_data],
                    key=lambda d: d[0])

    # assert that we have the expected number of total datums
    assert Datum.objects.count() == 6 + len(mock_raw_query_data)


@freeze_time('2017-07-01 13:00')
def test_get_measure_summary(fake_measure_data, prepopulated_version_cache):
    from missioncontrol.etl.measuresummary import get_measure_summary
    assert get_measure_summary('linux', 'release', 'main_crashes') == {
        'lastUpdated': datetime.datetime(2017, 7, 1, 12, 0, tzinfo=tzutc()),
        'versions': [
            {
                'adjustedCount': 120,
                'adjustedRate': 2041.67,
                'count': 120,
                'fieldDuration': 600,
                'rate': 2041.67,
                'version': '55.0.1'
            },
            {
                'adjustedCount': 240,
                'adjustedRate': 2041.67,
                'count': 240,
                'fieldDuration': 600,
                'rate': 2041.67,
                'version': '55'
            }
        ]
    }


def test_all_measure_update_tasks_scheduled(initial_data, *args):
    # this test is a bit tautological, but at least exercises the function
    expected_calls = []
    for measure in Measure.objects.exclude(platform=None):
        for channel in measure.channels.all():
            expected_calls.append(call(args=[measure.platform.name, channel.name,
                                             measure.name]))

    from missioncontrol.etl.tasks import update_measures
    with patch('missioncontrol.etl.measure.update_measure.apply_async') as mock_task:
        update_measures()
        mock_task.assert_has_calls(expected_calls, any_order=True)
