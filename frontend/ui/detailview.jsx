import _ from 'lodash';
import moment from 'moment';
import percentile from 'aggregatejs/percentile';
import React from 'react';
import {
  Button,
  FormGroup,
  Input,
  Label,
  Row,
  Col,
  Container,
} from 'reactstrap';
import { Helmet } from 'react-helmet';
import { connect } from 'react-redux';
import { stringify } from 'query-string';
import Loading from './loading';
import DateSelectorModal from './dateselectormodal';
import DetailGraph from './detailgraph';
import SubViewNav from './subviewnav';
import {
  DEFAULT_AGGREGATE_LENGTH,
  AGGREGATE_LENGTHS,
  AGGREGATE_LENGTH_5MIN,
  AGGREGATE_LENGTH_60MIN,
  DEFAULT_PERCENTILE,
  DEFAULT_TIME_INTERVAL,
  DEFAULT_TIME_INTERVAL_RELATIVE,
  DEFAULT_VERSION_GROUPING_TYPE,
  CRASH_STATS_MAPPING,
  PERCENTILES,
  TIME_INTERVALS,
  TIME_INTERVALS_RELATIVE,
} from '../schema';
import { semVerCompare } from '../version';

const mapStateToProps = (state, ownProps) => {
  const { measure } = ownProps.match.params;
  const cacheKey = `${ownProps.match.params.platform}-${
    ownProps.match.params.channel
  }-${measure}`;
  const measureData = state.measures[cacheKey];

  return { measureData };
};

const getDateString = date => {
  // input could be either a javascript date object or undefined
  if (!date) return '';

  return date.toISOString().slice(0, 10);
};

const getValidTimeIntervals = params => {
  const timeIntervals = _.clone(TIME_INTERVALS);

  if (params.startTime) {
    const startTimeMs = parseInt(params.startTime * 1000.0, 10);
    const [startDateStr, endDateStr] = [
      startTimeMs,
      startTimeMs + params.timeInterval * 1000,
    ].map(time => moment(time).format('ddd MMM D'));

    timeIntervals.unshift({
      label: `${startDateStr} → ${endDateStr}`,
      startTime: params.startTime,
      interval: params.timeInterval,
    });
  }

  return timeIntervals;
};

const getOptionalParameters = props => {
  const urlParams = new URLSearchParams(props.location.search);
  // relative to most recent version (true/false), false if not
  // specified
  const relative = !!parseInt(urlParams.get('relative'), 10);
  // time interval can either be an interval (starting from or working back from
  // the present, depending on whether we are relative to most recent version)
  // or a parameter when getting the date range (non-relative mode only)
  let timeInterval = parseInt(
    urlParams.get('timeInterval') ? urlParams.get('timeInterval') : 0,
    10
  );

  if (!timeInterval) {
    timeInterval = relative
      ? DEFAULT_TIME_INTERVAL_RELATIVE
      : DEFAULT_TIME_INTERVAL;
  }

  let startTime = urlParams.get('startTime');
  let customStartDate;
  let customEndDate;

  if (startTime) {
    startTime = parseInt(startTime, 10);
    customStartDate = new Date(startTime * 1000);
    customEndDate = new Date((startTime + timeInterval) * 1000);
  }

  const aggregateLength = parseInt(
    urlParams.get('aggregateLength')
      ? urlParams.get('aggregateLength')
      : DEFAULT_AGGREGATE_LENGTH,
    10
  );
  // grouping can be either by build id or by version
  const versionGrouping = urlParams.has('versionGrouping')
    ? urlParams.get('versionGrouping')
    : DEFAULT_VERSION_GROUPING_TYPE;
  // percentile filter of data
  const percentileThreshold = parseInt(
    urlParams.has('percentile')
      ? urlParams.get('percentile')
      : DEFAULT_PERCENTILE,
    10
  );
  // coerce normalized into a boolean, true if not specified
  let normalized = true;

  if (urlParams.has('normalized')) {
    normalized = parseInt(urlParams.get('normalized'), 10);
  }

  // likewise with skipFirst24 (but false if not specified)
  let skipFirst24 = false;

  if (urlParams.has('skipFirst24')) {
    skipFirst24 = parseInt(urlParams.get('normalized'), 10);
  }

  // disabledVersions is a comma-seperated list when specified
  const disabledVersions = new Set(
    urlParams.has('disabledVersions')
      ? urlParams.get('disabledVersions').split(',')
      : []
  );

  return {
    aggregateLength,
    startTime,
    customStartDate,
    customEndDate,
    timeInterval,
    relative,
    normalized,
    skipFirst24,
    disabledVersions,
    versionGrouping,
    percentile: percentileThreshold,
    validTimeIntervals: getValidTimeIntervals({
      startTime,
      timeInterval,
    }),
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
      ...getOptionalParameters(props),
    };

    this.handleTimeIntervalChanged = this.handleTimeIntervalChanged.bind(this);
    // prettier-ignore
    this.cancelChooseCustomTimeInterval =
      this.cancelChooseCustomTimeInterval.bind(this);
    this.handleRelativeChanged = this.handleRelativeChanged.bind(this);
    this.handleSkipFirst24Changed = this.handleSkipFirst24Changed.bind(this);
    this.handleAggregateLengthChanged = this.handleAggregateLengthChanged.bind(
      this
    );
    this.handlePercentileChanged = this.handlePercentileChanged.bind(this);
    this.handleNormalizeChanged = this.handleNormalizeChanged.bind(this);
    this.handleVersionChanged = this.handleVersionChanged.bind(this);
    this.handleToggleVersionGrouping = this.handleToggleVersionGrouping.bind(
      this
    );
    this.customTimeIntervalChosen = this.customTimeIntervalChosen.bind(this);
  }

  componentDidMount() {
    this.fetchMeasureData(this.state);
  }

  fetchMeasureData() {
    this.setState({ isLoading: true });
    this.state
      .fetchMeasureData(
        _.pickBy(
          {
            measure: this.state.measure,
            channel: this.state.channel,
            platform: this.state.platform,
            relative: this.state.relative ? 1 : undefined,
            interval: this.state.timeInterval,
            start: this.state.startTime,
          },
          a => !(_.isUndefined(a) || _.isNull(a))
        )
      )
      .then(() =>
        this.setState({
          seriesList: this.getSeriesList(),
          isLoading: false,
        })
      );
  }

  getRawSeriesList() {
    const { measure } = this.props.match.params;
    const seriesMap = {};

    if (this.state.versionGrouping === 'version') {
      _.forEach(this.props.measureData, build => {
        if (this.state.disabledVersions.has(build.version)) {
          return;
        }

        if (!seriesMap[build.version]) {
          seriesMap[build.version] = {};
        }

        build.data.forEach(datum => {
          const dateKey = datum[0];
          const date = this.state.relative
            ? dateKey / 60.0 / 60.0
            : new Date(dateKey);

          if (this.state.relative && this.state.skipFirst24 && date < 24) {
            // if skipping the first 24 hours, filter out any datums within
            // that interval
            return;
          }

          if (!seriesMap[build.version][dateKey]) {
            seriesMap[build.version][dateKey] = {
              [measure]: 0,
              usage_hours: 0,
              date,
            };
          }

          seriesMap[build.version][dateKey][measure] += datum[1];
          seriesMap[build.version][dateKey].usage_hours += datum[2];
        });
      });
    } else {
      // group by build id
      _.forEach(this.props.measureData, (build, buildId) => {
        if (this.state.disabledVersions.has(buildId)) {
          return;
        }

        seriesMap[buildId] = {};
        build.data.forEach(datum => {
          const dateKey = datum[0];
          const date = this.state.relative
            ? dateKey / 60.0 / 60.0
            : new Date(dateKey);

          seriesMap[buildId][dateKey] = {
            [measure]: datum[1],
            usage_hours: datum[2],
            date,
          };
        });
      });
    }

    const sortedSeriesValues = data =>
      _.values(data).sort((a, b) => a.date - b.date);

    // if we have <= 3 series, just return all verbatim
    if (Object.keys(seriesMap).length <= 3) {
      return _.map(seriesMap, (data, name) => ({
        name,
        data: sortedSeriesValues(data),
      }))
        .sort((a, b) => semVerCompare(a.name, b.name))
        .reverse();
    }

    // take two most recent versions
    let mostRecent = Object.keys(seriesMap)
      .sort(semVerCompare)
      .slice(-2);

    // if the second most recent has negligible results (<10% of) relative
    // to the most recent, just concatenate it in with the other results under
    // "other"
    if (
      _.sum(_.values(seriesMap[mostRecent[0]]).map(d => d.usage_hours)) /
        _.sum(_.values(seriesMap[mostRecent[1]]).map(d => d.usage_hours)) <
      0.1
    ) {
      mostRecent = [mostRecent[1]];
    }

    const aggregated = _.reduce(
      _.filter(seriesMap, (series, name) => _.indexOf(mostRecent, name) === -1),
      (result, series) => {
        const newResult = _.clone(result);

        _.values(series).forEach(datum => {
          if (!newResult[datum.date]) {
            newResult[datum.date] = _.clone(datum);
          } else {
            _.keys(newResult[datum.date]).forEach(k => {
              if (k === measure || k === 'usage_hours') {
                newResult[datum.date][k] += datum[k];
              }
            });
          }
        });

        return newResult;
      },
      {}
    );

    return _.concat(
      mostRecent
        .map(version => ({
          name: version,
          data: sortedSeriesValues(seriesMap[version]),
        }))
        .sort((a, b) => semVerCompare(a.name, b.name))
        .reverse(),
      [{ name: 'Older', data: sortedSeriesValues(aggregated) }]
    );
  }

  getSeriesList() {
    const { measure } = this.props.match.params;
    let seriesList = this.getRawSeriesList();

    if (this.state.percentile < 100) {
      seriesList = seriesList.map(series => {
        const threshold = percentile(
          series.data.map(d => d[measure]),
          this.state.percentile / 100.0
        );

        return {
          ...series,
          data: series.data.filter(d => d[measure] <= threshold),
        };
      });
    }

    if (this.state.aggregateLength > AGGREGATE_LENGTH_5MIN) {
      const dateRounder = date => {
        if (this.state.relative) {
          return date - date % this.state.aggregateLength;
        }

        if (this.state.aggregateLength === AGGREGATE_LENGTH_60MIN) {
          return new Date(date.setMinutes(0));
        }

        // 1 day
        return new Date(new Date(date.setMinutes(0)).setHours(0));
      };

      seriesList = seriesList.map(series => ({
        ...series,
        data: series.data.reduce((data, datum) => {
          const newData = _.clone(data);
          const newDate = dateRounder(datum.date);

          if (
            newData.length > 0 &&
            +newData[newData.length - 1].date === +newDate
          ) {
            Object.keys(newData[newData.length - 1]).forEach(k => {
              if (k !== 'date') {
                newData[newData.length - 1][k] += datum[k];
              }
            });
          } else {
            newData.push({ ...datum, date: newDate });
          }

          return newData;
        }, []),
      }));
    }

    if (this.state.normalized) {
      seriesList = seriesList.map(series => ({
        ...series,
        data: series.data.map(d => ({
          ...d,
          [measure]: d[measure] / (d.usage_hours / 1000.0),
        })),
      }));
    }

    return seriesList;
  }

  navigate(newParams, cb) {
    this.setState(newParams, cb);

    // generate a new url string, so we can link to this particular view
    const params = [
      'aggregateLength',
      'timeInterval',
      'relative',
      'percentile',
      'normalized',
      'disabledVersions',
      'versionGrouping',
    ];

    // only want to put startTime, skipFirst24 in url string if they are
    // defined
    ['skipFirst24', 'startTime'].forEach(param => {
      if (newParams[param]) {
        params.push(param);
      }
    });

    const paramStr = params
      .map(paramName => {
        let value = !_.isUndefined(newParams[paramName])
          ? newParams[paramName]
          : this.state[paramName];

        if (typeof value === 'boolean') {
          value = value ? 1 : 0;
        } else if (typeof value === 'object') {
          value = Array.from(value);
        }

        return `${paramName}=${value}`;
      })
      .join('&');

    this.props.history.push(
      `/${this.state.channel}/${this.state.platform}/${
        this.state.measure
      }?${paramStr}`
    );
  }

  handleTimeIntervalChanged(ev) {
    const index = parseInt(ev.target.value, 10);

    if (index === -1) {
      // => let user select a custom time interval
      this.setState({
        choosingCustomTimeInterval: true,
      });
    } else {
      const timeInterval = this.state.relative
        ? TIME_INTERVALS_RELATIVE[index]
        : this.state.validTimeIntervals[index];
      const skipFirst24 =
        timeInterval.interval > 0 && timeInterval.interval <= 86400
          ? undefined
          : this.state.skipFirst24;

      this.navigate(
        {
          customStartDate: undefined,
          customEndDate: undefined,
          startTime: timeInterval.startTime,
          timeInterval: timeInterval.interval,
          skipFirst24,
        },
        () => {
          this.fetchMeasureData();
        }
      );
    }
  }

  cancelChooseCustomTimeInterval() {
    this.setState({
      choosingCustomTimeInterval: false,
    });
  }

  customTimeIntervalChosen(customStartDate, customEndDate) {
    this.setState(
      {
        choosingCustomTimeInterval: false,
      },
      () => {
        const startTime = new Date(`${getDateString(customStartDate)}T00:00Z`);
        const endTime = new Date(`${getDateString(customEndDate)}T23:59Z`);
        const timeParams = {
          startTime: parseInt(startTime.getTime() / 1000.0, 10),
          timeInterval: parseInt((endTime - startTime) / 1000.0, 10),
        };

        this.navigate(
          {
            ...timeParams,
            customStartDate,
            customEndDate,
            validTimeIntervals: getValidTimeIntervals(timeParams),
          },
          () => {
            this.fetchMeasureData();
          }
        );
      }
    );
  }

  handleSkipFirst24Changed(ev) {
    this.navigate(
      {
        skipFirst24: ev.target.checked,
      },
      () => {
        this.setState({
          seriesList: this.getSeriesList(),
        });
      }
    );
  }

  handleAggregateLengthChanged(ev) {
    const index = parseInt(ev.target.value, 10);
    const chosenAggregateLength = AGGREGATE_LENGTHS[index];

    this.navigate(
      {
        aggregateLength: chosenAggregateLength.value,
      },
      () => {
        this.setState({
          seriesList: this.getSeriesList(),
        });
      }
    );
  }

  handlePercentileChanged(ev) {
    const index = parseInt(ev.target.value, 10);
    const chosenPercentile = PERCENTILES[index];

    this.navigate(
      {
        percentile: chosenPercentile.value,
      },
      () => {
        this.setState({
          seriesList: this.getSeriesList(),
        });
      }
    );
  }

  handleRelativeChanged(ev) {
    const relative = !!parseInt(ev.target.value, 10);

    this.navigate(
      {
        timeInterval: relative
          ? DEFAULT_TIME_INTERVAL_RELATIVE
          : DEFAULT_TIME_INTERVAL,
        relative,
      },
      () => {
        // changing this implies redownloading the measure data
        this.fetchMeasureData();
      }
    );
  }

  handleNormalizeChanged(ev) {
    this.navigate(
      {
        normalized: ev.target.checked,
      },
      () => {
        this.setState({
          seriesList: this.getSeriesList(),
        });
      }
    );
  }

  handleVersionChanged(ev) {
    const buildId = ev.target.name;
    const disabled = !ev.target.checked;
    const disabledVersions = new Set(this.state.disabledVersions);

    if (disabled) {
      disabledVersions.add(buildId);
    } else {
      disabledVersions.delete(buildId);
    }

    this.navigate(
      {
        disabledVersions,
      },
      () => {
        this.setState({
          seriesList: this.getSeriesList(),
        });
      }
    );
  }

  handleToggleVersionGrouping() {
    this.navigate(
      {
        versionGrouping:
          this.state.versionGrouping === 'version' ? 'buildid' : 'version',
        disabledVersions: new Set(),
      },
      () => {
        this.setState({
          seriesList: this.getSeriesList(),
        });
      }
    );
  }

  getLegend() {
    if (this.state.versionGrouping === 'buildid') {
      return _.map(this.props.measureData, (data, buildId) => ({
        title: buildId,
        subtitles: [data.version],
      }))
        .sort()
        .reverse();
    }

    // otherwise, group all buildids with same version together
    const versionMap = {};

    _.forEach(this.props.measureData, (build, buildId) => {
      if (!versionMap[build.version]) {
        versionMap[build.version] = [];
      }

      versionMap[build.version].push(buildId);
    });

    return Object.keys(versionMap)
      .map(version => ({
        title: version,
        subtitles: versionMap[version],
      }))
      .sort((a, b) => semVerCompare(a.title, b.title))
      .reverse();
  }

  buildIdClicked(buildId) {
    const baseTime = moment.utc(buildId, 'YYYYMMDDHHmmss');

    this.setState({
      choosingCustomTimeInterval: true,
      customStartDate: baseTime,
      customEndDate: moment(baseTime).add(2, 'days'),
    });
  }

  render() {
    let crashStatsLink;

    if (this.state.measure in CRASH_STATS_MAPPING && !this.state.relative) {
      const { processType, extraParams } = CRASH_STATS_MAPPING[
        this.state.measure
      ];
      const queryParams = stringify({
        ...(extraParams
          ? Object.keys(extraParams).reduce(
              (dict, key) => ({ ...dict, [key]: extraParams[key] }),
              {}
            )
          : {}),
        product:
          this.state.platform === 'android' ? 'FennecAndroid' : 'Firefox',
        version: _.uniq(
          _.reduce(
            this.props.measureData,
            (memo, data) => {
              if (!this.state.disabledVersions.has(data.version)) {
                return memo.concat(data.version);
              }

              return memo;
            },
            []
          )
        ),
        platform: this.state.platform,
        process_type: processType,
        date: [
          `>=${moment(Date.now() - this.state.timeInterval * 1000).format()}`,
          `<${moment().format()}`,
        ],
        sort: '-date',
        _facets: 'signature',
        _columns: [
          'date',
          'signature',
          'product',
          'version',
          'build_id',
          'platform',
        ],
      });

      crashStatsLink = `https://crash-stats.mozilla.com/search/?${queryParams}#facet-signature`;
    }

    return (
      <div className="body-container">
        <Helmet>
          <title>
            {`${this.state.platform} ${this.state.channel} ${
              this.state.measure
            }`}
          </title>
        </Helmet>

        <SubViewNav
          className="header-element"
          breadcrumbs={[
            {
              name: 'Home',
              link: `/?channel=${this.state.channel}`,
            },
            {
              name: `${this.state.platform} ${this.state.channel}`,
              link: `/${this.state.channel}/${this.state.platform}`,
            },
            {
              name: this.state.measure,
              link: `/${this.state.channel}/${this.state.platform}/${
                this.state.measure
              }`,
            },
          ]}
        />
        <div className="body-element">
          <div className="container center">
            <Row>
              <form className="form-inline">
                <select
                  onChange={this.handleRelativeChanged}
                  className="mb-2 mr-sm-2 mb-sm-0"
                  value={this.state.relative ? 1 : 0}>
                  <option value={0}>Latest data</option>
                  <option value={1}>Relative to time of release</option>
                </select>
                {!this.state.relative && (
                  <FormGroup>
                    <select
                      value={this.state.validTimeIntervals.findIndex(
                        timeInterval =>
                          timeInterval.interval === this.state.timeInterval &&
                          ((this.state.startTime &&
                            timeInterval.startTime === this.state.startTime) ||
                            (!this.state.startTime && !timeInterval.startTime))
                      )}
                      onChange={this.handleTimeIntervalChanged}
                      className="mb-2 mr-sm-2 mb-sm-0">
                      {this.state.validTimeIntervals.map(
                        (timeInterval, index) => (
                          <option
                            key={`${timeInterval.startTime || ''}-${
                              timeInterval.interval
                            }`}
                            value={index}>
                            {timeInterval.label}
                          </option>
                        )
                      )}
                      <option value="-1">Custom...</option>
                    </select>
                    <DateSelectorModal
                      isOpen={this.state.choosingCustomTimeInterval}
                      toggle={this.cancelChooseCustomTimeInterval}
                      defaultStart={getDateString(this.state.customStartDate)}
                      defaultEnd={getDateString(this.state.customEndDate)}
                      timeIntervalChosen={this.customTimeIntervalChosen}
                    />
                  </FormGroup>
                )}
                {this.state.relative && (
                  <FormGroup>
                    <select
                      value={TIME_INTERVALS_RELATIVE.findIndex(
                        timeInterval =>
                          timeInterval.interval === this.state.timeInterval
                      )}
                      onChange={this.handleTimeIntervalChanged}
                      className="mb-2 mr-sm-2 mb-sm-0">
                      {TIME_INTERVALS_RELATIVE.map((timeInterval, index) => (
                        <option key={timeInterval.interval} value={index}>
                          {timeInterval.label}
                        </option>
                      ))}
                    </select>
                    <FormGroup check title="Skip first 24 hours after release">
                      <Label for="skip-first-24-checkbox" check>
                        <Input
                          id="skip-first-24-checkbox"
                          type="checkbox"
                          checked={this.state.skipFirst24}
                          disabled={
                            this.state.timeInterval > 0 &&
                            this.state.timeInterval <= 86400
                          }
                          onChange={this.handleSkipFirst24Changed}
                        />{' '}
                        Skip first 24 hours
                      </Label>
                    </FormGroup>
                    &nbsp;&nbsp;
                  </FormGroup>
                )}
                <select
                  value={AGGREGATE_LENGTHS.findIndex(
                    p => p.value === this.state.aggregateLength
                  )}
                  onChange={this.handleAggregateLengthChanged}
                  className="mb-2 mr-sm-2 mb-sm-0">
                  {AGGREGATE_LENGTHS.map((p, index) => (
                    <option key={`AGGREGATE_LENGTH-${p.value}`} value={index}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <select
                  value={PERCENTILES.findIndex(
                    p => p.value === this.state.percentile
                  )}
                  onChange={this.handlePercentileChanged}
                  className="mb-2 mr-sm-2 mb-sm-0">
                  {PERCENTILES.map((p, index) => (
                    <option key={`PERCENTILE-${p.value}`} value={index}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <FormGroup
                  check
                  title="Normalize measure by number of usage hours">
                  <Label check>
                    <Input
                      type="checkbox"
                      checked={this.state.normalized}
                      onChange={this.handleNormalizeChanged}
                    />{' '}
                    Normalize
                  </Label>
                </FormGroup>
              </form>
            </Row>
            {this.state.isLoading && (
              <Row>
                <Loading />
              </Row>
            )}
            {!this.state.isLoading && (
              <div>
                <Row>
                  <Col xs="10">
                    <Container>
                      <Row>
                        <Col>
                          <div
                            className="large-graph-container center"
                            id="measure-series">
                            <DetailGraph
                              title={`${this.props.match.params.measure} ${
                                this.state.normalized ? 'per 1k hours' : ''
                              }`}
                              y={this.props.match.params.measure}
                              seriesList={this.state.seriesList}
                              relative={this.state.relative}
                              aggregateLength={this.state.aggregateLength}
                            />
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
                              y="usage_hours"
                              relative={this.state.relative}
                            />
                          </div>
                        </Col>
                      </Row>
                      <Row>
                        <Col>
                          <div className="text-center">
                            {`Using timezone: ${
                              new Intl.DateTimeFormat().resolvedOptions()
                                .timeZone
                            }`}
                          </div>
                          {crashStatsLink && (
                            <div className="text-center crash-stats-link">
                              <a href={crashStatsLink}>
                                Crash stats detailed view
                              </a>
                            </div>
                          )}
                        </Col>
                      </Row>
                    </Container>
                  </Col>
                  <Col xs="2">
                    <FormGroup tag="fieldset">
                      <legend>
                        {this.state.versionGrouping === 'version'
                          ? 'Version'
                          : 'buildid'}
                      </legend>
                      {this.props.measureData &&
                        this.getLegend().map(item => (
                          <div key={item.title}>
                            <Label check>
                              <Input
                                name={item.title}
                                type="checkbox"
                                checked={
                                  !this.state.disabledVersions.has(item.title)
                                }
                                onChange={this.handleVersionChanged}
                              />{' '}
                              {item.title}
                            </Label>
                            <small>
                              {this.state.versionGrouping === 'version' ? (
                                <ul className="list-unstyled">
                                  {item.subtitles
                                    .sort((a, b) => a < b)
                                    .map(buildId => (
                                      <dd
                                        name={buildId}
                                        className="buildid-link"
                                        key={`buildid-${buildId}`}>
                                        <Button
                                          color="link"
                                          onClick={() =>
                                            this.buildIdClicked(buildId)
                                          }>
                                          {buildId}
                                        </Button>
                                      </dd>
                                    ))}
                                </ul>
                              ) : (
                                <p>{item.subtitles[0]}</p>
                              )}
                            </small>
                          </div>
                        ))}
                    </FormGroup>
                    <Button
                      color="link"
                      size="sm"
                      onClick={this.handleToggleVersionGrouping}>
                      {`Group by ${
                        this.state.versionGrouping === 'version'
                          ? 'buildid'
                          : 'version'
                      } instead`}
                    </Button>
                  </Col>
                </Row>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}

const DetailView = connect(mapStateToProps)(DetailViewComponent);

export default DetailView;
