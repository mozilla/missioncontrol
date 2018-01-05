import datetime
import time

import pytest
from django.core.cache import cache
from django.core.urlresolvers import reverse
from freezegun import freeze_time

from missioncontrol.etl.measuresummary import get_measure_summary
from missioncontrol.etl.schema import get_measure_summary_cache_key
from missioncontrol.base.models import (Channel,
                                        Platform)


def test_get_channel_platform_summary(client, monkeypatch, initial_data):
    resp = client.get(reverse('channel-platform-summary'))
    assert resp.status_code == 200
    # no measures because no data
    assert resp.json() == {
        'summaries': [
            {'channel': channel_name, 'measures': [], 'platform': platform_name}
            for channel_name in Channel.objects.values_list('name', flat=True)
            for platform_name in Platform.objects.values_list('name', flat=True)
        ]
    }


@freeze_time('2017-07-01 13:00')
def test_measure_summary_incorporated(client, monkeypatch, prepopulated_version_cache,
                                      fake_measure_data):
    # create a summary from the fake data we added, verify it's there
    cache.set(get_measure_summary_cache_key('linux', 'release', 'main_crashes'),
              get_measure_summary('linux', 'release', 'main_crashes'),
              None)
    resp = client.get(reverse('channel-platform-summary'), {
        'platform': 'linux',
        'channel': 'release',
        'measure': 'main_crashes'
    })
    assert resp.status_code == 200
    assert resp.json() == {
        'summaries': [
            {
                'channel': 'release',
                'platform': 'linux',
                'measures': [
                    {
                        'lastUpdated': '2017-07-01T12:00:00Z',
                        'latest': {
                            'median': 625.0,
                            'usageHours': 56.0,
                            'version': '55.0.1'
                        },
                        'name': 'main_crashes',
                        'previous': {
                            'median': 625.0,
                            'usageHours': 56.0,
                            'version': None
                        }
                    }
                ]
            }
        ]
    }


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
def test_get_measure(fake_measure_data, client):
    (platform, channel, measure) = ('linux', 'release', 'main_crashes')

    # long interval should return all our test data in expected format
    resp = client.get(reverse('measure'), {
        'platform': platform,
        'channel': channel,
        'measure': measure,
        'interval': 86400
    })
    assert resp.json()['measure_data'] == {
        '20170620075044': {
            'data': [
                ['2017-07-01T11:50:00Z', 100.0, 20.0],
                ['2017-07-01T11:55:00Z', 10.0, 16.0],
                ['2017-07-01T12:00:00Z', 10.0, 20.0]
            ],
            'version': '55.0.1'
        },
        '20170629075044': {
            'data': [
                ['2017-07-01T11:50:00Z', 100.0, 20.0],
                ['2017-07-01T11:55:00Z', 10.0, 16.0],
                ['2017-07-01T12:00:00Z', 10.0, 20.0]
            ],
            'version': '55.0'
        }
    }

    # if we specify a shorter interval, should only get data within
    # present time - interval
    resp = client.get(reverse('measure'), {
        'platform': platform,
        'channel': channel,
        'measure': measure,
        'interval': 64*60
    })
    assert resp.json()['measure_data'] == {
        '20170620075044': {
            'data': [
                ['2017-07-01T12:00:00Z', 10.0, 20.0]
            ],
            'version': '55.0.1'
        },
        '20170629075044': {
            'data': [
                ['2017-07-01T12:00:00Z', 10.0, 20.0]
            ],
            'version': '55.0'
        }
    }

    # also make sure that start time + interval filters as expected
    resp = client.get(reverse('measure'), {
        'platform': platform,
        'channel': channel,
        'measure': measure,
        'start': int(time.mktime(
            (datetime.datetime.now() - datetime.timedelta(minutes=66)).timetuple())),
        'interval': 86400
    })
    assert resp.json()['measure_data'] == {
        '20170620075044': {
            'data': [
                ['2017-07-01T11:55:00Z', 10.0, 16.0],
                ['2017-07-01T12:00:00Z', 10.0, 20.0]
            ],
            'version': '55.0.1'
        },
        '20170629075044': {
            'data': [
                ['2017-07-01T11:55:00Z', 10.0, 16.0],
                ['2017-07-01T12:00:00Z', 10.0, 20.0]
            ],
            'version': '55.0'
        }
    }


@pytest.mark.parametrize('interval', [86400, 300, 0])
@freeze_time('2017-07-01 13:00')
def test_compare(fake_measure_data_offset, client, interval):
    (platform, channel, measure) = ('linux', 'release', 'main_crashes')

    resp = client.get(reverse('measure'), {
        'platform': platform,
        'channel': channel,
        'measure': measure,
        'interval': interval,
        'relative': 1
    })
    # despite the samples being captured at different times, they should
    # return the same relative value for compare
    expected_data = [
        datum for datum in
        [[0, 100.0, 20.0],
         [300, 10.0, 16.0],
         [600, 10.0, 20.0]] if not interval or datum[0] <= interval
    ]
    assert resp.json()['measure_data'] == {
        '20170620075044': {
            'data': expected_data,
            'version': '55.0.1'
        },
        '20170629075044': {
            'data': expected_data,
            'version': '55.0'
        }
    }
