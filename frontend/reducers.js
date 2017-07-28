import { combineReducers } from 'redux';
import { REQUEST_VERSION_DATA, RECEIVE_VERSION_DATA,
         REQUEST_CHANNEL_SUMMARY_DATA, RECEIVE_CHANNEL_SUMMARY_DATA,
         REQUEST_MEASURE_DETAIL_DATA, RECEIVE_MEASURE_DETAIL_DATA } from './actions';


function versionInfo(state = {}, action) {
  switch (action.type) {
    case REQUEST_VERSION_DATA:
      return Object.assign({}, state, {
        isFetching: true
      });
    case RECEIVE_VERSION_DATA:
      return Object.assign({}, state, {
        isFetching: false,
        matrix: action.versionData
      });
    default:
      return state;
  }
}

function processAggregates(rawAggregates) {
  return rawAggregates.map(aggregate => ({
    ...aggregate,
    date: new Date(`${aggregate.time}Z`) // HACK: append 'Z' to server-provided result to indicate UTC
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
