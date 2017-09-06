import datetime
import time

import pytest
from django.core.cache import cache
from django.core.urlresolvers import reverse
from freezegun import freeze_time

from missioncontrol.etl.schema import get_measure_cache_key


@pytest.mark.parametrize('missing_param', ['platform', 'channel', 'measure'])
def test_get_measure_missing_params(client, missing_param):
    params = {
        'platform': 'windows',
        'channel': 'release',
        'measure': 'main_crashes',
        'interval': 86400
    }
    del params[missing_param]
    resp = client.get(reverse('measure'), params)
    assert resp.status_code == 400


@freeze_time('2017-07-01 13:00')
def test_get_measure(client):
    (platform, channel, measure) = ('windows', 'beta', 'main_crashes')
    cache_key = get_measure_cache_key(platform, channel, measure)
    (first_timestamp, second_timestamp) = (
        datetime.datetime.utcnow() - datetime.timedelta(hours=12),
        datetime.datetime.utcnow() - datetime.timedelta(days=2))
    stored_data = {
        '20170627075044': {
            'version': '55.0a1',
            'data': [[first_timestamp, 321, 10],
                     [second_timestamp, 3213, 20]]
        }
    }
    cache.set(cache_key, stored_data)

    # long interval should return all our test data in expected format
    resp = client.get(reverse('measure'), {
        'platform': platform,
        'channel': channel,
        'measure': measure,
        'interval': 86400*10
    })
    assert resp.json()['measure_data'] == {
        '20170627075044': {
            'data': [['2017-07-01T01:00:00Z', 321, 10],
                     ['2017-06-29T13:00:00Z', 3213, 20]],
            'version': '55.0a1'
        }
    }

    # if we specify a shorter interval, should only get data within
    # present time - interval
    resp = client.get(reverse('measure'), {
        'platform': platform,
        'channel': channel,
        'measure': measure,
        'interval': 86400
    })
    assert resp.json()['measure_data']['20170627075044']['data'] == [
        ['2017-07-01T01:00:00Z', 321, 10]
    ]

    # also make sure that start time + interval filters as expected
    resp = client.get(reverse('measure'), {
        'platform': platform,
        'channel': channel,
        'measure': measure,
        'start': int(time.mktime(second_timestamp.timetuple())),
        'interval': 86400
    })
    assert resp.json()['measure_data']['20170627075044']['data'] == [
        ['2017-06-29T13:00:00Z', 3213, 20]
    ]
