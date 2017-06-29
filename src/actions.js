import { FIREFOX_VERSION_URL, CRASH_DATA_URL } from './schema';


export const REQUEST_VERSION_DATA = 'REQUEST_VERSION_DATA';
function requestVersionData() {
  return {
    type: REQUEST_VERSION_DATA
  };
}

export const RECEIVE_VERSION_DATA = 'RECEIVE_VERSION_DATA';
function receiveVersionData(json) {
  return {
    type: RECEIVE_VERSION_DATA,
    versionData: json,
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

export const REQUEST_CRASH_DATA = 'REQUEST_CRASH_DATA';
function requestCrashData() {
  return {
    type: REQUEST_CRASH_DATA
  };
}

export const RECEIVE_CRASH_DATA = 'RECEIVE_CRASH_DATA';
function receiveCrashData(crashRows, versionMatrix) {
  return {
    type: RECEIVE_CRASH_DATA,
    crashRows,
    versionMatrix,
    receivedAt: Date.now()
  };
}

export function fetchCrashData(versionMatrix) {
  return (dispatch) => {
    dispatch(requestCrashData());

    return fetch(CRASH_DATA_URL)
      .then(response => response.json())
      .then(json => dispatch(receiveCrashData(json.query_result.data.rows, versionMatrix)));
  };
}
