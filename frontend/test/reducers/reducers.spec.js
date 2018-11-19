import rootReducer from '../../reducers';
import {
  REQUEST_CHANNEL_PLATFORM_SUMMARY_DATA,
  RECEIVE_CHANNEL_PLATFORM_SUMMARY_DATA,
  REQUEST_MEASURE_DATA,
  RECEIVE_MEASURE_DATA,
} from '../../actions';

describe('channelPlatformSummary reducer', () => {
  it('Requests channel platform summary data', () => {
    const initialState = {};
    const action = { type: REQUEST_CHANNEL_PLATFORM_SUMMARY_DATA };
    const expectedState = {
      channelPlatformSummary: { isFetching: true },
      measures: {},
    };
    const receivedState = rootReducer(initialState, action);

    expect(expectedState).toEqual(receivedState);
  });

  it('Receives channel platform summary data', () => {
    const initialState = {};
    const action = {
      type: RECEIVE_CHANNEL_PLATFORM_SUMMARY_DATA,
      summaries: {},
    };
    const expectedState = {
      channelPlatformSummary: {
        isFetching: false,
        summaries: action.summaries,
      },
      measures: {},
    };
    const receivedState = rootReducer(initialState, action);

    expect(expectedState).toEqual(receivedState);
  });
});

describe('measures reducer', () => {
  it('Requests measure data', () => {
    const initialState = {};
    const action = { type: REQUEST_MEASURE_DATA };
    const expectedState = {
      channelPlatformSummary: {},
      measures: { isFetching: true },
    };
    const receivedState = rootReducer(initialState, action);

    expect(expectedState).toEqual(receivedState);
  });

  it('Recieves measure data', () => {
    const initialState = {
      channelPlatformSummary: {},
      measures: {
        isFetching: true,
      },
    };
    const action = {
      type: RECEIVE_MEASURE_DATA,
      platform: 'windows',
      channel: 'nightly',
      measure: 'measure',
      data: {},
    };
    const expectedState = {
      channelPlatformSummary: {},
      measures: {
        isFetching: false,
        [`${action.platform}-${action.channel}-${action.measure}`]: action.data,
      },
    };
    const receivedState = rootReducer(initialState, action);

    expect(expectedState).toEqual(receivedState);
  });
});
