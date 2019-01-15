import _ from 'lodash';
import moment from 'moment';
import React from 'react';
import { Helmet } from 'react-helmet';
import { connect } from 'react-redux';
import { Button, ButtonGroup } from 'reactstrap';
import Loading from './loading';
import SubViewNav from './subviewnav';
import { semVerCompare } from '../version';
import { CRASH_MEASURE_ORDER } from '../schema';
import MeasureTable from './measuretable';

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
      const channelPlatformSummary = channelPlatformData[0];

      return {
        measures: channelPlatformSummary.measures,
        versions: _.uniq(
          _.flatten(
            channelPlatformSummary.measures.map(measure =>
              measure.versions.map(version => version.version)
            )
          )
        )
          .sort((a, b) => semVerCompare(a, b))
          .reverse(),
        latestReleaseAge: channelPlatformSummary.latestVersionFieldDuration,
      };
    }
  }

  return { measures: [] };
};

const getOptionalTimeWindow = props => {
  const urlParams = new URLSearchParams(props.location.search);

  return {
    timeWindow: urlParams.get('window') ? urlParams.get('window') : 'adjusted',
  };
};

const getOptionalCountType = props => {
  const urlParams = new URLSearchParams(props.location.search);

  return {
    countType: urlParams.get('type') ? urlParams.get('type') : 'rate',
  };
};

export class SubViewComponent extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      channel: props.match.params.channel,
      platform: props.match.params.platform,
      isLoading: true,
      ...getOptionalTimeWindow(props),
      ...getOptionalCountType(props),
      measures: {},
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
      .then(() => {
        this.splitByOrder(this.props.measures);
        this.setState({
          isLoading: false,
          measures: this.splitByOrder(this.props.measures),
        });
      });
  }

  ontimeWindowBtnClick(selected) {
    this.setState({ timeWindow: selected });
    this.props.history.push(`?window=${selected}&type=${this.state.countType}`);
  }

  onCountTypeBtnClick(selected) {
    this.setState({ countType: selected });
    this.props.history.push(
      `?window=${this.state.timeWindow}&type=${selected}`
    );
  }

  splitByOrder(measures) {
    const crashMeasures = _.filter(
      CRASH_MEASURE_ORDER.map(measureName =>
        measures.find(element => element.name === measureName)
      )
    );
    const otherMeasures = _.orderBy(_.difference(measures, crashMeasures), [
      'name',
    ]);

    return {
      crashMeasures,
      otherMeasures,
    };
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
              {this.state.measures.crashMeasures.length > 0 && (
                <MeasureTable
                  title="Crash Measures"
                  measures={this.state.measures.crashMeasures}
                  versions={this.props.versions}
                  subviewState={this.state}
                />
              )}
              {this.state.measures.otherMeasures.length > 0 && (
                <MeasureTable
                  title="Other Measures"
                  measures={this.state.measures.otherMeasures}
                  versions={this.props.versions}
                  subviewState={this.state}
                />
              )}
              {this.props.latestReleaseAge &&
                this.props.latestReleaseAge < 86400 && (
                  <p className="text-danger">
                    <center>
                      Latest release is new (
                      {moment
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
