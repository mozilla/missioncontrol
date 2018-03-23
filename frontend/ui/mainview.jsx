import numeral from 'numeral';
import React from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardBody, CardColumns, CardHeader, Nav, NavItem, NavLink } from 'reactstrap';
import { connect } from 'react-redux';
import Loading from './loading.jsx';
import { CHANNEL_ICON_MAPPING, KEY_MEASURES } from '../schema';

// eventually this will load a summary for each channel/os combination, so
// leaving this in for now even though were not using it
const mapStateToProps = state => ({ channelPlatformSummary: state.channelPlatformSummary });

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

const getOptionalParameters = (props) => {
  const urlParams = new URLSearchParams(props.location.search);

  return {
    channel: urlParams.get('channel') ? urlParams.get('channel') : 'release'
  };
};

class MainViewComponent extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      ...getOptionalParameters(props)
    };

    this.cardClicked = this.cardClicked.bind(this);
    this.channelBtnClicked = this.channelBtnClicked.bind(this);
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

  channelBtnClicked(channelName) {
    this.setState({ channel: channelName });
    this.props.history.push(`?channel=${channelName}`);
  }

  render() {
    return (
      <div>
        <Helmet>
          <title>
            Mission Control
          </title>
        </Helmet>
        <Nav
          className="justify-content-center release-selector"
          pills>
          {
            ['release', 'beta', 'nightly', 'esr'].map(channel => (
              <NavItem key={`btn-${channel}`}>
                <NavLink
                  href={`#?channel=${channel}`}
                  onClick={() => this.channelBtnClicked(channel)}
                  active={this.state.channel === channel}>
                  <img className="channel-icon" src={CHANNEL_ICON_MAPPING[channel]}></img>
                  { channel }
                </NavLink>
              </NavItem>
            ))
          }
        </Nav>
        <div className="container center">
          {
            this.state.isLoading && <Loading />
          }
          {
            !this.state.isLoading && <CardColumns>
              {
                this.props.channelPlatformSummary && this.props.channelPlatformSummary.summaries.map(summary =>
                  summary.channel === this.state.channel && (
                  <Card
                    key={`${summary.platform}-${summary.channel}`}
                    onClick={() => this.cardClicked(summary.channel, summary.platform)}
                    className="missioncontrol-card">
                    <CardHeader className={`alert-${summary.status}`}>
                      { summary.platform }
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
