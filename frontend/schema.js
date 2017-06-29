export const FIREFOX_VERSION_URL = 'https://storage.googleapis.com/missioncontrol-prototyping/firefox_versions.json';
export const CRASH_DATA_URL = 'https://storage.googleapis.com/missioncontrol-prototyping/redash.json';

export const CHANNELS = ['esr', 'beta', 'release', 'nightly'];

export const CRASH_TYPES = ['content', 'gmplugin', 'gpu', 'main', 'plugin'];

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
