import datetime

import pytest
from freezegun import freeze_time
from django.core.cache import cache

from missioncontrol.etl.schema import (get_measure_cache_key,
                                       get_measure_summary_cache_key)
from missioncontrol.etl.versions import _get_buildhub_url


@pytest.fixture
def mock_raw_query_data(monkeypatch, base_datapoint_time):
    return [
        [base_datapoint_time, '20170629075044', '55.0a1', 120, 10],
        [base_datapoint_time - datetime.timedelta(minutes=10), '20170629075044', '55.0a1', 120, 20]
    ]


@pytest.fixture
def mock_raw_query(monkeypatch, mock_raw_query_data):
    import missioncontrol.etl.presto

    def _raw_query(sql, params):
        return mock_raw_query_data

    monkeypatch.setattr(missioncontrol.etl.presto, 'raw_query', _raw_query)


@freeze_time('2017-07-01 13:00')
def test_update_measure_no_initial_data(prepopulated_version_cache, mock_raw_query,
                                        mock_raw_query_data):
    from missioncontrol.etl.measure import update_measure
    update_measure('windows', 'release', 'main_crashes')
    assert cache.get(get_measure_cache_key('windows', 'release', 'main_crashes')) == {
        '20170629075044': {
            'version': '55.0a1',
            'data': sorted([(d[0], d[3], d[4]) for d in mock_raw_query_data], key=lambda d: d[0])
        }
    }


@freeze_time('2017-07-01 13:00')
def test_update_measure_with_initial_data(prepopulated_version_cache,
                                          mock_raw_query,
                                          mock_raw_query_data,
                                          base_datapoint_time):
    from missioncontrol.etl.measure import update_measure
    existing_data = {
        '20170629075044': {
            'version': '55.0a1',
            'data': [(base_datapoint_time - datetime.timedelta(days=1), 321, 10)]
        }
    }
    cache_key = get_measure_cache_key('windows', 'release', 'main_crashes')
    cache.set(cache_key, existing_data)
    update_measure('windows', 'release', 'main_crashes')

    assert cache.get(cache_key) == {
        '20170629075044': {
            'version': '55.0a1',
            'data': existing_data['20170629075044']['data'] +
            sorted([(d[0], d[3], d[4]) for d in mock_raw_query_data], key=lambda d: d[0])
        }
    }


@freeze_time('2017-07-01 13:00')
def test_update_measure_on_beta(responses, prepopulated_version_cache,
                                mock_raw_query, mock_raw_query_data,
                                base_datapoint_time):
    from missioncontrol.etl.measure import update_measure
    (channel, buildid, expected_version) = ('beta', '20170629075044', '55.0b6')
    responses.add(responses.GET, _get_buildhub_url(channel, buildid),
                  json={'data': [{'target': {'version': expected_version}}]})

    update_measure('windows', 'beta', 'main_crashes')
    assert cache.get(get_measure_cache_key('windows', 'beta', 'main_crashes')) == {
        '20170629075044': {
            'version': expected_version,
            'data': sorted([(d[0], d[3], d[4]) for d in mock_raw_query_data], key=lambda d: d[0])
        }
    }
    assert cache.get(get_measure_summary_cache_key('windows', 'beta', 'main_crashes')) == {
        'lastUpdated': base_datapoint_time,
        'latest': {
            'median': 9000.0,
            'usageHours': 30,
            'version': '55.0b6'
        },
        'previous': {
            'median': None,
            'usageHours': 0,
            'version': None
        }
    }


@freeze_time('2017-07-01 13:00')
def test_get_measure_summary(prepopulated_version_cache, base_datapoint_time, fake_measure_data):
    from missioncontrol.etl.measuresummary import get_measure_summary
    assert get_measure_summary('windows', 'beta', 'main_crashes', fake_measure_data) == {
        'lastUpdated': datetime.datetime(2017, 7, 1, 12, 0),
        'latest': {
            'median': 625.0,
            'usageHours': 56,
            'version': '55.0b6'
        },
        'previous': {
            'median': 500.0,
            'usageHours': 56,
            'version': None
        }
    }
