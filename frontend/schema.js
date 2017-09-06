export const CHANNEL_PLATFORM_SUMMARY_URL = `${process.env.SERVICE_DOMAIN}/api/channel-platform-summary/`;
export const MEASURE_URL = `${process.env.SERVICE_DOMAIN}/api/measure/`;

export const TIME_INTERVALS = [
  { label: 'Last 24 hours', interval: 86400 },
  { label: 'Last 48 hours', interval: 172800 },
  { label: 'Last 7 days', interval: 604800 },
  { label: 'Last 14 days', interval: 1209600 }
];

export const DEFAULT_TIME_INTERVAL = 172800;
