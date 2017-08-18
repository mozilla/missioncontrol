import datetime

from django.core.cache import cache
from django.core.urlresolvers import reverse
from freezegun import freeze_time

from missioncontrol.etl.schema import get_measure_cache_key


@freeze_time('2017-07-01 13:00')
def test_get_measure(client):
    (platform, channel, measure) = ('windows', 'beta', 'main_crashes')
    cache_key = get_measure_cache_key(platform, channel, measure)
    stored_data = {
        '20170627075044': {
            'version': '55.0a1',
            'data': [[datetime.datetime.utcnow() - datetime.timedelta(hours=12), 321, 10],
                     [datetime.datetime.utcnow() - datetime.timedelta(days=2), 3213, 20]]
        }
    }
    cache.set(cache_key, stored_data)
    resp = client.get(reverse('measure'), {
        'platform': platform,
        'channel': channel,
        'measure': measure
    })

    # data returned should have datetimes formatted correctly
    assert resp.json()['measure_data'] == {
        '20170627075044': {
            'data': [['2017-07-01T01:00:00', 321, 10],
                     ['2017-06-29T13:00:00', 3213, 20]],
            'version': '55.0a1'
        }
    }

    # if we specify an interval, should only get data within that interval
    resp = client.get(reverse('measure'), {
        'platform': platform,
        'channel': channel,
        'measure': measure,
        'interval': 86400
    })
    assert resp.json()['measure_data']['20170627075044']['data'] == [
        ['2017-07-01T01:00:00', 321, 10]
    ]
