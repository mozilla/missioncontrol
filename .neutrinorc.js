'use strict';

const envs = {
  SERVICE_DOMAIN: 'https://data-missioncontrol.dev.mozaws.net'
};
// Set environment variables to their default values if not defined
Object
  .keys(envs)
  .forEach(env => (typeof(process.env[env]) === 'undefined') && (process.env[env] = envs[env]));

module.exports = {
  options: {
    output: 'dist',
    source: 'frontend'
  },
  use: [
    'neutrino-preset-mozilla-frontend-infra/react',
    ['@neutrinojs/env', Object.keys(envs)],
  ]
};
