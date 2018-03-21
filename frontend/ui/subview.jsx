import _ from 'lodash';
import moment from 'moment';
import numeral from 'numeral';
import React from 'react';
import { Helmet } from 'react-helmet';
import { connect } from 'react-redux';
import { compareVersions } from 'compare-versions';
import { Button, ButtonGroup } from 'reactstrap';
import Loading from './loading.jsx';
import SubViewNav from './subviewnav.jsx';

const mapStateToProps = (state, ownProps) => {
  const { channel, platform } = ownProps.match.params;
  // if present, summarize crash data across versions per crash type
  if (state.channelPlatformSummary && state.channelPlatformSummary.summaries) {
    const channelPlatformData = state.channelPlatformSummary.summaries.filter(datum =>
      datum.channel === channel.toLowerCase() && datum.platform === platform.toLowerCase());
    if (channelPlatformData.length) {
      return {
        measures: channelPlatformData[0].measures,
        versions: _.uniq(_.flatten(channelPlatformData[0].measures
          .map(measure => measure.versions.map(version => version.version)))).sort(compareVersions).reverse(),
        latestReleaseAge: _.min(_.flatten(channelPlatformData[0].measures
          .map(measure => measure.versions.map(version => version.fieldDuration))))
      };
    }
  }

  return { measures: [] };
};

const getReleaseMean = (release, meanType) => {
  const meanProperty = (meanType === 'adjusted') ? 'adjustedMean' : 'mean';

  if (!release || !release[meanProperty]) {
    return 'N/A';
  }
  return numeral(release[meanProperty]).format('0.00a');
};

export class SubViewComponent extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      filter: '',
      channel: props.match.params.channel,
      platform: props.match.params.platform,
      isLoading: true,
      meanType: 'adjusted'
    };

    this.onDataBtnClick = this.onDataBtnClick.bind(this);
  }

  componentDidMount() {
    this.props.fetchChannelPlatformSummaryData({
      channel: [this.state.channel],
      platform: [this.state.platform]
    }).then(() => this.setState({ isLoading: false }));
  }

  onDataBtnClick(selected) {
    this.setState({ meanType: selected });
  }

  render() {
    return (
      <div className="body-container">
        <Helmet>
          <title>
            { `${this.state.platform} ${this.state.channel}` }
          </title>
        </Helmet>
        <SubViewNav
          className="header-element"
          breadcrumbs={[
            { name: 'Home', link: '/' },
            {
              name: `${this.state.platform} ${this.state.channel}`,
              link: `/${this.state.channel}/${this.state.platform}`
            }
          ]} />
        <div className="body-element">
          {
            this.state.isLoading &&
            <Loading />
          }
          {
            !this.state.isLoading &&
            <div className="container center">
              <div className="summary-options container center">
                <center>
                  <ButtonGroup className="center summary-buttons">
                    {
                      ['adjusted', 'all'].map(meanType => (
                        <Button key={`btn-${meanType}`} onClick={() => this.onDataBtnClick(meanType)} active={this.state.meanType === meanType}>
                          { _.capitalize(meanType) }
                        </Button>))
                    }
                  </ButtonGroup>
                  <p className="text-muted">
                    {
                      (this.state.meanType === 'adjusted') ?
                        'Showing mean error rate (number of events per 1000 hours) within latest release\'s time window' :
                        'Showing mean error rate for full duration of each release (time from when first seen to when next release arrives)'
                    }
                  </p>
                </center>
              </div>
              <table className="table">
                <thead>
                  <tr>
                    <th>Measure</th>
                    {
                      this.props.versions.map(version =>
                        <th key={`th-${version}`}>{version}</th>)
                    }
                    <th>Last updated</th>
                  </tr>
                </thead>
                <tbody>
                  {
                    this.props.measures.map(measure =>
                      (
                        <tr key={measure.name}>
                          <td>
                            <a href={`#/${this.state.channel}/${this.state.platform}/${measure.name}`}>
                              {measure.name}
                            </a>
                          </td>
                          {
                            this.props.versions.map(versionStr => (
                              <td key={`${measure.name}-${versionStr}`}>
                                {
                                  getReleaseMean(
                                    measure.versions.find(release => release.version === versionStr),
                                    this.state.meanType
                                  )
                                }
                              </td>
                            ))
                          }
                          <td al>{measure.lastUpdated ? moment(measure.lastUpdated).fromNow() : 'N/A'}</td>
                        </tr>
                      ))
                  }
                </tbody>
              </table>
              {
                (this.props.latestReleaseAge < 86400) &&
                  <p className="text-danger">
                    <center>Latest release is new ({moment.duration(this.props.latestReleaseAge, 'seconds').humanize()} in field), numbers should be viewed with skepticism</center>
                  </p>
              }
            </div>
            }
        </div>
      </div>
    );
  }
}

const SubView = connect(mapStateToProps)(SubViewComponent);

export default SubView;
