import { configure, shallow } from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import PlatformCard from '../../ui/platformcard';

configure({ adapter: new Adapter() });

describe('PlatformCard', () => {
  it('should display PlatformCard correctly', () => {
    const sampleMeasures = [
        {
          lastUpdated: '2018-12-18T07:40:00Z',
          majorVersions: [
            {
              adjustedCount: 3694128,
              adjustedRate: 0.97,
              count: 3694128,
              fieldDuration: 663300,
              rate: 0.97,
              version: '64',
            },
            {
              adjustedCount: 3638659,
              adjustedRate: 1.61,
              count: 66553946,
              fieldDuration: 4248000,
              rate: 1.15,
              version: '63',
            },
            {
              adjustedCount: 2747677,
              adjustedRate: 1.44,
              count: 30466929,
              fieldDuration: 4148100,
              rate: 1.06,
              version: '62',
            },
            {
              adjustedCount: 2761278,
              adjustedRate: 1.3,
              count: 89205500,
              fieldDuration: 6100800,
              rate: 0.93,
              version: '61',
            },
          ],
          name: 'main_crashes',
          versions: [
            {
              adjustedCount: 3694128,
              adjustedRate: 0.97,
              count: 3694128,
              fieldDuration: 663300,
              rate: 0.97,
              version: '64.0',
            },
            {
              adjustedCount: 3694128,
              adjustedRate: 0.97,
              count: 3694128,
              fieldDuration: 663300,
              rate: 0.97,
              version: '64',
            },
            {
              adjustedCount: 3638659,
              adjustedRate: 1.61,
              count: 66553946,
              fieldDuration: 4248000,
              rate: 1.15,
              version: '63',
            },
            {
              adjustedCount: 2747677,
              adjustedRate: 1.44,
              count: 30466929,
              fieldDuration: 4148100,
              rate: 1.06,
              version: '62',
            },
            {
              adjustedCount: 2761278,
              adjustedRate: 1.3,
              count: 89205500,
              fieldDuration: 6100800,
              rate: 0.93,
              version: '61',
            },
          ],
        },
        {
          lastUpdated: '2018-12-18T07:40:00Z',
          majorVersions: [
            {
              adjustedCount: 5836415,
              adjustedRate: 1,
              count: 5836415,
              fieldDuration: 663300,
              rate: 1.53,
              version: '64',
            },
            {
              adjustedCount: 4163445,
              adjustedRate: 1.84,
              count: 68708257,
              fieldDuration: 4248000,
              rate: 1.19,
              version: '63',
            },
            {
              adjustedCount: 2950592,
              adjustedRate: 1.55,
              count: 30932336,
              fieldDuration: 4148100,
              rate: 1.08,
              version: '62',
            },
            {
              adjustedCount: 3616486,
              adjustedRate: 1.7,
              count: 112777330,
              fieldDuration: 6100800,
              rate: 1.17,
              version: '61',
            }],
            name: 'content_crashes',
            versions: [
              {
                adjustedCount: 5836415,
                adjustedRate: 1.53,
                count: 5836415,
                fieldDuration: 663300,
                rate: 1.53,
                version: '64.0',
              },
              {
                adjustedCount: 5836415,
                adjustedRate: 1.53,
                count: 5836415,
                fieldDuration: 663300,
                rate: 1.53,
                version: '64',
              },
              {
                adjustedCount: 4163445,
                adjustedRate: 1.84,
                count: 68708257,
                fieldDuration: 4248000,
                rate: 1.19,
                version: '63',
              },
              {
                adjustedCount: 2950592,
                adjustedRate: 1.55,
                count: 30932336,
                fieldDuration: 4148100,
                rate: 1.08,
                version: '62',
              },
              {
                adjustedCount: 3616486,
                adjustedRate: 1.7,
                count: 112777330,
                fieldDuration: 6100800,
                rate: 1.17,
                version: '61',
              },
            ],
        },
    ]
    const componentProps = 
      {
        history: {
          length: 2,
          action: 'POP',
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
        summary: {
          application: 'firefox',
          expectedMeasures: {},
          latestVersionSeen: '64.0',
          latestVersionFieldDuration: 659700,
          channel: 'release',
          platform: 'windows',
          summaryRate: '2.51',
        },
      }
      const platformCardComponentProps = {
        ...componentProps,
        measures: sampleMeasures,
      };
    const component = shallow(<PlatformCard 
      summary={platformCardComponentProps}
      />);

    expect(component).toMatchSnapshot();
  });
});
