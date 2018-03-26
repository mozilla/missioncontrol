import _ from 'lodash';
import { stringify } from 'query-string';
import { CHANNEL_PLATFORM_SUMMARY_URL, MEASURE_URL } from './schema';

export const REQUEST_CHANNEL_PLATFORM_SUMMARY_DATA =
  'REQUEST_CHANNEL_PLATFORM_SUMMARY_DATA';
function requestChannelPlatformSummaryData() {
  return {
    type: REQUEST_CHANNEL_PLATFORM_SUMMARY_DATA,
  };
}

export const RECEIVE_CHANNEL_PLATFORM_SUMMARY_DATA =
  'RECEIVE_CHANNEL_PLATFORM_SUMMARY_DATA';
function receiveChannelPlatformSummaryData(data) {
  return {
    type: RECEIVE_CHANNEL_PLATFORM_SUMMARY_DATA,
    summaries: data.summaries,
    receivedAt: Date.now(),
  };
}

export function fetchChannelPlatformSummaryData(params) {
  const searchParamString = _.map(params, (values, paramName) =>
    values.map(value => `${paramName}=${value}`).join('&')
  ).join('&');

  return dispatch => {
    dispatch(requestChannelPlatformSummaryData());

    return fetch(`${CHANNEL_PLATFORM_SUMMARY_URL}?${searchParamString}`)
      .then(response => response.json())
      .then(json => dispatch(receiveChannelPlatformSummaryData(json)));
  };
}

export const REQUEST_MEASURE_DATA = 'REQUEST_MEASURE_DATA';
function requestMeasureData() {
  return {
    type: REQUEST_MEASURE_DATA,
  };
}

export const RECEIVE_MEASURE_DATA = 'RECEIVE_MEASURE_DATA';
function receiveMeasureData(params, data) {
  return {
    type: RECEIVE_MEASURE_DATA,
    channel: params.channel,
    platform: params.platform,
    measure: params.measure,
    data: data ? data.measure_data : undefined,
    receivedAt: Date.now(),
  };
}

export function fetchMeasureData(params) {
  return dispatch => {
    dispatch(requestMeasureData());

    return fetch(`${MEASURE_URL}?${stringify(params)}`)
      .then(response => {
        if (!response.ok) {
          throw Error();
        }

        return response.json();
      })
      .then(json => dispatch(receiveMeasureData(params, json)))
      .catch(() => {
        dispatch(receiveMeasureData(params, {}));
      });
  };
}
