import datetime

import pytest
from freezegun import freeze_time
from dateutil.tz import tzutc

from missioncontrol.base.models import Datum
from missioncontrol.etl.date import datetime_to_utc


@pytest.fixture
def mock_raw_query_data(monkeypatch, base_datapoint_time):
    base_datapoint_time_without_utc = datetime.datetime.fromtimestamp(
        base_datapoint_time.timestamp(), tz=None)
    return [
        [base_datapoint_time_without_utc, '20170629075044', '55.0.2', 120, 10, 120],
        [base_datapoint_time_without_utc -
         datetime.timedelta(minutes=10), '20170629075044', '55.0.2', 120, 20, 120]
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
                    [(datetime_to_utc(d[0]), d[3], d[4]) for d in mock_raw_query_data],
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
                    [(datetime_to_utc(d[0]), d[3], d[4]) for d in mock_raw_query_data],
                    key=lambda d: d[0])

    # assert that we have the expected number of total datums
    assert Datum.objects.count() == 6 + len(mock_raw_query_data)


@freeze_time('2017-07-01 13:00')
def test_get_measure_summary(fake_measure_data, prepopulated_version_cache):
    from missioncontrol.etl.measuresummary import get_measure_summary
    assert get_measure_summary('linux', 'release', 'main_crashes') == {
        'lastUpdated': datetime.datetime(2017, 7, 1, 12, 0, tzinfo=tzutc()),
        'latest': {
            'median': 625.0,
            'stdev': 2562.754,
            'usageHours': 56.0,
            'version': '55.0.1'
        },
        'previous': {
            'median': 625.0,
            'stdev': 2562.754,
            'usageHours': 56.0,
            'version': None
        }
    }
