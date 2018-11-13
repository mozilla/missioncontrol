import rootReducer from '../../reducers';
import { REQUEST_CHANNEL_PLATFORM_SUMMARY_DATA } from '../../actions';

describe('channelPlatformSummary reducer', () => {
    it('Requests channel platform summary data', () => {
        const initialState = { };
        const action = { type:REQUEST_CHANNEL_PLATFORM_SUMMARY_DATA  };
        const expectedState = { channelPlatformSummary: { isFetching: true },
                             measures: {} }
        const receivedState = rootReducer(initialState, action)
        expect(expectedState).toEqual(receivedState);
    });
});