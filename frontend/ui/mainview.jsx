import _ from 'lodash';
import numeral from 'numeral';
import React from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardBody, CardColumns, CardHeader } from 'reactstrap';
import { connect } from 'react-redux';
import Loading from './loading.jsx';
import { KEY_MEASURES } from '../schema';

// eventually this will load a summary for each channel/os combination, so
// leaving this in for now even though were not using it
const mapStateToProps = state => ({ channelPlatformSummary: state.channelPlatformSummary });

const stringMatchesFilter = (strs, filterStr) =>
  _.every(filterStr.split(' ').map(filterSubStr => _.some(strs.map(str => str.toLowerCase().indexOf(filterSubStr.toLowerCase()) >= 0))));

const getChangeIndicator = (versions) => {
  if (versions.length > 2) {
    const pctChange = ((versions[1].adjustedMean - versions[2].adjustedMean) / versions[2].adjustedMean) * 100.0;
    const title = `${versions[2].adjustedMean} → ${versions[1].adjustedMean}`;
    if (versions[1].adjustedMean > versions[2].adjustedMean) {
      return (
        <span title={title} className={(pctChange > 25) ? 'text-danger' : ''}>{numeral(pctChange).format('0.00a')}%&nbsp;
          <i className="fa fa-arrow-up" aria-hidden="true"></i>
        </span>);
    }
    return (
      <span title={title} className={(pctChange < -25) ? 'text-success' : ''}>
        {numeral(pctChange).format('0.00a')}%&nbsp;<i className="fa fa-arrow-down" aria-hidden="true"></i>
      </span>);
  }
  return (<i className="fa fa-minus" aria-hidden="true"></i>);
};

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
                  stringMatchesFilter([summary.platform, summary.channel], this.state.filter) && (
                  <Card
                    key={`${summary.platform}-${summary.channel}`}
                    onClick={() => this.cardClicked(summary.channel, summary.platform)}
                    className="missioncontrol-card">
                    <CardHeader className={`alert-${summary.status}`}>
                      { summary.platform } { summary.channel }
                    </CardHeader>
                    <CardBody>
                      <table className="table table-sm summary-table">
                        <tbody>
                          {
                            summary.measures
                              .filter(measure => KEY_MEASURES.includes(measure.name) && measure.versions.length)
                              .map(measure => (
                                <tr key={measure.name} title={(measure.versions.length > 1) ? `Average ${measure.versions[1].adjustedMean} events per 1000 hours` : ''}>
                                  <td>{measure.name}</td>
                                  <td id={`${summary.platform}-${summary.channel}-${measure.name}`} align="right">
                                    {(measure.versions.length > 1) && measure.versions[1].adjustedMean}
                                  </td>
                                  <td align="right">
                                    {measure.versions && getChangeIndicator(measure.versions)}
                                  </td>
                                </tr>
                            ))
                          }
                        </tbody>
                      </table>
                    </CardBody>
                  </Card>
                    ))
              }
              </CardColumns>
            }
        </div>
      </div>);
  }
}

const MainView = connect(mapStateToProps)(MainViewComponent);

export default MainView;
