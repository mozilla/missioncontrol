import requests
from django.core.cache import cache

from missioncontrol.settings import (BUILD_HUB_URL,
                                     FIREFOX_VERSION_CACHE_TIMEOUT,
                                     FIREFOX_VERSION_URL)


class VersionNotFoundError(Exception):
    pass


def get_firefox_versions():
    firefox_versions = cache.get('firefox_versions')
    if firefox_versions:
        return firefox_versions

    # map the version api's to telemetry channel names
    r = requests.get(FIREFOX_VERSION_URL)
    firefox_versions = r.json()
    mapped_versions = {
        'nightly': firefox_versions['FIREFOX_NIGHTLY'],
        'esr': firefox_versions['FIREFOX_ESR'],
        'beta': firefox_versions['LATEST_FIREFOX_DEVEL_VERSION'],
        'release': firefox_versions['LATEST_FIREFOX_VERSION']
    }
    cache.set('firefox_versions', mapped_versions, FIREFOX_VERSION_CACHE_TIMEOUT)

    return mapped_versions


def get_current_firefox_version(channel_name):
    return get_firefox_versions()[channel_name]


def _get_buildhub_url(channel, buildid):
    return '{base_url}?_limit=1&build.id=%22{buildid}%22&' \
        'target.channel={channel}&source.product=firefox'.format(
            base_url=BUILD_HUB_URL, buildid=buildid, channel=channel)


def _get_version_string_cache_key(channel, buildid):
    return '-'.join([channel, buildid])


def get_version_string_from_buildid(channel, buildid):
    '''
    Utility function for getting a human-readable version string based
    on a buildid and channel. Generally only needed for beta (where
    the version doesn't specify the beta number)
    '''
    cache_key = _get_version_string_cache_key(channel, buildid)
    version = cache.get(cache_key)
    if version is None:
        r = requests.get(_get_buildhub_url(channel, buildid))
        data = r.json()
        if not data.get('data'):
            raise VersionNotFoundError(
                'No version for channel {channel} / buildid {buildid}'.format(
                    channel=channel, buildid=buildid))
        version = data['data'][0]['target']['version']
        cache.set(cache_key, version)
    return version
