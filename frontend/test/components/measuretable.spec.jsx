import { shallow, configure } from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import MeasureTable from '../../ui/measuretable';

configure({ adapter: new Adapter() });
describe('MeasureTable', () => {
  it('should render the measures table correctly', () => {
    const sampleMeasures = [
      {
        name: 'content_crashes',
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
      },
    ];
    const sampleVersions = ['63.0.3', '63.0.1', '63.0', '63', '62', '61', '60'];
    const sampleSubViewState = {};
    const component = shallow(
      <MeasureTable
        title="Crash Measures"
        measures={sampleMeasures}
        versions={sampleVersions}
        subviewState={sampleSubViewState}
      />
    );

    expect(component).toMatchSnapshot();
  });
});
