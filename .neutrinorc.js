module.exports = {
  options: {
    output: 'dist',
    source: 'frontend'
  },
  use: [
    'neutrino-preset-mozilla-rpweb',
    'neutrino-preset-jest'
  ]
};
