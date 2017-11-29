import moment from 'moment';
import numeral from 'numeral';
import React from 'react';
import { Helmet } from 'react-helmet';
import { connect } from 'react-redux';
import Loading from './loading.jsx';
import SubViewNav from './subviewnav.jsx';

const mapStateToProps = (state, ownProps) => {
  const { channel, platform } = ownProps.match.params;
  // if present, summarize crash data across versions per crash type
  if (state.channelPlatformSummary && state.channelPlatformSummary.summaries) {
    const channelPlatformData = state.channelPlatformSummary.summaries.filter(datum =>
      datum.channel === channel.toLowerCase() && datum.platform === platform.toLowerCase());
    if (channelPlatformData.length) {
      return { measures: channelPlatformData[0].measures };
    }
  }

  return { measures: [] };
};

const getFormattedNumber = (num) => {
  if (num === null || num === undefined) {
    return 'N/A';
  }
  return numeral(num).format('0.00a');
};

export class SubViewComponent extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      filter: '',
      channel: props.match.params.channel,
      platform: props.match.params.platform,
      isLoading: true
    };
  }

  componentDidMount() {
    this.props.fetchChannelPlatformSummaryData({
      channel: [this.state.channel],
      platform: [this.state.platform]
    }).then(() => this.setState({ isLoading: false }));
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
              <table className="table">
                <thead>
                  <tr>
                    <th>Measure</th>
                    <th>Latest version</th>
                    <th>Previous versions (average)</th>
                    <th>Last updated</th>
                  </tr>
                </thead>

                {
                  this.props.measures.map(measure =>
                    (
                      <tr key={measure.name}>
                        <td>
                          <a href={`#/${this.state.channel}/${this.state.platform}/${measure.name}`}>
                            {measure.name}
                          </a>
                        </td>
                        <td>
                          <span title={`Version ${measure.latest.version}`}>
                            {getFormattedNumber(measure.latest.median)}
                          </span>
                        </td>
                        <td>{getFormattedNumber(measure.previous.median)}</td>
                        <td>{measure.lastUpdated ? moment(measure.lastUpdated).fromNow() : 'N/A'}</td>
                      </tr>
                    ))
                  }
              </table>
            </div>
            }
        </div>
      </div>
    );
  }
}

const SubView = connect(mapStateToProps)(SubViewComponent);

export default SubView;
