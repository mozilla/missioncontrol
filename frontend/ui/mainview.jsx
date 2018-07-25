import _ from 'lodash';
import copy from 'copy-to-clipboard';
import numeral from 'numeral';
import React from 'react';
import { Helmet } from 'react-helmet';
import { Button, Nav, NavItem, NavLink } from 'reactstrap';
import { connect } from 'react-redux';
import Loading from './loading';
import PlatformCard from './platformcard';
import { CHANNEL_ICON_MAPPING, KEY_MEASURES } from '../schema';

const mapStateToProps = state => {
  if (state.channelPlatformSummary && state.channelPlatformSummary.summaries) {
    return {
      applications: _.uniq(
        state.channelPlatformSummary.summaries.map(
          summary => summary.application
        )
      ),
      channelPlatformSummary: {
        ...state.channelPlatformSummary,
        summaries: state.channelPlatformSummary.summaries.map(summary => {
          // augment summary measures with a major versions property that only
          // includes major versions
          const measures = summary.measures.map(measure => ({
            majorVersions: measure.versions.filter(version =>
              version.version.match(/^\d+$/)
            ),
            ...measure,
          }));
          // only pretend we have a summary rate if we've got all the key
          // measures for a particular channel/platform combo
          const summaryRate = _.every(
            _.intersection(KEY_MEASURES, summary.expectedMeasures).map(
              keyMeasure => measures.map(m => m.name).includes(keyMeasure)
            )
          )
            ? _.sum(
                measures
                  .filter(
                    m =>
                      KEY_MEASURES.includes(m.name) &&
                      m.majorVersions.length > 1
                  )
                  .map(m => m.majorVersions[0].adjustedRate)
              ).toFixed(2)
            : undefined;

          return {
            ...summary,
            measures,
            summaryRate,
          };
        }),
      },
    };
  }

  return {};
};

const getSummaryScore = (summaries, application, channel) => {
  const channelSummaries = summaries.filter(
    s => s.application === application && s.channel === channel
  );

  if (!_.every(channelSummaries.map(summary => summary.summaryRate))) {
    return undefined;
  }

  const summaryRates = channelSummaries.map(s => s.summaryRate);
  const geoMean = numeral(
    summaryRates.reduce((total, curr) => total * curr) **
      (1.0 / summaryRates.length)
  ).format('0.00');

  return {
    application,
    breakdown: channelSummaries.map(s => ({
      platform: s.platform,
      measures: s.measures
        .filter(m => KEY_MEASURES.includes(m.name) && m.versions.length > 1)
        .map(m => ({ name: m.name, value: m.versions[1].adjustedRate })),
    })),
    explanation:
      channelSummaries.length > 1
        ? `= √${channelSummaries.length}(${channelSummaries
            .map(s => `${s.summaryRate} ${s.platform}`)
            .join(' * ')})`
        : '',
    value: geoMean,
  };
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

    this.channelBtnClicked = this.channelBtnClicked.bind(this);
    this.copyBtnClicked = this.copyBtnClicked.bind(this);
  }

  componentDidMount() {
    this.props
      .fetchChannelPlatformSummaryData()
      .then(() => this.setState({ isLoading: false }));
  }

  channelBtnClicked(channelName) {
    this.setState({ channel: channelName });
    this.props.history.push(`?channel=${channelName}`);
  }

  copyBtnClicked(summaryScore) {
    let header = `${summaryScore.application} ${
      this.state.channel
    } summary score: ${summaryScore.value}`;

    if (summaryScore.explanation.length) {
      header += ` (${summaryScore.explanation})`;
    }

    copy(
      `${header}\n${summaryScore.breakdown
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
        <div className="container-fluid center">
          {this.state.isLoading && <Loading />}
          {!this.state.isLoading && (
            <div className="container-fluid">
              <div className="row">
                {this.props.applications &&
                  this.props.channelPlatformSummary &&
                  this.props.applications
                    .filter(applicationName =>
                      _.some(
                        this.props.channelPlatformSummary.summaries,
                        summary =>
                          summary.channel === this.state.channel &&
                          summary.application === applicationName
                      )
                    )
                    .map(applicationName => ({
                      name: applicationName,
                      summaryScore: getSummaryScore(
                        this.props.channelPlatformSummary.summaries,
                        applicationName,
                        this.state.channel
                      ),
                    }))
                    .map(application => (
                      <div
                        key={`summary-${application.name}`}
                        className="col align-self-center channel-summary">
                        <div className="channel-summary-title">
                          {_.capitalize(application.name)} Summary Score
                        </div>
                        {application.summaryScore && (
                          <div className="channel-summary-score">
                            <abbr title={application.summaryScore.explanation}>
                              {application.summaryScore.value}
                            </abbr>
                            <Button
                              className="channel-summary-copy-button"
                              title="Copy textual summary to clipboard"
                              onClick={() =>
                                this.copyBtnClicked(application.summaryScore)
                              }>
                              <i className="fa fa-copy" />
                            </Button>
                          </div>
                        )}
                        {!application.summaryScore && (
                          <div className="channel-summary-score">N/A</div>
                        )}
                      </div>
                    ))}
              </div>
              <div className="row">
                <div className="container-fluid mt-4">
                  <div className="row justify-content-center">
                    {this.props.channelPlatformSummary &&
                      this.props.channelPlatformSummary.summaries.map(
                        summary =>
                          summary.channel === this.state.channel && (
                            <div
                              key={`${summary.application}-${summary.platform}`}
                              className="col-auto mb-3">
                              <PlatformCard
                                history={this.props.history}
                                summary={summary}
                              />
                            </div>
                          )
                      )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
}

const MainView = connect(mapStateToProps)(MainViewComponent);

export default MainView;
