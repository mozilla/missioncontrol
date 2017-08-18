from datetime import timedelta

TELEMETRY_PLATFORM_MAPPING = {
    'windows': 'Windows_NT',
    'mac': 'Darwin',
    'linux': 'Linux'
}

CHANNELS = {
    'release': {
        'update_interval': timedelta(weeks=8)
    },
    'beta': {
        'update_interval': timedelta(weeks=2)
    },
    'esr': {
        'update_interval': timedelta(weeks=8)
    },
    'nightly': {
        'update_interval': timedelta(days=3)
    }
}

CRASH_MEASURES = [
    'content_crashes',
    'gmplugin_crashes',
    'main_crashes',
    'plugin_crashes',
    'content_shutdown_crashes'
]

QUALITY_MEASURES = [
    'browser_shim_usage_blocked',
    'permissions_sql_corrupted',
    'defective_permissions_sql_removed',
    'slow_script_notice_count',
    'slow_script_page_count'
]


PLATFORMS = {
    'linux': {
        'measures': CRASH_MEASURES + QUALITY_MEASURES
    },
    'windows': {
        'measures': CRASH_MEASURES + ['gpu_crashes'] + QUALITY_MEASURES
    },
    'mac': {
        'measures': CRASH_MEASURES + QUALITY_MEASURES
    }
}


def get_measure_cache_key(platform_name, channel_name, measure_name):
    return ':'.join(map(lambda s: s.lower(), [platform_name, channel_name, measure_name]))
