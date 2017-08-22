def pytest_runtest_setup(item):
    """
    Per-test setup.
    - Provide cache isolation incrementing the cache key prefix
    """
    increment_cache_key_prefix()


def increment_cache_key_prefix():
    """Increment a cache prefix to effectively clear the cache."""
    from django.core.cache import cache
    cache.key_prefix = ""
    prefix_counter_cache_key = "mc-tests-key-prefix-counter"
    try:
        key_prefix_counter = cache.incr(prefix_counter_cache_key)
    except ValueError:
        key_prefix_counter = 0
        cache.set(prefix_counter_cache_key, key_prefix_counter)
    cache.key_prefix = "m{0}".format(key_prefix_counter)
