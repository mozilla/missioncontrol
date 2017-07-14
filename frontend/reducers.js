import { combineReducers } from 'redux';
import { REQUEST_VERSION_DATA, RECEIVE_VERSION_DATA,
         REQUEST_CHANNEL_SUMMARY_DATA, RECEIVE_CHANNEL_SUMMARY_DATA,
         REQUEST_MEASURE_DETAIL_DATA, RECEIVE_MEASURE_DETAIL_DATA } from './actions';
import { getMajorVersion } from './version';

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

function processAggregates(rawAggregates) {
  return rawAggregates.map(aggregate => ({
    ...aggregate,
    date: new Date(aggregate.time)
  }));
}

function channelSummary(state = {}, action) {
  switch (action.type) {
    case REQUEST_CHANNEL_SUMMARY_DATA:
      return Object.assign({}, state, {
        isFetching: true
      });
    case RECEIVE_CHANNEL_SUMMARY_DATA:
      return Object.assign({}, state, {
        isFetching: false,
        data: processAggregates(action.data)
      });
    default:
      return state;
  }
}

function measureDetail(state = {}, action) {
  switch (action.type) {
    case REQUEST_MEASURE_DETAIL_DATA:
      return Object.assign({}, state, {
        isFetching: true
      });
    case RECEIVE_MEASURE_DETAIL_DATA:
      return Object.assign({}, state, {
        isFetching: false,
        data: processAggregates(action.data)
      });
    default:
      return state;
  }
}

const rootReducer = combineReducers({
  versionInfo,
  channelSummary,
  measureDetail
});

export default rootReducer;
