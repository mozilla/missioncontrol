import _ from 'lodash';
import moment from 'moment';
import numeral from 'numeral';
import React from 'react';
import { Helmet } from 'react-helmet';
import { connect } from 'react-redux';
import { Button, ButtonGroup } from 'reactstrap';
import Loading from './loading';
import SubViewNav from './subviewnav';

const mapStateToProps = (state, ownProps) => {
  const { channel, platform } = ownProps.match.params;

  // if present, summarize crash data across versions per crash type
  if (state.channelPlatformSummary && state.channelPlatformSummary.summaries) {
    const channelPlatformData = state.channelPlatformSummary.summaries.filter(
      datum =>
        datum.channel === channel.toLowerCase() &&
        datum.platform === platform.toLowerCase()
    );

    if (channelPlatformData.length) {
      return {
        measures: channelPlatformData[0].measures,
        versions: _.uniq(
          _.flatten(
            channelPlatformData[0].measures.map(measure =>
              measure.versions.map(version => version.version)
            )
          )
        )
          .sort()
          .reverse(),
        latestReleaseAge: _.min(
          _.flatten(
            channelPlatformData[0].measures.map(measure =>
              measure.versions.map(version => version.fieldDuration)
            )
          )
        ),
      };
    }
  }

  return { measures: [] };
};

const getReleaseValue = (release, countType, timeWindow) => {
  const property =
    timeWindow === 'adjusted'
      ? `adjusted${_.capitalize(countType)}`
      : countType;

  if (!release || !release[property]) {
    return 'N/A';
  }

  return (
    <span
      title={
        countType === 'count' ? numeral(release[property]).format('0,0') : null
      }>
      {numeral(release[property]).format('0.00a')}
    </span>
  );
};

export class SubViewComponent extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      channel: props.match.params.channel,
      platform: props.match.params.platform,
      isLoading: true,
      timeWindow: 'adjusted',
      countType: 'rate',
    };
    this.ontimeWindowBtnClick = this.ontimeWindowBtnClick.bind(this);
    this.onCountTypeBtnClick = this.onCountTypeBtnClick.bind(this);
  }

  componentDidMount() {
    this.props
      .fetchChannelPlatformSummaryData({
        channel: [this.state.channel],
        platform: [this.state.platform],
      })
      .then(() => this.setState({ isLoading: false }));
  }

  ontimeWindowBtnClick(selected) {
    this.setState({ timeWindow: selected });
  }

  onCountTypeBtnClick(selected) {
    this.setState({ countType: selected });
  }

  render() {
    return (
      <div className="body-container">
        <Helmet>
          <title>{`${this.state.platform} ${this.state.channel}`}</title>
        </Helmet>
        <SubViewNav
          className="header-element"
          breadcrumbs={[
            { name: 'Home', link: `/?channel=${this.state.channel}` },
            {
              name: `${this.state.platform} ${this.state.channel}`,
              link: `/${this.state.channel}/${this.state.platform}`,
            },
          ]}
        />
        <div className="body-element">
          {this.state.isLoading && <Loading />}
          {!this.state.isLoading && (
            <div className="container center">
              <div className="summary-options container center">
                <center>
                  <ButtonGroup className="center summary-buttons">
                    {['adjusted', 'all'].map(timeWindow => (
                      <Button
                        key={`btn-${timeWindow}`}
                        onClick={() => this.ontimeWindowBtnClick(timeWindow)}
                        active={this.state.timeWindow === timeWindow}>
                        {_.capitalize(timeWindow)}
                      </Button>
                    ))}
                  </ButtonGroup>
                  &nbsp;
                  <ButtonGroup className="center summary-buttons">
                    {['rate', 'count'].map(countType => (
                      <Button
                        key={`btn-${countType}`}
                        onClick={() => this.onCountTypeBtnClick(countType)}
                        active={this.state.countType === countType}>
                        {_.capitalize(countType)}
                      </Button>
                    ))}
                  </ButtonGroup>
                  <p className="text-muted">
                    Showing&nbsp;
                    {this.state.countType === 'rate' ? (
                      <abbr title="Average number of events per 1000 hours">
                        mean error rate
                      </abbr>
                    ) : (
                      'total number of errors'
                    )}
                    &nbsp;
                    {this.state.timeWindow === 'adjusted' ? (
                      "within latest release's time window"
                    ) : (
                      <span>
                        for&nbsp;
                        <abbr title="Time from when first seen to when next release arrives">
                          full duration of each release
                        </abbr>
                      </span>
                    )}
                  </p>
                </center>
              </div>
              <table className="table">
                <thead>
                  <tr>
                    <th>Measure</th>
                    {this.props.versions.map(version => (
                      <th key={`th-${version}`}>{version}</th>
                    ))}
                    <th>Last updated</th>
                  </tr>
                </thead>
                <tbody>
                  {this.props.measures
                    .sort((m, n) => m.name > n.name)
                    .map(measure => (
                      <tr key={measure.name}>
                        <td>
                          <a
                            href={`#/${this.state.channel}/${
                              this.state.platform
                            }/${measure.name}`}>
                            {measure.name}
                          </a>
                        </td>
                        {this.props.versions.map(versionStr => (
                          <td key={`${measure.name}-${versionStr}`}>
                            {getReleaseValue(
                              measure.versions.find(
                                release => release.version === versionStr
                              ),
                              this.state.countType,
                              this.state.timeWindow
                            )}
                          </td>
                        ))}
                        <td al>
                          {measure.lastUpdated
                            ? moment(measure.lastUpdated).fromNow()
                            : 'N/A'}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {this.props.latestReleaseAge < 86400 && (
                <p className="text-danger">
                  <center>
                    Latest release is new ({moment
                      .duration(this.props.latestReleaseAge, 'seconds')
                      .humanize()}{' '}
                    in field), numbers should be viewed with skepticism
                  </center>
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
}

const SubView = connect(mapStateToProps)(SubViewComponent);

export default SubView;
