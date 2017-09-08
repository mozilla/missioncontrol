import datetime

import pytest
from freezegun import freeze_time
from django.core.cache import cache

from missioncontrol.etl.schema import get_measure_cache_key
from missioncontrol.etl.versions import _get_buildhub_url


@pytest.fixture
def prepopulated_version_cache():
    cache.set('firefox_versions', {
        'nightly': '56.0a1',
        'esr': '52.3.0esr',
        'beta': '55.0b1',
        'release': '54.0.1'
    })


@pytest.fixture
def base_datapoint_time():
    return datetime.datetime.strptime('2017-07-01 12:00:00', '%Y-%m-%d %H:%M:%S')


@pytest.fixture
def mock_raw_query_data(monkeypatch, base_datapoint_time):
    return [
        [base_datapoint_time, '20170629075044', '55.0a1', 123, 10],
        [base_datapoint_time - datetime.timedelta(minutes=10), '20170629075044', '55.0a1', 123, 20]
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


@pytest.mark.parametrize('missing_initial', [False, True])
@freeze_time('2017-07-01 13:00')
def test_update_measure_on_beta(responses, prepopulated_version_cache,
                                mock_raw_query, mock_raw_query_data,
                                missing_initial):
    from missioncontrol.etl.measure import update_measure
    (channel, buildid, expected_initial_version, expected_version) = (
        'beta', '20170629075044', '55.0a1', '55.0b6')

    def check_cache(expected_version):
        cached_data = cache.get(get_measure_cache_key('windows', 'beta', 'main_crashes'))
        assert cached_data['20170629075044']['version'] == expected_version

    # we must set up all responses before the fake endpoint is hit
    if missing_initial:
        # initial response where data not present
        responses.add(responses.GET, _get_buildhub_url(channel, buildid),
                      json={'data': []})
    responses.add(responses.GET, _get_buildhub_url(channel, buildid),
                  json={'data': [{'target': {'version': expected_version}}]})

    if missing_initial:
        update_measure('windows', 'beta', 'main_crashes')
        check_cache(expected_initial_version)
        # HACK: manually modify data to contain a subset of what is present
        # (would probably be a more realistic test to reset/change the data
        # returned by the mock, but this should do from the point of view of
        # checking that a pre-existing set of data is updated)
        cache.set(get_measure_cache_key('windows', 'beta', 'main_crashes'), {
            '20170629075044': {
                'version': expected_initial_version,
                'data': [sorted([(d[0], d[3], d[4]) for d in mock_raw_query_data],
                                key=lambda d: d[0])[0]]
            }
        })

    update_measure('windows', 'beta', 'main_crashes')
    check_cache(expected_version)
