import { combineReducers } from 'redux';
import {
  REQUEST_MEASURE_DATA,
  RECEIVE_MEASURE_DATA,
  REQUEST_CHANNEL_PLATFORM_SUMMARY_DATA,
  RECEIVE_CHANNEL_PLATFORM_SUMMARY_DATA,
} from './actions';

function channelPlatformSummary(state = {}, action) {
  switch (action.type) {
    case REQUEST_CHANNEL_PLATFORM_SUMMARY_DATA:
      return Object.assign({}, state, {
        isFetching: true,
      });
    case RECEIVE_CHANNEL_PLATFORM_SUMMARY_DATA:
      return Object.assign({}, state, {
        isFetching: false,
        summaries: action.summaries,
      });
    default:
      return state;
  }
}

function measures(state = {}, action) {
  switch (action.type) {
    case REQUEST_MEASURE_DATA:
      return Object.assign({}, state, {
        isFetching: true,
      });
    case RECEIVE_MEASURE_DATA:
      return Object.assign({}, state, {
        isFetching: false,
        [`${action.platform}-${action.channel}-${action.measure}`]: action.data,
      });
    default:
      return state;
  }
}

const rootReducer = combineReducers({
  channelPlatformSummary,
  measures,
});

export default rootReducer;
