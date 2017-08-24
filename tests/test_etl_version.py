import pytest
from django.core.cache import cache

from missioncontrol.etl.versions import (VersionNotFoundError,
                                         _get_buildhub_url,
                                         _get_version_string_cache_key,
                                         get_version_string_from_buildid)


def test_get_buildhub_version_exists(responses):
    (channel, buildid, expected_version) = ('beta', '20170629075044', '55.0b6')
    responses.add(responses.GET, _get_buildhub_url(channel, buildid),
                  json={'data': [{'target': {'version': expected_version}}]})
    cache_key = _get_version_string_cache_key(channel, buildid)
    assert get_version_string_from_buildid(channel, buildid) == expected_version
    assert len(responses.calls) == 1
    assert cache.get(cache_key) == expected_version


def test_get_buildhub_version_does_not_exist(responses):
    (channel, buildid) = ('beta', '20170629075044')
    responses.add(responses.GET, _get_buildhub_url(channel, buildid),
                  json={'data': []})
    cache_key = _get_version_string_cache_key(channel, buildid)
    with pytest.raises(VersionNotFoundError):
        get_version_string_from_buildid(channel, buildid)
    assert len(responses.calls) == 1
    assert cache.get(cache_key) is None
