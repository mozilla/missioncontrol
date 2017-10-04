import datetime

import pytest
import responses as responses_
from django.core.cache import cache


def pytest_runtest_setup(item):
    """
    Per-test setup.
    """
    # Clear cache between tests
    from django.core.cache import cache
    cache.clear()


@pytest.yield_fixture
def responses():
    with responses_.RequestsMock() as rsps:
        yield rsps


@pytest.fixture
def prepopulated_version_cache():
    cache.set('firefox_versions', {
        'nightly': '56.0a1',
        'esr': '52.3.0esr',
        'beta': '55.0b6',
        'release': '54.0.1'
    })


@pytest.fixture
def base_datapoint_time():
    return datetime.datetime.strptime('2017-07-01 12:00:00', '%Y-%m-%d %H:%M:%S')


@pytest.fixture
def fake_measure_data(base_datapoint_time):
    return {
        '20170629075044': {
            'version': '55.0b6',
            'data': [[base_datapoint_time - datetime.timedelta(minutes=10), 100, 20],
                     [base_datapoint_time - datetime.timedelta(minutes=5), 10, 16],
                     [base_datapoint_time, 10, 20]]
        },
        '20170620075044': {
            'version': '55.0b5',
            'data': [[base_datapoint_time - datetime.timedelta(minutes=10), 10, 20],
                     [base_datapoint_time - datetime.timedelta(minutes=5), 10, 16],
                     [base_datapoint_time, 10, 20]]
        }
    }
