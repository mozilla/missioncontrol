def pytest_runtest_setup(item):
    """
    Per-test setup.
    """
    # Clear cache between tests
    from django.core.cache import cache
    cache.clear()
