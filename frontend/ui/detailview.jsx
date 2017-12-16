import React from 'react';
import _ from 'lodash';
import moment from 'moment';
import { Button, FormGroup, Input, Label, Row, Col, Container } from 'reactstrap';
import { Helmet } from 'react-helmet';
import { connect } from 'react-redux';
import { stringify } from 'query-string';

import Loading from './loading.jsx';
import DateSelectorModal from './dateselectormodal.jsx';
import DetailGraph from './detailgraph.jsx';
import MeasureDetailGraph from './measuredetailgraph.jsx';
import SubViewNav from './subviewnav.jsx';
import {
  DEFAULT_PERCENTILE,
  DEFAULT_TIME_INTERVAL,
  DEFAULT_VERSION_GROUPING_TYPE,
  CRASH_STATS_MAPPING,
  PERCENTILES,
  TIME_INTERVALS,
  TIME_INTERVALS_RELATIVE
} from '../schema';

const mapStateToProps = (state, ownProps) => {
  const { measure } = ownProps.match.params;
  const cacheKey = `${ownProps.match.params.platform}-${ownProps.match.params.channel}-${measure}`;
  const measureData = state.measures[cacheKey];

  return { measureData };
};

const getDateString = (date) => {
  // input could be either a javascript date object or undefined
  if (!date) return '';
  return date.toISOString().slice(0, 10);
};

const getValidTimeIntervals = (params) => {
  const timeIntervals = _.clone(TIME_INTERVALS);
  if (params.startTime) {
    const startTimeMs = parseInt(params.startTime * 1000.0, 10);
    const [startDateStr, endDateStr] = [startTimeMs, startTimeMs + (params.timeInterval * 1000)]
      .map(time => moment(time).format('ddd MMM D'));
    timeIntervals.unshift({
      label: `${startDateStr} → ${endDateStr}`,
      startTime: params.startTime,
      interval: params.timeInterval
    });
  }

  return timeIntervals;
};

const getOptionalParameters = (props) => {
  const urlParams = new URLSearchParams(props.location.search);

  // time interval can either be specified as an interval (starting from the present) or a set of dates
  const timeInterval = parseInt(urlParams.get('timeInterval') ?
    urlParams.get('timeInterval') : DEFAULT_TIME_INTERVAL, 10);

  let startTime = urlParams.get('startTime');
  let customStartDate;
  let customEndDate;
  if (startTime) {
    startTime = parseInt(startTime, 10);
    customStartDate = new Date(startTime * 1000);
    customEndDate = new Date((startTime + timeInterval) * 1000);
  }

  // grouping can be either by build id or by version
  const versionGrouping = urlParams.has('versionGrouping') ? urlParams.get('versionGrouping') : DEFAULT_VERSION_GROUPING_TYPE;

  // percentile filter of data
  const percentileThreshold = parseInt(urlParams.has('percentile') ?
    urlParams.get('percentile') : DEFAULT_PERCENTILE, 10);

  // relative to most recent version (true/false), false if not
  // specified
  const relative = !!parseInt(urlParams.get('relative'), 10);

  // coerce normalized into a boolean, true if not specified
  let normalized = true;
  if (urlParams.has('normalized')) {
    normalized = (parseInt(urlParams.get('normalized'), 10));
  }

  // disabledVersions is a comma-seperated list when specified
  const disabledVersions = new Set(urlParams.has('disabledVersions') ?
    urlParams.get('disabledVersions').split(',') : []);

  return {
    startTime,
    customStartDate,
    customEndDate,
    timeInterval,
    relative,
    normalized,
    disabledVersions,
    versionGrouping,
    percentile: percentileThreshold,
    validTimeIntervals: getValidTimeIntervals({
      startTime,
      timeInterval
    })
  };
};

class DetailViewComponent extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      channel: props.match.params.channel,
      platform: props.match.params.platform,
      measure: props.match.params.measure,
      isLoading: true,
      fetchMeasureData: this.props.fetchMeasureData,
      disabledVersions: new Set(),
      seriesList: [],
      ...getOptionalParameters(props)
    };

    this.timeIntervalChanged = this.timeIntervalChanged.bind(this);
    this.cancelChooseCustomTimeInterval = this.cancelChooseCustomTimeInterval.bind(this);
    this.relativeChanged = this.relativeChanged.bind(this);
    this.percentileChanged = this.percentileChanged.bind(this);
    this.normalizeCheckboxChanged = this.normalizeCheckboxChanged.bind(this);
    this.versionCheckboxChanged = this.versionCheckboxChanged.bind(this);
    this.toggleVersionGrouping = this.toggleVersionGrouping.bind(this);
    this.customTimeIntervalChosen = this.customTimeIntervalChosen.bind(this);
  }

  componentDidMount() {
    this.fetchMeasureData(this.state);
  }

  fetchMeasureData() {
    this.setState({ isLoading: true });
    this.state.fetchMeasureData(_.pickBy({
      measure: this.state.measure,
      channel: this.state.channel,
      platform: this.state.platform,
      relative: this.state.relative ? 1 : undefined,
      interval: this.state.timeInterval,
      start: this.state.startTime
    })).then(() =>
      this.setState({
        seriesList: this.getSeriesList(),
        isLoading: false
      }));
  }

  getSeriesList() {
    const { measure } = this.props.match.params;

    const seriesMap = {};
    if (this.state.versionGrouping === 'version') {
      _.forEach(this.props.measureData, (build) => {
        if (this.state.disabledVersions.has(build.version)) {
          return;
        }
        if (!seriesMap[build.version]) {
          seriesMap[build.version] = {};
        }
        build.data.forEach((datum) => {
          const date = this.state.relative ? datum[0] / 60.0 / 60.0 : new Date(datum[0]);
          if (!seriesMap[build.version][date]) {
            seriesMap[build.version][date] = {
              [measure]: 0,
              usage_hours: 0,
              date
            };
          }

          seriesMap[build.version][date][measure] += datum[1];
          seriesMap[build.version][date].usage_hours += datum[2];
        });
      });
    } else {
      // group by build id
      _.forEach(this.props.measureData, (build, buildId) => {
        if (this.state.disabledVersions.has(buildId)) {
          return;
        }
        seriesMap[buildId] = {};
        build.data.forEach((datum) => {
          const date = this.state.relative ? datum[0] / 60.0 / 60.0 : new Date(datum[0]);
          seriesMap[buildId][date] = {
            [measure]: datum[1],
            usage_hours: datum[2],
            date: new Date(date)
          };
        });
      });
    }

    // if we have <= 3 series, just return all verbatim
    if (Object.keys(seriesMap).length <= 3) {
      return _.map(seriesMap, (data, name) => ({
        name,
        data: _.values(data)
      })).sort((a, b) => a.name < b.name);
    }

    // take two most recent versions
    let mostRecent = Object.keys(seriesMap).sort().slice(-2);

    // if the second most recent has negligible results (<10% of) relative to the most
    // recent, just concatenate it in with the other results under "other"
    if (_.sum(_.values(seriesMap[mostRecent[0]]).map(d => d.usage_hours)) /
        _.sum(_.values(seriesMap[mostRecent[1]]).map(d => d.usage_hours)) < 0.10) {
      mostRecent = [mostRecent[1]];
    }

    const aggregated = _.reduce(
      _.filter(seriesMap, (series, name) => _.indexOf(mostRecent, name) === (-1)),
      (result, series) => {
        const newResult = _.clone(result);
        _.values(series).forEach((datum) => {
          if (!newResult[datum.date]) {
            newResult[datum.date] = _.clone(datum);
          } else {
            _.keys(newResult[datum.date]).forEach((k) => {
              if (k === measure || k === 'usage_hours') {
                newResult[datum.date][k] += datum[k];
              }
            });
          }
        });
        return newResult;
      }, {}
    );

    return _.concat(mostRecent.map(version => ({
      name: version,
      data: _.values(seriesMap[version])
    })).sort((a, b) => a.name < b.name), [{ name: 'Older', data: _.values(aggregated) }]);
  }

  navigate(newParams, cb) {
    this.setState(newParams, cb);

    // generate a new url string, so we can link to this particular view
    const params = ['timeInterval', 'relative', 'percentile', 'normalized', 'disabledVersions', 'versionGrouping'];
    if (newParams.startTime) {
      // only want to put startTime in url string if it's defined
      params.push('startTime');
    }

    const paramStr = params.map((paramName) => {
      let value = (!_.isUndefined(newParams[paramName])) ? newParams[paramName] : this.state[paramName];
      if (typeof (value) === 'boolean') {
        value = value ? 1 : 0;
      } else if (typeof (value) === 'object') {
        value = Array.from(value);
      }
      return `${paramName}=${value}`;
    }).join('&');
    this.props.history.push(`/${this.state.channel}/${this.state.platform}/${this.state.measure}?${paramStr}`);
  }

  timeIntervalChanged(ev) {
    const index = parseInt(ev.target.value, 10);
    if (index === -1) {
      // => let user select a custom time interval
      this.setState({
        choosingCustomTimeInterval: true
      });
    } else {
      const timeInterval = this.state.relative ?
        TIME_INTERVALS_RELATIVE[index] : this.state.validTimeIntervals[index];
      this.navigate({
        customStartDate: undefined,
        customEndDate: undefined,
        startTime: timeInterval.startTime,
        timeInterval: timeInterval.interval
      }, () => {
        this.fetchMeasureData();
      });
    }
  }

  cancelChooseCustomTimeInterval() {
    this.setState({
      choosingCustomTimeInterval: false
    });
  }

  customTimeIntervalChosen(customStartDate, customEndDate) {
    this.setState({
      choosingCustomTimeInterval: false
    }, () => {
      const startTime = new Date(`${getDateString(customStartDate)}T00:00Z`);
      const endTime = new Date(`${getDateString(customEndDate)}T23:59Z`);
      const timeParams = {
        startTime: parseInt(startTime.getTime() / 1000.0, 10),
        timeInterval: parseInt((endTime - startTime) / 1000.0, 10)
      };
      this.navigate({
        ...timeParams,
        customStartDate,
        customEndDate,
        validTimeIntervals: getValidTimeIntervals(timeParams)
      }, () => {
        this.fetchMeasureData();
      });
    });
  }

  percentileChanged(ev) {
    const index = parseInt(ev.target.value, 10);
    const chosenPercentile = PERCENTILES[index];
    this.navigate({
      percentile: chosenPercentile.value
    }, () => {
      this.setState({
        seriesList: this.getSeriesList()
      });
    });
  }

  relativeChanged(ev) {
    this.navigate({
      relative: !!parseInt(ev.target.value, 10)
    }, () => {
      // changing this implies redownloading the measure data
      this.fetchMeasureData();
    });
  }

  normalizeCheckboxChanged(ev) {
    this.navigate({
      normalized: ev.target.checked
    }, () => {
      this.setState({
        seriesList: this.getSeriesList()
      });
    });
  }

  versionCheckboxChanged(ev) {
    const buildId = ev.target.name;
    const disabled = !ev.target.checked;
    const disabledVersions = new Set(this.state.disabledVersions);

    if (disabled) {
      disabledVersions.add(buildId);
    } else {
      disabledVersions.delete(buildId);
    }

    this.navigate({
      disabledVersions
    }, () => {
      this.setState({
        seriesList: this.getSeriesList()
      });
    });
  }

  toggleVersionGrouping() {
    this.navigate({
      versionGrouping: (this.state.versionGrouping === 'version') ? 'buildid' : 'version',
      disabledVersions: new Set()
    }, () => {
      this.setState({
        seriesList: this.getSeriesList()
      });
    });
  }

  getLegend() {
    if (this.state.versionGrouping === 'buildid') {
      return _.map(this.props.measureData, (data, buildId) => ({
        title: buildId,
        subtitles: [data.version]
      }));
    }

    // otherwise, group all buildids with same version together
    const versionMap = {};
    _.forEach(this.props.measureData, (build, buildId) => {
      if (!versionMap[build.version]) {
        versionMap[build.version] = [];
      }
      versionMap[build.version].push(buildId);
    });
    return Object.keys(versionMap).map(version => ({
      title: version,
      subtitles: versionMap[version]
    }));
  }

  buildIdClicked(buildId) {
    const baseTime = moment.utc(buildId, 'YYYYMMDDHHmmss');
    this.setState({
      choosingCustomTimeInterval: true,
      customStartDate: baseTime,
      customEndDate: moment(baseTime).add(2, 'days')
    });
  }

  render() {
    let crashStatsLink;
    if (this.state.measure in CRASH_STATS_MAPPING && !this.state.relative) {
      const { processType, extraParams } = CRASH_STATS_MAPPING[this.state.measure];
      const queryParams = stringify({
        ...(extraParams ?
          Object.keys(extraParams).reduce((dict, key) => ({ ...dict, [key]: extraParams[key] }), {}) : {}),
        product: 'Firefox',
        version: _.uniq(_
          .reduce(this.props.measureData, (memo, data) => {
            if (!this.state.disabledVersions.has(data.version)) {
              return memo.concat(data.version);
            }
            return memo;
          }, [])),
        platform: this.state.platform,
        process_type: processType,
        date: [
          `>=${moment(Date.now() - (this.state.timeInterval * 1000)).format()}`,
          `<${moment().format()}}`
        ],
        sort: '-date',
        _facets: 'signature',
        _columns: ['date', 'signature', 'product', 'version', 'build_id', 'platform']
      });
      crashStatsLink = `https://crash-stats.mozilla.com/search/?${queryParams}#facet-signature`;
    }
    return (
      <div className="body-container">
        <Helmet>
          <title>
            { `${this.state.platform} ${this.state.channel} ${this.state.measure}` }
          </title>
        </Helmet>

        <SubViewNav
          className="header-element"
          breadcrumbs={[{
            name: 'Home', link: '/'
          }, {
            name: `${this.state.platform} ${this.state.channel}`,
            link: `/${this.state.channel}/${this.state.platform}`
          }, {
            name: this.state.measure,
            link: `/${this.state.channel}/${this.state.platform}/${this.state.measure}`
          }]} />
        <div className="body-element">
          <div className="container center">
            <Row>
              <form className="form-inline">
                <select
                  onChange={this.relativeChanged}
                  className="mb-2 mr-sm-2 mb-sm-0"
                  value={this.state.relative ? 1 : 0}>
                  <option value={0}>Latest data</option>
                  <option value={1}>Relative to time of release</option>
                </select>
                {
                  !this.state.relative &&
                    <FormGroup>
                      <select
                        value={
                          this.state.validTimeIntervals.findIndex(timeInterval =>
                            timeInterval.interval === this.state.timeInterval &&
                            ((this.state.startTime &&
                              (timeInterval.startTime === this.state.startTime)) ||
                             (!this.state.startTime && !timeInterval.startTime)))
                        }
                        onChange={this.timeIntervalChanged}
                        className="mb-2 mr-sm-2 mb-sm-0">
                        {
                          this.state.validTimeIntervals
                            .map((timeInterval, index) => (
                              <option
                                key={`${timeInterval.startTime || ''}-${timeInterval.interval}`}
                                value={index} >
                                {timeInterval.label}
                              </option>
                            ))
                        }
                        <option value="-1">Custom...</option>
                      </select>
                      <DateSelectorModal
                        isOpen={this.state.choosingCustomTimeInterval}
                        toggle={this.cancelChooseCustomTimeInterval}
                        defaultStart={getDateString(this.state.customStartDate)}
                        defaultEnd={getDateString(this.state.customEndDate)}
                        timeIntervalChosen={this.customTimeIntervalChosen} />
                    </FormGroup>
                }
                {
                  this.state.relative &&
                  <select
                    value={
                      TIME_INTERVALS_RELATIVE.findIndex(timeInterval =>
                        timeInterval.interval === this.state.timeInterval)
                      }
                    onChange={this.timeIntervalChanged}
                    className="mb-2 mr-sm-2 mb-sm-0">
                    {
                      TIME_INTERVALS_RELATIVE
                        .map((timeInterval, index) => (
                          <option
                            key={timeInterval.interval}
                            value={index} >
                            {timeInterval.label}
                          </option>
                        ))
                    }
                  </select>

                }
                <select
                  value={
                    PERCENTILES.findIndex(p => p.value === this.state.percentile)
                  }
                  onChange={this.percentileChanged}
                  className="mb-2 mr-sm-2 mb-sm-0">
                  {
                    PERCENTILES
                    .map((p, index) => (
                      <option
                        key={`PERCENTILE-${p.value}`}
                        value={index} >
                        {p.label}
                      </option>
                    ))
                  }
                </select>
                <FormGroup
                  check
                  title="Normalize measure by number of usage hours">
                  <Label check>
                    <Input
                      type="checkbox"
                      checked={this.state.normalized}
                      onChange={this.normalizeCheckboxChanged} />
                    {' '}
                    Normalize
                  </Label>
                </FormGroup>
              </form>
            </Row>
            {
              this.state.isLoading &&
              <Row>
                <Loading />
              </Row>
            }
            {
              !this.state.isLoading &&
              <div>
                <Row>
                  <Col xs="10">
                    <Container>
                      <Row>
                        <Col>
                          <div
                            className="large-graph-container center"
                            id="measure-series">
                            <MeasureDetailGraph
                              measure={this.props.match.params.measure}
                              normalized={this.state.normalized}
                              percentileThreshold={this.state.percentile}
                              seriesList={this.state.seriesList}
                              relative={this.state.relative} />
                          </div>
                        </Col>
                      </Row>
                      <Row>
                        <Col>
                          <div
                            className="large-graph-container center"
                            id="time-series">
                            <DetailGraph
                              title="Usage khours"
                              seriesList={this.state.seriesList}
                              y={'usage_hours'}
                              relative={this.state.relative} />
                          </div>
                        </Col>
                      </Row>
                      <Row>
                        <Col>
                          <div className="text-center">
                            {`Using timezone: ${(new Intl.DateTimeFormat()).resolvedOptions().timeZone}`}
                          </div>
                          {(crashStatsLink) &&
                            <div className="text-center crash-stats-link">
                              <a href={crashStatsLink}>Crash stats detailed view</a>
                            </div>
                          }
                        </Col>
                      </Row>
                    </Container>
                  </Col>
                  <Col xs="2">
                    <FormGroup tag="fieldset">
                      <legend>
                        {
                          this.state.versionGrouping === 'version' ? 'Version' : 'buildid'
                        }
                      </legend>
                      {
                        this.props.measureData &&
                        this.getLegend().sort((a, b) => a.title < b.title)
                          .map(item => (
                            <div key={item.title}>
                              <Label check>
                                <Input
                                  name={item.title}
                                  type="checkbox"
                                  checked={!this.state.disabledVersions.has(item.title)}
                                  onChange={this.versionCheckboxChanged} />
                                {' '}
                                {item.title}
                              </Label>
                              <small>
                                {
                                  (this.state.versionGrouping === 'version') ? (
                                    <ul className="buildid-list">
                                      {
                                        item.subtitles.sort((a, b) => a < b).map(buildId => (
                                          <dd
                                            name={buildId}
                                            className="buildid-link"
                                            onClick={() => this.buildIdClicked(buildId)}
                                            key={`buildid-${buildId}`}>
                                            {buildId}
                                          </dd>
                                        ))
                                      }
                                    </ul>
                                  ) : (
                                    <p>
                                      {item.subtitles[0]}
                                    </p>
                                  )
                                }
                              </small>
                            </div>))
                      }
                    </FormGroup>
                    <Button color="link" size="sm" onClick={this.toggleVersionGrouping}>
                      {`Group by ${this.state.versionGrouping === 'version' ? 'buildid' : 'version'} instead`}
                    </Button>
                  </Col>
                </Row>
              </div>
            }
          </div>
        </div>
      </div>
    );
  }
}

const DetailView = connect(mapStateToProps)(DetailViewComponent);

export default DetailView;
