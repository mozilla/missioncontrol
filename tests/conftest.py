import datetime
import pytz

import pytest
import responses as responses_
from django.core.cache import cache
from django.core.management import call_command

from missioncontrol.base.models import (Application,
                                        Build,
                                        Channel,
                                        Datum,
                                        Experiment,
                                        ExperimentBranch,
                                        Measure,
                                        Platform)


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
def fake_build_data():
    return [
        ('20170629075044', '55.0'),
        ('20170620075044', '55.0.1')
    ]


@pytest.fixture
def prepopulated_builds(initial_data, fake_build_data):
    for (build_id, version) in fake_build_data:
        Build.objects.create(application=Application.objects.get(name='firefox'),
                             platform=Platform.objects.get(name='linux'),
                             channel=Channel.objects.get(name='release'),
                             build_id=build_id,
                             version=version)


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


def _create_fake_series_data(build, measure, experiment_branch,
                             base_datapoint_time, time_offset):
    for (timestamp, value, usage_hours, client_count) in (
            (base_datapoint_time - time_offset - datetime.timedelta(minutes=10), 100, 20, 100),
            (base_datapoint_time - time_offset - datetime.timedelta(minutes=5), 10, 16, 101),
            (base_datapoint_time - time_offset, 10, 20, 102)):
        Datum.objects.create(build=build, measure=measure,
                             experiment_branch=experiment_branch,
                             timestamp=timestamp, value=value,
                             usage_hours=usage_hours,
                             client_count=client_count)


def _create_fake_measure_data(fake_build_data, base_datapoint_time, offset_earlier_version):
    for ((build_id, version), time_offset) in zip(fake_build_data,
                                                  (offset_earlier_version,
                                                   datetime.timedelta())):
        build = Build.objects.create(application=Application.objects.get(name='firefox'),
                                     platform=Platform.objects.get(name='linux'),
                                     channel=Channel.objects.get(name='release'),
                                     build_id=build_id,
                                     version=version)
        measure = Measure.objects.get(name='main_crashes', platform__name='linux')
        _create_fake_series_data(build, measure, None, base_datapoint_time,
                                 time_offset)


@pytest.fixture
def fake_measure_data(initial_data, fake_build_data, base_datapoint_time):
    _create_fake_measure_data(fake_build_data, base_datapoint_time, datetime.timedelta())


@pytest.fixture
def fake_measure_data_offset(initial_data, fake_build_data, base_datapoint_time):
    _create_fake_measure_data(fake_build_data, base_datapoint_time, datetime.timedelta(days=1))


@pytest.fixture
def fake_experiments_data(transactional_db, base_datapoint_time):
    experiment = Experiment.objects.create(name='my_experiment', enabled=True)
    measure = Measure.objects.create(name='main_crashes', min_version=None,
                                     platform=None)
    for branch_name in ['branch1', 'branch2']:
        experiment_branch = ExperimentBranch.objects.create(
            experiment=experiment, name=branch_name)
        _create_fake_series_data(None, measure, experiment_branch,
                                 base_datapoint_time, datetime.timedelta())
