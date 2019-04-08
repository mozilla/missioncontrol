import aiohttp
import asyncio
import datetime
import json

from django.db import transaction
from django.db.utils import IntegrityError
from django.utils import timezone

from missioncontrol.base.models import (Application, Build, Channel, Platform)
from missioncontrol.settings import BUILDHUB_URL


async def _fetch_platforms(session, application):
    query = {
      "aggs": {
        "platforms": {
          "terms": {
            "field": "target.platform",
            "size": 100,
          }
        }
      },
      "query": {
        "bool": {
          "filter": [{
            "term": {
              "source.product": application.name
            }
          }]
        }
      },
      "size": 0,
    }
    async with session.post(BUILDHUB_URL, data=json.dumps(query)) as response:
        data = await response.json()
    aggs = data['aggregations']['platforms']['buckets']
    platforms = [r['key'] for r in aggs]
    return platforms


async def _fetch_version_data(session, buildhub_platform_name, application,
                              platform, channel):
    min_buildid_timestamp = timezone.now() - datetime.timedelta(days=180)
    newest_build_id = Build.objects.filter(
        application=application, platform=platform, channel=channel
    ).values_list('build_id', flat=True).order_by('-build_id').first()
    if newest_build_id:
        # we will look at build ids up to a week old, in case buildhub is (very) slow to update
        min_buildid_timestamp = max(min_buildid_timestamp,
                                    datetime.datetime.strptime(newest_build_id[:8] + '+0000',
                                                               '%Y%m%d%z') -
                                    datetime.timedelta(days=7))
    query = {
      "aggs": {
        "buildid": {
          "terms": {
              "field": "build.id",
              "size": 100000,
              "order": {
                  "_term": "desc"
              }
          },
          "aggs": {
              "version": {
                  "terms": {
                      "field": "target.version"
                  }
              }
          }
        }
      },
      "query": {
        "bool": {
          "filter": [{
            "term": {
              "target.platform": buildhub_platform_name
            }
          }, {
            "term": {
              "target.channel": channel.name
            }
          }, {
            "term": {
              "source.product": application.name
            }
          }, {
              "range": {
                  "build.id": {"gte": min_buildid_timestamp.strftime('%Y%m%d')}
              }
          }
          ]
        }
      },
      "size": 0,
    }
    async with session.post(BUILDHUB_URL, data=json.dumps(query)) as response:
        data = await response.json()
    aggs = data['aggregations']['buildid']['buckets']
    for r in aggs:
        for version_record in r['version']['buckets']:
            try:
                with transaction.atomic():
                    Build.objects.create(application=application, platform=platform,
                                         channel=channel, build_id=r['key'],
                                         version=version_record['key'])
            except IntegrityError:
                # already exists
                pass


async def _fetch_build_data(loop, application, channels):
    async with aiohttp.ClientSession(loop=loop) as session:
        # Fetch known platforms and channels.
        buildhub_platform_names = await _fetch_platforms(session, application)
        for channel in channels:
            for buildhub_platform_name in buildhub_platform_names:
                platform = Platform.objects.filter(
                    name__startswith=buildhub_platform_name[:3]).first()
                # Query platforms buildids for every channel in parallel.
                futures = [_fetch_version_data(session, buildhub_platform_name,
                                               application, platform, channel)
                           for channel in channels]
                await asyncio.gather(*futures)


def update_builds():
    loop = asyncio.get_event_loop()
    channels = Channel.objects.all()
    for application in Application.objects.all():
        loop.run_until_complete(_fetch_build_data(loop, application, channels))
