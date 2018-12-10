import { configure, mount } from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import { BrowserRouter as Router } from 'react-router-dom';
import { SubViewComponent } from '../../ui/subview';

configure({ adapter: new Adapter() });

const resolvePromise = Promise.resolve({});
const sampleMeasure = {
  versions: [
    {
      version: '63.0.3',
      fieldDuration: 156000,
      count: 2280274,
      rate: 1.75,
      adjustedCount: 2280274,
      adjustedRate: 1.75,
    },
    {
      version: '63.0.1',
      fieldDuration: 1408500,
      count: 15773585,
      rate: 1.25,
      adjustedCount: 15773585,
      adjustedRate: 1.25,
    },
    {
      version: '63.0',
      fieldDuration: 954000,
      count: 7133231,
      rate: 1.56,
      adjustedCount: 7133231,
      adjustedRate: 1.56,
    },
    {
      version: '63',
      fieldDuration: 2518500,
      count: 26432214,
      rate: 1.25,
      adjustedCount: 26432214,
      adjustedRate: 1.25,
    },
    {
      version: '62',
      fieldDuration: 4148100,
      count: 30932336,
      rate: 1.08,
      adjustedCount: 17006151,
      adjustedRate: 1.13,
    },
    {
      version: '61',
      fieldDuration: 6100800,
      count: 112777330,
      rate: 1.17,
      adjustedCount: 39355015,
      adjustedRate: 1.32,
    },
    {
      version: '60',
      fieldDuration: 4160100,
      count: 27772666,
      rate: 1.13,
      adjustedCount: 14980209,
      adjustedRate: 1.19,
    },
  ],
  lastUpdated: '2018-11-20T15:00:00Z',
};
const componentProps = {
  match: {
    path: '/:channel/:platform',
    url: '/release/android',
    isExact: true,
    params: {
      platform: 'windows',
      channel: 'nightly',
    },
  },
  location: {
    pathname: '/release/android',
    search: '',
    hash: '',
  },
  history: {
    length: 3,
    action: 'PUSH',
    location: {},
    createHref: {},
    push: {},
    replace: {},
    go: {},
    goBack: {},
    goForward: {},
    block: {},
    listen: {},
  },
  exact: true,
  path: '/:channel/:platform',
  fetchChannelPlatformSummaryData: () => resolvePromise,
  versions: ['63.0.2', '63.0', '63', '62', '61', '60'],
  latestReleaseAge: 1650600,
  dispatch: '[function ]',
};

describe('SubView', () => {
  it('should render only crashMeasures table when otherMeasures is empty', () => {
    const mainMeasures = [
      {
        ...sampleMeasure,
        name: 'startup_crashes',
      },
    ];
    const subViewComponentProps = {
      ...componentProps,
      measures: mainMeasures,
    };
    const component = mount(
      <Router>
        <SubViewComponent {...subViewComponentProps} />
      </Router>
    );

    return Promise.resolve(component)
      .then(() => component.update())
      .then(() => {
        expect(component.find('h3').text()).toBe('Crash Measures');
      });
  });

  it('should render only otherMeasures table when crashMeasures is empty', () => {
    const otherMeasures = [
      {
        ...sampleMeasure,
        name: 'browser_shim_usage_blocked',
      },
    ];
    const subViewComponentProps = {
      ...componentProps,
      measures: otherMeasures,
    };
    const component = mount(
      <Router>
        <SubViewComponent {...subViewComponentProps} />
      </Router>
    );

    return Promise.resolve(component)
      .then(() => component.update())
      .then(() => {
        expect(component.find('h3').text()).toBe('Other Measures');
      });
  });
});
