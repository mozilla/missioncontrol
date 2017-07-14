import React from 'react';
import _ from 'lodash';
import { Card, CardBlock, CardColumns, CardHeader, Row } from 'reactstrap';
import { Helmet } from 'react-helmet';
import { connect } from 'react-redux';
import MeasureGraph from './measuregraph.jsx';
import SubViewNav from './subviewnav.jsx';
import { DEFAULT_TIME_INTERVAL, MEASURES, OS_MAPPING } from '../schema';

const mapStateToProps = (state) => {
  // const channel = ownProps.match.params.channel;
  // const platform = ownProps.match.params.platform;

  // if present, summarize crash data across versions per crash type
  if (state.channelSummary && state.channelSummary.data && state.channelSummary.data.length) {
    const aggregatedDataMap = {};
    MEASURES.forEach((measure) => {
      aggregatedDataMap[measure] = {};
      state.channelSummary.data.forEach((datum) => {
        aggregatedDataMap[measure][datum.date] = {
          date: datum.date,
          value: 0
        };
        if (datum[measure]) {
          aggregatedDataMap[measure][datum.date].value += datum[measure];
        }
      });
    });
    return {
      summary: _.reduce(aggregatedDataMap, (measures, data, measure) => ({
        ...measures,
        [measure]: {
          status: 'success',
          seriesList: [{
            name: 'aggregate',
            data: _.values(data).sort((a, b) => a.date > b.date)
          }]
        }
      }), {})
    };
  }

  return { summary: {} };
};

export class SubViewComponent extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      filter: '',
      channel: props.match.params.channel,
      platform: props.match.params.platform,
      fetchChannelSummaryData: props.fetchChannelSummaryData
    };

    this.cardClicked = this.cardClicked.bind(this);
  }

  componentDidMount() {
    this.state.fetchChannelSummaryData({
      measures: MEASURES,
      interval: [DEFAULT_TIME_INTERVAL],
      os_names: [_.findKey(OS_MAPPING,
        mappedValue => mappedValue === this.state.platform)
      ],
      channels: [this.state.channel]
    });
  }

  cardClicked(measure) {
    const path = [this.state.channel, this.state.platform, measure].join('/');
    this.props.history.push(`/${path}`);
  }

  render() {
    return (
      <div>
        <Helmet>
          <title>
            { `${this.state.platform} ${this.state.channel}` }
          </title>
        </Helmet>
        <SubViewNav
          breadcrumbs={[
            { name: 'Home', link: '/' },
            { name: `${this.state.platform} ${this.state.channel}`,
              link: `/${this.state.channel}/${this.state.platform}` }
          ]} />
        <div className="container center">
          <Row>
            <CardColumns>
              {
                _.map(this.props.summary, (measure, measureName) => (
                  <Card
                    key={`${measureName}`}
                    onClick={() => this.cardClicked(`${measureName}`)}
                    className="missioncontrol-card">
                    <CardHeader className={`alert-${measure.status}`}>
                      { measureName }
                    </CardHeader>
                    <CardBlock>
                      <MeasureGraph
                        seriesList={measure.seriesList}
                        xax_format={'%Hh'}
                        xax_count={4}
                        width={320}
                        height={200} />
                    </CardBlock>
                  </Card>
                ))
              }
            </CardColumns>
          </Row>
        </div>
      </div>
    );
  }
}

const SubView = connect(mapStateToProps)(SubViewComponent);

export default SubView;
