import _ from 'lodash';
import { combineReducers } from 'redux';
import { REQUEST_VERSION_DATA, RECEIVE_VERSION_DATA, REQUEST_CRASH_DATA, RECEIVE_CRASH_DATA } from './actions';
import { CHANNELS, CRASH_TYPES, EXPECTED_NUM_DATAPOINTS_PER_OS_CHANNEL, OS_MAPPING } from './schema';

function getMajorVersion(verString) {
  return parseInt(verString.split('.')[0], 10);
}

function processVersionMatrix(rawVersionMatrix) {
  return {
    beta: getMajorVersion(rawVersionMatrix.LATEST_FIREFOX_DEVEL_VERSION),
    esr: getMajorVersion(rawVersionMatrix.FIREFOX_ESR),
    nightly: getMajorVersion(rawVersionMatrix.FIREFOX_NIGHTLY),
    release: getMajorVersion(rawVersionMatrix.LATEST_FIREFOX_VERSION)
  };
}

function versionInfo(state = {}, action) {
  switch (action.type) {
    case REQUEST_VERSION_DATA:
      return Object.assign({}, state, {
        isFetching: true
      });
    case RECEIVE_VERSION_DATA:
      return Object.assign({}, state, {
        isFetching: false,
        matrix: processVersionMatrix(action.versionData)
      });
    default:
      return state;
  }
}

function processCrashRows(crashRows, versionMatrix) {
  const crashes = {};

  crashRows.forEach((row) => {
    const osname = OS_MAPPING[row.os_name];
    const channel = row.channel;
    const version = row.version;

    // ignore older versions (more than one before current)
    if (getMajorVersion(version) < (versionMatrix[channel] - 1) ||
        getMajorVersion(version) > versionMatrix[channel]) {
      return;
    }

    if (!crashes[osname]) {
      crashes[osname] = {};
    }
    if (!crashes[osname][channel]) {
      crashes[osname][channel] = {
        data: {}
      };
    }
    if (!crashes[osname][channel].data[version]) {
      crashes[osname][channel].data[version] = [];
    }

    const crashSummary = {
      usage_khours: (row.usage_hours / 1000.0),
      date: new Date(row.start)
    };
    CRASH_TYPES.forEach((crashType) => {
      crashSummary[`crash-${crashType}`] = row[crashType];
    });

    crashes[osname][channel].data[version].push(crashSummary);
  });

  // we should have at least one version with EXPECTED_NUM_DATAPOINTS --
  // if there is no data, or some missing, note that
  _.forEach(crashes, (os, osname) => {
    CHANNELS.forEach((channelName) => {
      if (!os[channelName]) {
        crashes[osname][channelName] = {
          status: 'warning',
          insufficientData: [{
            measure: 'crash',
            expected: EXPECTED_NUM_DATAPOINTS_PER_OS_CHANNEL,
            current: 0
          }]
        };
      } else {
        const channel = crashes[osname][channelName];
        const numDataPoints = _.max(_.map(channel.data, data => data.length));
        if (numDataPoints < EXPECTED_NUM_DATAPOINTS_PER_OS_CHANNEL) {
          crashes[osname][channelName] = {
            ...channel,
            status: 'warning',
            insufficientData: [{
              measure: 'crash-main',
              expected: EXPECTED_NUM_DATAPOINTS_PER_OS_CHANNEL,
              current: numDataPoints
            }]
          };
        } else {
          crashes[osname][channelName] = {
            ...channel,
            status: 'success',
            passingMeasures: 1
          };
        }
      }
    });
  });

  return crashes;
}

function crashData(state = {}, action) {
  switch (action.type) {
    case REQUEST_CRASH_DATA:
      return Object.assign({}, state, {
        isFetching: true
      });
    case RECEIVE_CRASH_DATA:
      return Object.assign({}, state, {
        isFetching: false,
        channels: processCrashRows(action.crashRows, action.versionMatrix)
      });
    default:
      return state;
  }
}

const rootReducer = combineReducers({
  versionInfo,
  crashData
});

export default rootReducer;
