import _ from 'lodash';
import React from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardBlock, CardColumns, CardHeader, CardText } from 'reactstrap';
import { connect } from 'react-redux';
import { ErrorTable, ERROR_TYPE_OUTSIDE_RANGE, ERROR_TYPE_INSUFFICIENT_DATA } from './errortable.jsx';
import Loading from './loading.jsx';

// eventually this will load a summary for each channel/os combination, so
// leaving this in for now even though were not using it
const mapStateToProps = state => ({
  channelPlatformSummary: state.channelPlatformSummary });

const stringMatchesFilter = (strs, filterStr) =>
  _.every(filterStr.split(' ').map(
    filterSubStr => _.some(strs.map(
      str => str.toLowerCase().indexOf(filterSubStr.toLowerCase()) >= 0))));

class MainViewComponent extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      filter: '',
      isLoading: true
    };

    this.filterChanged = this.filterChanged.bind(this);
    this.cardClicked = this.cardClicked.bind(this);
  }

  componentDidMount() {
    this.props.fetchChannelPlatformSummaryData()
      .then(() => this.setState({ isLoading: false }));
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
            this.state.isLoading && <Loading />
          }
          {
            !this.state.isLoading && <CardColumns>
              {
                this.props.channelPlatformSummary && this.props.channelPlatformSummary.summaries.map(summary =>
                  stringMatchesFilter(
                    [summary.platform, summary.channel], this.state.filter) && (
                      <Card
                        key={`${summary.platform}-${summary.channel}`}
                        onClick={() => this.cardClicked(summary.channel, summary.platform)}
                        className="missioncontrol-card">
                        <CardHeader className={`alert-${summary.status}`}>
                          { summary.platform } { summary.channel }
                        </CardHeader>
                        <CardBlock>
                          {
                            summary.passingMeasures && (
                              <CardText>
                                { summary.passingMeasures } measure(s)
                                within acceptable range
                              </CardText>
                            )
                          }
                          {
                            (summary.errors && summary.errors.length) && (
                              <div>
                                <CardText>
                                  { summary.errors.length } measure(s)
                                  outside of acceptable range:
                                </CardText>
                                <ErrorTable
                                  platformName={summary.platform}
                                  channelName={summary.channel}
                                  errorType={ERROR_TYPE_OUTSIDE_RANGE}
                                  errors={summary.errors} />
                              </div>
                            )
                          }
                          {
                            (summary.insufficientData && summary.insufficientData.length) && (
                              <div>
                                <CardText>
                                  { summary.insufficientData.length } measure(s)
                                  with insufficient data:
                                </CardText>
                                <ErrorTable
                                  platformName={summary.platform}
                                  channelName={summary.channel}
                                  errorType={ERROR_TYPE_INSUFFICIENT_DATA}
                                  errors={summary.insufficientData} />
                              </div>
                            )
                          }
                        </CardBlock>
                      </Card>
                    )
                )
              }
              </CardColumns>
            }
        </div>
      </div>);
  }
}

const MainView = connect(mapStateToProps)(MainViewComponent);

export default MainView;
