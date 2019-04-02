import pytest
from django.urls import reverse
from freezegun import freeze_time


@freeze_time('2017-07-01 13:00')
def test_experiments_api(fake_experiments_data, client):
    resp = client.get(reverse('experiment'), {
        'measure': 'main_crashes',
        'interval': 86400,
        'experiment': 'my_experiment'
    })
    print(resp)
    assert resp.json()['measure_data'] == {
        'branch1': [
                ['2017-07-01T11:50:00Z', 100.0, 20.0],
                ['2017-07-01T11:55:00Z', 10.0, 16.0],
                ['2017-07-01T12:00:00Z', 10.0, 20.0]
        ],
        'branch2': [
                ['2017-07-01T11:50:00Z', 100.0, 20.0],
                ['2017-07-01T11:55:00Z', 10.0, 16.0],
                ['2017-07-01T12:00:00Z', 10.0, 20.0]
        ]
    }


@pytest.mark.parametrize('missing_param', ['experiment', 'measure', 'interval'])
def test_experiments_api_missing_params(client, missing_param):
    params = {
        'experiment': 'my_experiment',
        'measure': 'main_crashes',
        'interval': 86400
    }
    del params[missing_param]
    resp = client.get(reverse('measure'), params)
    assert resp.status_code == 400
