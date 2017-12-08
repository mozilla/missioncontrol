import datetime
import pytz

import pytest
import responses as responses_
from django.core.cache import cache
from django.core.management import call_command

from missioncontrol.base.models import (Build,
                                        Channel,
                                        Datum,
                                        Measure,
                                        Platform,
                                        Series)


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
        'release': '55.0.1'
    })


@pytest.fixture
def base_datapoint_time():
    return datetime.datetime(2017, 7, 1, 12, 0, tzinfo=pytz.UTC)


@pytest.fixture
def initial_data(transactional_db):
    call_command('load_initial_data')


def _create_fake_measure_data(base_datapoint_time, offset_earlier_version):
    for (build_id, version, time_offset) in [
            ('20170629075044', '55.0', offset_earlier_version),
            ('20170620075044', '55.0.1', datetime.timedelta())
    ]:
        build = Build.objects.create(platform=Platform.objects.get(name='linux'),
                                     channel=Channel.objects.get(name='release'),
                                     build_id=build_id,
                                     version=version)
        measure = Measure.objects.get(name='main_crashes', platform__name='linux')
        series = Series.objects.create(build=build, measure=measure)
        for (timestamp, value, usage_hours, client_count) in (
                (base_datapoint_time - time_offset - datetime.timedelta(minutes=10), 100, 20, 100),
                (base_datapoint_time - time_offset - datetime.timedelta(minutes=5), 10, 16, 101),
                (base_datapoint_time - time_offset, 10, 20, 102)):
            Datum.objects.create(series=series, timestamp=timestamp,
                                 value=value, usage_hours=usage_hours,
                                 client_count=client_count)


@pytest.fixture
def fake_measure_data(initial_data, base_datapoint_time):
    _create_fake_measure_data(base_datapoint_time, datetime.timedelta())


@pytest.fixture
def fake_measure_data_offset(initial_data, base_datapoint_time):
    _create_fake_measure_data(base_datapoint_time, datetime.timedelta(days=1))
