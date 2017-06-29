import React from 'react';
import _ from 'lodash';
import { Card, CardBlock, CardColumns, CardHeader, Row } from 'reactstrap';
import { Helmet } from 'react-helmet';
import { connect } from 'react-redux';
import MeasureGraph from './measuregraph.jsx';
import SubViewNav from './subviewnav.jsx';
import { CRASH_TYPES } from '../schema';

const mapStateToProps = (state, ownProps) => {
  const channel = ownProps.match.params.channel;
  const platform = ownProps.match.params.platform;

  // if present, summarize crash data across versions per crash type
  if (state.crashData && state.crashData.channels &&
      state.crashData.channels[platform] &&
      state.crashData.channels[platform][channel]) {
    if (state.crashData.channels[platform][channel].data) {
      const aggregatedDataMap = {};
      _.forEach(state.crashData.channels[platform][channel].data, (version) => {
        version.forEach((d) => {
          CRASH_TYPES.forEach((crashType) => {
            if (!aggregatedDataMap[crashType]) {
              aggregatedDataMap[crashType] = {};
            }
            if (!aggregatedDataMap[crashType][d.date]) {
              aggregatedDataMap[crashType][d.date] = {
                date: d.date,
                value: 0
              };
            }
            aggregatedDataMap[crashType][d.date].value += d[`crash-${crashType}`];
          });
        });
      });
      return {
        summary: {
          crash: _.reduce(aggregatedDataMap, (crashTypes, data, crashType) => ({
            ...crashTypes,
            [crashType]: {
              status: 'success',
              seriesList: [{
                name: 'aggregate',
                data: _.values(data).sort((a, b) => a.date > b.date)
              }]
            }
          }), {})
        }
      };
    }

    // we have data, but it is empty
    return {
      summary: {
        crash: {
          main: {
            status: 'warning',
            seriesList: []
          }
        }
      }
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
      platform: props.match.params.platform
    };

    this.cardClicked = this.cardClicked.bind(this);
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
          {
            _.map(this.props.summary, (dimension, dimensionName) => (
              <Row key={dimensionName}>
                <CardColumns>
                  {
                    _.map(dimension, (measure, dimension2Name) => (
                      <Card
                        key={`${dimensionName}-${dimension2Name}`}
                        onClick={() => this.cardClicked(`${dimensionName}-${dimension2Name}`)}
                        className="missioncontrol-card">
                        <CardHeader className={`alert-${measure.status}`}>
                          { _.capitalize(dimensionName) } { dimension2Name }
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
            ))
          }
        </div>
      </div>
    );
  }
}

const SubView = connect(mapStateToProps)(SubViewComponent);

export default SubView;
