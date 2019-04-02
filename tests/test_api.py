import datetime
import time

import pytest
from django.core.cache import cache
from django.urls import reverse
from freezegun import freeze_time

from missioncontrol.etl.measuresummary import (get_measure_summary,
                                               get_measure_summary_cache_key)
from missioncontrol.base.models import (Application,
                                        Channel,
                                        Measure,
                                        Platform)


def test_get_channel_platform_summary_no_data(client, monkeypatch,
                                              initial_data):
    resp = client.get(reverse('channel-platform-summary'))
    assert resp.status_code == 200
    # no measures because no data
    expected_summaries = []
    for application_name in Application.objects.values_list('name', flat=True):
        for channel_name in Channel.objects.values_list('name', flat=True):
            for platform_name in Platform.objects.values_list('name', flat=True):
                expected_measures = Measure.objects.filter(
                    channels__name=channel_name,
                    application__name=application_name,
                    platform__name=platform_name)
                if expected_measures.exists():
                    expected_summaries.append({
                        'application': application_name,
                        'channel': channel_name,
                        'platform': platform_name,
                        'latestVersionSeen': None,
                        'latestVersionFieldDuration': None,
                        'expectedMeasures': list(
                            expected_measures.values_list('name', flat=True)),
                        'measures': []
                    })
    assert resp.json() == {
        'summaries': expected_summaries
    }


@freeze_time('2017-07-01 13:00')
def test_measure_summary_incorporated(client, monkeypatch, prepopulated_version_cache,
                                      fake_measure_data):
    # create a summary from the fake data we added, verify it's there
    cache.set(get_measure_summary_cache_key('firefox', 'linux', 'release', 'main_crashes'),
              get_measure_summary('firefox', 'linux', 'release', 'main_crashes'),
              None)
    resp = client.get(reverse('channel-platform-summary'), {
        'platform': 'linux',
        'channel': 'release'
    })
    assert resp.status_code == 200
    assert resp.json() == {
        'summaries': [
            {
                'application': 'firefox',
                'channel': 'release',
                'platform': 'linux',
                'latestVersionFieldDuration': 600,
                'latestVersionSeen': '55.0.1',
                'expectedMeasures': list(Measure.objects.filter(
                    channels__name='release',
                    application__name='firefox',
                    platform__name='linux').values_list('name', flat=True)),
                'measures': [
                    {
                        'name': 'main_crashes',
                        'lastUpdated': '2017-07-01T12:00:00Z',
                        'versions': [
                            {
                                'adjustedCount': 120,
                                'adjustedRate': 2142.86,
                                'count': 120,
                                'fieldDuration': 600,
                                'rate': 2142.86,
                                'version': '55.0.1'
                            },
                            {
                                'adjustedCount': 240,
                                'adjustedRate': 2142.86,
                                'count': 240,
                                'fieldDuration': 600,
                                'rate': 2142.86,
                                'version': '55'
                            }
                        ]
                    }
                ]
            }
        ]
    }
    # verify that the measure / summary disappears when we disable it
    Measure.objects.all().update(enabled=False)
    resp = client.get(reverse('channel-platform-summary'), {
        'platform': 'linux',
        'channel': 'release'
    })
    assert resp.status_code == 200
    assert resp.json() == {
        'summaries': []
    }


@pytest.mark.parametrize('missing_param', ['platform', 'channel', 'measure', 'interval'])
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

    # make sure that if we specify a specific version, we only get that one
    resp = client.get(reverse('measure'), {
        'platform': platform,
        'channel': channel,
        'measure': measure,
        'start': int(time.mktime(
            (datetime.datetime.now() - datetime.timedelta(minutes=66)).timetuple())),
        'interval': 86400,
        'version': '55.0'
    })
    assert resp.json()['measure_data'] == {
        '20170629075044': {
            'data': [
                ['2017-07-01T11:55:00Z', 10.0, 16.0],
                ['2017-07-01T12:00:00Z', 10.0, 20.0]
            ],
            'version': '55.0'
        }
    }

    # make sure that if we specify both versions, we get both
    resp = client.get(reverse('measure'), {
        'platform': platform,
        'channel': channel,
        'measure': measure,
        'start': int(time.mktime(
            (datetime.datetime.now() - datetime.timedelta(minutes=66)).timetuple())),
        'interval': 86400,
        'version': ['55.0', '55.0.1']
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
@pytest.mark.parametrize('start', [None, 0, 250, 301])
@freeze_time('2017-07-01 13:00')
def test_compare(fake_measure_data_offset, client, interval, start):
    (platform, channel, measure) = ('linux', 'release', 'main_crashes')

    params = {
        'platform': platform,
        'channel': channel,
        'measure': measure,
        'interval': interval,
        'relative': 1
    }
    if start is not None:
        params.update({'start': start})
    resp = client.get(reverse('measure'), params)
    # despite the samples being captured at different times, they should
    # return the same relative value for compare
    min_time = start or 0
    expected_data = [
        datum for datum in
        [[0, 100.0, 20.0],
         [300, 10.0, 16.0],
         [600, 10.0, 20.0]] if datum[0] >= min_time and
        (not interval or datum[0] <= (min_time + interval))
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


@freeze_time('2017-07-01 13:00')
def test_compare_version(fake_measure_data_offset, client):
    (platform, channel, measure) = ('linux', 'release', 'main_crashes')

    resp = client.get(reverse('measure'), {
        'platform': platform,
        'channel': channel,
        'measure': measure,
        'interval': 86400,
        'relative': 1,
        'version': '55.0'
    })

    # should only get the information for 55.0, since that's all we asked for
    assert resp.json()['measure_data'] == {
        '20170629075044': {
            'data': [[0, 100.0, 20.0],
                     [300, 10.0, 16.0],
                     [600, 10.0, 20.0]],
            'version': '55.0'
        }
    }
