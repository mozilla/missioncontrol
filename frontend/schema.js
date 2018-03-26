import firefoxIcon from './images/firefox.png';
import betaIcon from './images/firefox-beta.png';
import nightlyIcon from './images/firefox-nightly.png';

export const CHANNEL_PLATFORM_SUMMARY_URL = `${process.env.SERVICE_DOMAIN}/api/channel-platform-summary/`;
export const MEASURE_URL = `${process.env.SERVICE_DOMAIN}/api/measure/`;
export const ERROR_AGGREGATES_URL = 'https://docs.telemetry.mozilla.org/datasets/streaming/error_aggregates/reference.html';

export const TIME_INTERVALS = [
  { label: 'Last 24 hours', interval: 86400 },
  { label: 'Last 48 hours', interval: 172800 },
  { label: 'Last 7 days', interval: 604800 },
  { label: 'Last 14 days', interval: 1209600 }
];

export const TIME_INTERVALS_RELATIVE = [
  { label: 'Up to last datapoint', interval: 0 },
  { label: 'Up to 14 days after release', interval: 1209600 },
  { label: 'Up to 7 days after release', interval: 604800 },
  { label: 'Up to 48 hours after release', interval: 172800 },
  { label: 'Up to 24 hours after release', interval: 86400 }
];

export const PERCENTILES = [
  { label: 'All values', value: 100 },
  { label: '99th percentile', value: 99 },
  { label: '95th percentile', value: 95 },
  { label: '75th percentile', value: 75 },
  { label: '50th percentile', value: 50 }
];

export const DEFAULT_TIME_INTERVAL = 172800;
export const DEFAULT_TIME_INTERVAL_RELATIVE = 0;
export const DEFAULT_PERCENTILE = 99;
export const DEFAULT_VERSION_GROUPING_TYPE = 'version';

export const KEY_MEASURES = [
  'content_crashes', 'main_crashes', 'content_shutdown_crashes'
];

export const CHANNEL_ICON_MAPPING = {
  beta: betaIcon,
  esr: firefoxIcon,
  nightly: nightlyIcon,
  release: firefoxIcon
};

export const CRASH_STATS_MAPPING = {
  content_crashes: {
    processType: 'content'
  },
  gmplugin_crashes: {
    processType: 'plugin'
  },
  main_crashes: {
    processType: 'browser'
  },
  plugin_crashes: {
    processType: 'plugin'
  },
  content_shutdown_crashes: {
    processType: 'content',
    extraParams: {
      ipc_channel_error: 'ShutDownKill'
    }
  }
};
