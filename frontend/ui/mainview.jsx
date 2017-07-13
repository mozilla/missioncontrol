import _ from 'lodash';
import React from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardBlock, CardColumns, CardHeader, CardText } from 'reactstrap';
import { connect } from 'react-redux';
import { ErrorTable, ERROR_TYPE_OUTSIDE_RANGE, ERROR_TYPE_INSUFFICIENT_DATA } from './errortable.jsx';
import { OS_MAPPING } from '../schema';

// eventually this will load a summary for each channel/os combination, so
// leaving this in for now even though were not using it
const mapStateToProps = state => ({ state });

const stringMatchesFilter = (strs, filterStr) =>
  _.every(filterStr.split(' ').map(
    filterSubStr => _.some(strs.map(
      str => str.toLowerCase().indexOf(filterSubStr.toLowerCase()) >= 0))));

export class MainViewComponent extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      filter: ''
    };

    this.filterChanged = this.filterChanged.bind(this);
    this.cardClicked = this.cardClicked.bind(this);
  }

  filterChanged(ev) {
    this.setState({
      filter: ev.target.value
    });
  }

  cardClicked(channelName, platformName) {
    this.props.history.push(`${channelName}/${platformName}`);
  }

  render() {
    return (
      <div>
        <Helmet>
          <title>
            Mission Control
          </title>
        </Helmet>
        <div className="container">
          <div className="input-group filter-group">
            <input
              id="filter-input"
              type="text"
              className="form-control"
              placeholder="Filter results"
              onChange={this.filterChanged} />
          </div>
        </div>
        <div className="container center">
          {
            <CardColumns>
              {
                _.values(OS_MAPPING).map(platformName => ['release', 'beta', 'nightly', 'esr'].map(
                  (channelName) => {
                    const channel = {}; // fill me in with data we get from the server
                    return stringMatchesFilter(
                      [platformName, channelName], this.state.filter) && (
                        <Card
                          key={`${platformName}-${channelName}`}
                          onClick={() => this.cardClicked(channelName, platformName)}
                          className="missioncontrol-card">
                          <CardHeader className={`alert-${channel.status}`}>
                            { platformName } { channelName }
                          </CardHeader>
                          <CardBlock>
                            {
                              channel.passingMeasures && (
                                <CardText>
                                  { channel.passingMeasures } measure(s)
                                  within acceptable range
                                </CardText>
                              )
                            }
                            {
                              (channel.errors && channel.errors.length) && (
                                <div>
                                  <CardText>
                                    { channel.errors.length } measure(s)
                                    outside of acceptable range:
                                  </CardText>
                                  <ErrorTable
                                    platformName={platformName}
                                    channelName={channelName}
                                    errorType={ERROR_TYPE_OUTSIDE_RANGE}
                                    errors={channel.errors} />
                                </div>
                              )
                            }
                            {
                              (channel.insufficientData && channel.insufficientData.length) && (
                                <div>
                                  <CardText>
                                    { channel.insufficientData.length } measure(s)
                                    with insufficient data:
                                  </CardText>
                                  <ErrorTable
                                    platformName={platformName}
                                    channelName={channelName}
                                    errorType={ERROR_TYPE_INSUFFICIENT_DATA}
                                    errors={channel.insufficientData} />
                                </div>
                              )
                            }
                          </CardBlock>
                        </Card>
                      );
                  }))
                }
            </CardColumns>
          }
        </div>
      </div>);
  }
}

const MainView = connect(mapStateToProps)(MainViewComponent);

export default MainView;
