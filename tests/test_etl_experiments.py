from unittest.mock import patch

from missioncontrol.base.models import Experiment
from missioncontrol.settings import FIREFOX_EXPERIMENTS_URL


def test_update_experiments(transactional_db, responses):
    # importing this here, otherwise we mess up the mocking of
    # the presto response in test_etl_measure
    from missioncontrol.etl.tasks import update_experiment_list
    responses.add(
        responses.GET, FIREFOX_EXPERIMENTS_URL,
        json=[{'recipe': {'arguments': {'slug': 'experiment1'}}},
              {'recipe': {'arguments': {'slug': 'experiment2'}}}],
        status=200)
    responses.add(
        responses.GET, FIREFOX_EXPERIMENTS_URL,
        json=[{'recipe': {'arguments': {'slug': 'experiment2'}}}],
        status=200)

    update_experiment_list()
    assert list(Experiment.objects.values_list(
        'name', 'enabled').order_by('name')) == [
            ('experiment1', True),
            ('experiment2', True)
        ]

    # 2nd response does not include experiment1, so it's disabled
    update_experiment_list()
    assert list(Experiment.objects.values_list(
        'name', 'enabled').order_by('name')) == [
            ('experiment1', False),
            ('experiment2', True)
        ]


def test_update_experiment_data(transactional_db, responses):
    e = Experiment.objects.create(name="cheezburger", enabled=True)
    from missioncontrol.etl.tasks import update_experiment_data
    with patch('missioncontrol.etl.experiment.update_experiment.apply_async') as mock_task:
        update_experiment_data()
        mock_task.assert_called_once_with(args=[e.name])
