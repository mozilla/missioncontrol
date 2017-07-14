import _ from 'lodash';
import { FIREFOX_VERSION_URL, AGGREGATE_DATA_URL } from './schema';


export const REQUEST_VERSION_DATA = 'REQUEST_VERSION_DATA';
function requestVersionData() {
  return {
    type: REQUEST_VERSION_DATA
  };
}

export const RECEIVE_VERSION_DATA = 'RECEIVE_VERSION_DATA';
function receiveVersionData(data) {
  return {
    type: RECEIVE_VERSION_DATA,
    versionData: data,
    receivedAt: Date.now()
  };
}

export function fetchVersionData() {
  return (dispatch) => {
    dispatch(requestVersionData());

    return fetch(FIREFOX_VERSION_URL)
      .then(response => response.json())
      .then(json => dispatch(receiveVersionData(json)));
  };
}

export const REQUEST_CHANNEL_SUMMARY_DATA = 'REQUEST_CHANNEL_SUMMARY_DATA';
function requestChannelSummaryData() {
  return {
    type: REQUEST_CHANNEL_SUMMARY_DATA
  };
}

export const RECEIVE_CHANNEL_SUMMARY_DATA = 'RECEIVE_CHANNEL_SUMMARY_DATA';
function receiveChannelSummaryData(data) {
  return {
    type: RECEIVE_CHANNEL_SUMMARY_DATA,
    data,
    receivedAt: Date.now()
  };
}

export const REQUEST_MEASURE_DETAIL_DATA = 'REQUEST_MEASURE_DETAIL_DATA';
function requestMeasureDetailData() {
  return {
    type: REQUEST_MEASURE_DETAIL_DATA
  };
}

export const RECEIVE_MEASURE_DETAIL_DATA = 'RECEIVE_MEASURE_DETAIL_DATA';
function receiveMeasureDetailData(data) {
  return {
    type: RECEIVE_MEASURE_DETAIL_DATA,
    data,
    receivedAt: Date.now()
  };
}

function getAggregateData(params, dispatch, receiver) {
  const searchParamString = _.map(params, (values, paramName) =>
    values.map(value => `${paramName}=${value}`).join('&')).join('&');

  return fetch(`${AGGREGATE_DATA_URL}?${searchParamString}`)
    .then(response => response.json())
    .then(json => dispatch(
      receiver(
        json.rows.map(
          row => _.zipObject(json.columns, row)
        ))));
}

export function fetchChannelSummaryData(params) {
  return (dispatch) => {
    dispatch(requestChannelSummaryData());
    return getAggregateData(params, dispatch, receiveChannelSummaryData);
  };
}

export function fetchMeasureDetailData(params) {
  return (dispatch) => {
    dispatch(requestMeasureDetailData());
    return getAggregateData(params, dispatch, receiveMeasureDetailData);
  };
}
