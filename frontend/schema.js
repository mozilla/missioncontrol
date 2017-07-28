export const FIREFOX_VERSION_URL = `${process.env.SERVICE_DOMAIN}/api/versions/`;
export const AGGREGATE_DATA_URL = `${process.env.SERVICE_DOMAIN}/api/measures_with_interval/`;

export const CHANNELS = ['esr', 'beta', 'release', 'nightly'];

export const MEASURES = [
  'content_crashes', 'gmplugin_crashes', 'gpu_crashes', 'main_crashes',
  'plugin_crashes', 'content_shutdown_crashes', 'browser_shim_usage_blocked',
  'permissions_sql_corrupted', 'defective_permissions_sql_removed',
  'slow_script_notice_count', 'slow_script_page_count'
];

export const EXPECTED_NUM_DATAPOINTS_PER_OS_CHANNEL = 287;

export const OS_MAPPING = {
  Windows_NT: 'Windows',
  Darwin: 'MacOS X',
  Linux: 'Linux'
};

export const TIME_INTERVALS = [
  { label: 'Last 24 hours', value: 86400 },
  { label: 'Last 48 hours', value: 172800 },
  { label: 'Last 7 days', value: 604800 },
    { label: 'Last 14 days', value: 1209600 }
];

export const DEFAULT_TIME_INTERVAL = 172800;
