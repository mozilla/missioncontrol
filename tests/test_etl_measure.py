import datetime

import pytest
from freezegun import freeze_time
from unittest.mock import (call, patch)

from missioncontrol.base.models import (Application,
                                        Channel,
                                        Datum,
                                        Measure,
                                        Platform)
from missioncontrol.etl.date import datetime_to_utc


@pytest.fixture
def mock_raw_query_data(monkeypatch, base_datapoint_time):
    base_datapoint_time_without_utc = datetime.datetime.fromtimestamp(
        base_datapoint_time.timestamp(), tz=None)
    return [
        [base_datapoint_time_without_utc, '20170629075044', '55.0', 10, 120, 120],
        [base_datapoint_time_without_utc +
         datetime.timedelta(minutes=10), '20170629075044', '55.0', 20, 120, 120]
    ]


@pytest.fixture
def mock_raw_query(monkeypatch, mock_raw_query_data):
    import missioncontrol.etl.bigquery

    class MockClient:
        def query(self, query):
            return mock_raw_query_data

    def get_client():
        return MockClient()

    monkeypatch.setattr(missioncontrol.etl.bigquery, 'get_bigquery_client', get_client)


def test_update_measures_no_build_data(initial_data, mock_raw_query,
                                       mock_raw_query_data):
    (application, platform, channel) = ('firefox', 'linux', 'release')
    with pytest.raises(Exception, match='No valid versions'):
        from missioncontrol.etl.measure import update_measures
        update_measures(application, platform, channel)


@freeze_time('2017-07-01 13:00')
def test_update_measures(prepopulated_builds,
                         mock_raw_query,
                         mock_raw_query_data,
                         base_datapoint_time):
    (application, platform, channel) = ('firefox', 'linux', 'release')

    # delete linux release measures except for main_crashes (since we're
    # pretending to only return that)
    Measure.objects.filter(application__name=application,
                           channels=Channel.objects.get(name=channel),
                           platform__name=platform).exclude(
                               name='main_crashes').delete()

    from missioncontrol.etl.measure import update_measures
    update_measures(application, platform, channel)
    # assert that data gets inserted as expected
    assert list(Datum.objects.filter(
        measure__name='main_crashes',
        build__build_id='20170629075044',
        build__version='55.0',
        build__channel__name='release',
        build__platform__name='linux').values_list(
            'timestamp', 'usage_hours', 'client_count', 'value').order_by(
                'timestamp')) == sorted(
                    [(datetime_to_utc(d[0]), d[3], d[4], d[5]) for d in
                     mock_raw_query_data],
                    key=lambda d: d[0])

    # assert that we have the expected number of total datums
    assert Datum.objects.count() == 2


def test_all_measure_update_tasks_scheduled(initial_data, *args):
    # this test is a bit tautological, but at least exercises the function
    expected_calls = []
    for channel in Channel.objects.all():
        for platform in Platform.objects.all():
            for application in Application.objects.all():
                if Measure.objects.filter(
                        channels=channel, platform=platform,
                        application=application).exists():
                    expected_calls.append(
                        call(args=[application.name,
                                   platform.name,
                                   channel.name])
                    )

    from missioncontrol.etl.tasks import update_channel_measures
    with patch('missioncontrol.etl.measure.update_measures.apply_async') as mock_task:
        update_channel_measures()
        mock_task.assert_has_calls(expected_calls, any_order=True)
