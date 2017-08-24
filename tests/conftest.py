import pytest
import responses as responses_


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
