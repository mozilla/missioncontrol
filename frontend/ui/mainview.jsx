import _ from 'lodash';
import copy from 'copy-to-clipboard';
import numeral from 'numeral';
import React from 'react';
import { Helmet } from 'react-helmet';
import {
  Button,
  Card,
  CardBody,
  CardDeck,
  CardHeader,
  Nav,
  NavItem,
  NavLink,
} from 'reactstrap';
import { connect } from 'react-redux';
import Loading from './loading';
import { CHANNEL_ICON_MAPPING, KEY_MEASURES } from '../schema';

const mapStateToProps = state => {
  if (state.channelPlatformSummary && state.channelPlatformSummary.summaries) {
    return {
      channelPlatformSummary: {
        ...state.channelPlatformSummary,
        summaries: state.channelPlatformSummary.summaries.map(summary => {
          // only pretend we have a summary rate if we've got all the key
          // measures for a particular channel/platform combo
          const summaryRate = _.every(
            _.intersection(KEY_MEASURES, summary.expectedMeasures).map(
              keyMeasure =>
                summary.measures.map(m => m.name).includes(keyMeasure)
            )
          )
            ? _.sum(
                summary.measures
                  .filter(m => KEY_MEASURES.includes(m.name))
                  .map(m => m.versions[1].adjustedRate)
              ).toFixed(2)
            : undefined;

          return {
            ...summary,
            summaryRate,
          };
        }),
      },
    };
  }

  return {};
};

const getSummaryScore = (summaries, channel) => {
  const channelSummaries = summaries.filter(s => s.channel === channel);

  if (!_.every(channelSummaries.map(summary => summary.summaryRate))) {
    return undefined;
  }

  const summaryRates = channelSummaries.map(s => s.summaryRate);
  const geoMean = numeral(
    summaryRates.reduce((total, curr) => total * curr) **
      (1.0 / summaryRates.length)
  ).format('0.00');
  const breakdown = channelSummaries.map(s => ({
    platform: s.platform,
    measures: s.measures
      .filter(m => KEY_MEASURES.includes(m.name))
      .map(m => ({ name: m.name, value: m.versions[1].adjustedRate })),
  }));
  const derivation = `√${channelSummaries.length}(${channelSummaries
    .map(s => `${s.summaryRate} ${s.platform}`)
    .join(' * ')})`;

  return {
    breakdown,
    explanation: `= ${derivation}`,
    value: geoMean,
  };
};

const getChangeIndicator = versions => {
  if (versions.length > 2 && versions[2].adjustedRate > 0.0) {
    const pctChange =
      (versions[1].adjustedRate - versions[2].adjustedRate) /
      versions[2].adjustedRate *
      100.0;
    const pctFormat = Math.abs(pctChange) < 10 ? '0.00a' : '0a';
    const title = `${versions[2].adjustedRate} → ${versions[1].adjustedRate}`;

    if (versions[1].adjustedRate > versions[2].adjustedRate) {
      return (
        <span title={title} className={pctChange > 25 ? 'text-danger' : ''}>
          {numeral(pctChange).format(pctFormat)}%&nbsp;
          <i className="fa fa-arrow-up" aria-hidden="true" />
        </span>
      );
    }

    return (
      <span title={title} className={pctChange < -25 ? 'text-success' : ''}>
        {numeral(pctChange).format(pctFormat)}%&nbsp;<i
          className="fa fa-arrow-down"
          aria-hidden="true"
        />
      </span>
    );
  }

  return <i className="fa fa-minus" aria-hidden="true" />;
};

const getOptionalParameters = props => {
  const urlParams = new URLSearchParams(props.location.search);

  return {
    channel: urlParams.get('channel') ? urlParams.get('channel') : 'release',
  };
};

class MainViewComponent extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      ...getOptionalParameters(props),
    };

    this.cardClicked = this.cardClicked.bind(this);
    this.channelBtnClicked = this.channelBtnClicked.bind(this);
    this.copyBtnClicked = this.copyBtnClicked.bind(this);
  }

  componentDidMount() {
    this.props
      .fetchChannelPlatformSummaryData()
      .then(() => this.setState({ isLoading: false }));
  }

  cardClicked(channelName, platformName) {
    this.props.history.push(`${channelName}/${platformName}`);
  }

  channelBtnClicked(channelName) {
    this.setState({ channel: channelName });
    this.props.history.push(`?channel=${channelName}`);
  }

  copyBtnClicked(summaryScore) {
    copy(
      `${this.state.channel} summary score: ${summaryScore.value} (${
        summaryScore.explanation
      })\n${summaryScore.breakdown
        .map(
          p =>
            `* ${p.platform} (${p.measures
              .map(m => `${m.name}: ${m.value}`)
              .join(' / ')})`
        )
        .join('\n')}`
    );
  }

  render() {
    const summaryScore = this.props.channelPlatformSummary
      ? getSummaryScore(
          this.props.channelPlatformSummary.summaries,
          this.state.channel
        )
      : undefined;

    return (
      <div>
        <Helmet>
          <title>Mission Control</title>
        </Helmet>
        <Nav className="justify-content-center release-selector" pills>
          {['release', 'beta', 'nightly', 'esr'].map(channel => (
            <NavItem key={`btn-${channel}`}>
              <NavLink
                href={`#?channel=${channel}`}
                onClick={() => this.channelBtnClicked(channel)}
                active={this.state.channel === channel}>
                <img
                  className="channel-icon"
                  alt={`${channel} icon`}
                  src={CHANNEL_ICON_MAPPING[channel]}
                />
                {channel}
              </NavLink>
            </NavItem>
          ))}
        </Nav>
        <div className="container center">
          {this.state.isLoading && <Loading />}
          {!this.state.isLoading && (
            <div>
              <div className="container">
                <div className="row">
                  <div className="col align-self-center channel-summary">
                    <div className="channel-summary-title">Summary Score</div>
                    {summaryScore && (
                      <div className="channel-summary-score">
                        <abbr title={summaryScore.explanation}>
                          {summaryScore.value}
                        </abbr>
                        <Button
                          className="channel-summary-copy-button"
                          title="Copy textual summary to clipboard"
                          onClick={() => this.copyBtnClicked(summaryScore)}>
                          <i className="fa fa-copy" />
                        </Button>
                      </div>
                    )}
                    {!summaryScore && (
                      <div className="channel-summary-score">N/A</div>
                    )}
                  </div>
                </div>
              </div>
              <CardDeck>
                {this.props.channelPlatformSummary &&
                  this.props.channelPlatformSummary.summaries.map(
                    summary =>
                      summary.channel === this.state.channel && (
                        <Card
                          key={`${summary.platform}-${summary.channel}`}
                          onClick={() =>
                            this.cardClicked(summary.channel, summary.platform)
                          }
                          className="missioncontrol-card">
                          <CardHeader className={`alert-${summary.status}`}>
                            <center>
                              {_.capitalize(summary.platform)}{' '}
                              {summary.latestVersionSeen && (
                                <small className="text-muted">
                                  ({summary.latestVersionSeen})
                                </small>
                              )}
                            </center>
                          </CardHeader>
                          <CardBody>
                            <div className="summary-rate">
                              <abbr
                                title={_.intersection(
                                  summary.expectedMeasures,
                                  KEY_MEASURES
                                ).join(' + ')}>
                                {summary.summaryRate
                                  ? summary.summaryRate
                                  : 'N/A'}
                              </abbr>
                            </div>
                            <table className="table table-sm summary-table">
                              <tbody>
                                {summary.measures
                                  .filter(
                                    measure =>
                                      KEY_MEASURES.includes(measure.name) &&
                                      measure.versions.length &&
                                      measure.versions[0].version ===
                                        summary.latestVersionSeen
                                  )
                                  .map(measure => (
                                    <tr
                                      key={measure.name}
                                      title={
                                        measure.versions.length > 1
                                          ? `Average ${
                                              measure.versions[1].adjustedRate
                                            } events per 1000 hours`
                                          : ''
                                      }>
                                      <td>{measure.name}</td>
                                      <td
                                        id={`${summary.platform}-${
                                          summary.channel
                                        }-${measure.name}`}
                                        align="right">
                                        {measure.versions.length > 1 &&
                                          measure.versions[1].adjustedRate}
                                      </td>
                                      <td align="right">
                                        {measure.versions &&
                                          getChangeIndicator(measure.versions)}
                                      </td>
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                          </CardBody>
                        </Card>
                      )
                  )}
              </CardDeck>
            </div>
          )}
        </div>
      </div>
    );
  }
}

const MainView = connect(mapStateToProps)(MainViewComponent);

export default MainView;
