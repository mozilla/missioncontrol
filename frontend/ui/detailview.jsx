import React from 'react';
import _ from 'lodash';
import { Button, FormGroup, Input, Label, Modal, ModalBody, ModalHeader, ModalFooter, Row, Col } from 'reactstrap';
import { Helmet } from 'react-helmet';
import { connect } from 'react-redux';
import Loading from './loading.jsx';
import MeasureGraph from './measuregraph.jsx';
import SubViewNav from './subviewnav.jsx';
import { DEFAULT_TIME_INTERVAL, OS_MAPPING, TIME_INTERVALS } from '../schema';

const mapStateToProps = (state, ownProps) => {
  const measure = ownProps.match.params.measure;
  if (state.measureDetail.data) {
    const seriesMap = {};
    state.measureDetail.data.forEach((aggregate) => {
      if (!seriesMap[aggregate.version]) {
        seriesMap[aggregate.version] = [];
      }
      seriesMap[aggregate.version].push(aggregate);
    });

    if (Object.keys(seriesMap).length < 3) {
      return {
        status: 'success',
        seriesList: _.map(seriesMap, (data, version) => ({
          name: version,
          data
        }))
      };
    }

    // take two most recent versions
    let mostRecent = Object.keys(seriesMap).sort().slice(-2);

    // if the second most recent has negligible results (<10% of) relative to the most
    // recent, just concatenate it in with the other results under "other"
    if (_.sum(seriesMap[mostRecent[0]].map(d => d.usage_hours)) /
        _.sum(seriesMap[mostRecent[1]].map(d => d.usage_hours)) < 0.10) {
      mostRecent = [mostRecent[1]];
    }

    const aggregated = _.reduce(
      _.filter(seriesMap, (series, version) => _.indexOf(mostRecent, version) === (-1)),
      (result, series) => {
        const newResult = _.clone(result);
        series.forEach((datum) => {
          if (!result[datum.time]) {
            newResult[datum.time] = _.clone(datum);
          } else {
            Object.keys(result[datum.time]).forEach((k) => {
              if (k === measure || k === 'usage_hours') {
                newResult[datum.time][k] += datum[k];
              }
            });
          }
        });
        return newResult;
      }, {});

    const seriesList = _.concat(mostRecent.map(version => ({
      name: version,
      data: seriesMap[version]
    })), [{ name: 'Older', data: _.values(aggregated) }]);

    return {
      status: 'success',
      seriesList
    };
  }
  return {
    status: 'loading',
    seriesList: []
  };
};

const normalizeSeries = (seriesList, measure) =>
 seriesList.map(series => ({
   ...series,
   data: series.data.map(d => ({
     ...d,
     [measure]: d[measure] / (d.usage_hours / 1000.0)
   }))
 }));

const getOptionalParameters = (props) => {
  const urlParams = new URLSearchParams(props.location.search);
  const dateParamRe = /^(\d+-\d+-\d+)-(\d+-\d+-\d+)$/;

  // time interval can either be specified as an interval (starting from the present) or a set of dates
  const validTimeIntervals = _.clone(TIME_INTERVALS);
  let timeInterval = urlParams.get('timeInterval') ? urlParams.get('timeInterval') : DEFAULT_TIME_INTERVAL;
  if (_.isString(timeInterval)) {
    if (timeInterval.match(dateParamRe)) {
      const args = timeInterval.match(dateParamRe);
      timeInterval = {
        startDate: new Date(args[1]),
        endDate: new Date(args[2])
      };
      validTimeIntervals.unshift({
        label: `${args[1]} → ${args[2]}`,
        value: timeInterval
      });
    } else {
      timeInterval = parseInt(timeInterval, 10);
    }
  }

  // coerce normalized into a boolean, true if not specified
  let normalized = true;
  if (urlParams.get('normalized')) {
    normalized = (parseInt(urlParams.get('normalized'), 10));
  }

  return {
    timeInterval,
    validTimeIntervals,
    normalized
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
      customStartDate: undefined,
      customEndDate: undefined,
      fetchVersionData: this.props.fetchVersionData,
      fetchMeasureDetailData: this.props.fetchMeasureDetailData,
      ...getOptionalParameters(props)
    };

    this.timeIntervalChanged = this.timeIntervalChanged.bind(this);
    this.cancelChooseCustomTimeInterval = this.cancelChooseCustomTimeInterval.bind(this);
    this.customTimeIntervalChosen = this.customTimeIntervalChosen.bind(this);
    this.customStartDateChanged = this.customStartDateChanged.bind(this);
    this.customEndDateChanged = this.customEndDateChanged.bind(this);
    this.isCustomTimeIntervalValid = this.isCustomTimeIntervalValid.bind(this);
    this.normalizeCheckboxChanged = this.normalizeCheckboxChanged.bind(this);
  }

  componentDidMount() {
    this.fetchMeasureDetailData(this.state);
  }

  fetchMeasureDetailData(params) {
    this.setState({ isLoading: true });
    this.state.fetchMeasureDetailData({
      dimensions: ['version'],
      measures: [params.measure, 'usage_hours'],
      interval: [params.timeInterval],
      os_names: [_.findKey(OS_MAPPING,
        mappedValue => mappedValue === params.platform)
      ],
      channels: [params.channel]
    }).then(() => this.setState({ isLoading: false }));
  }

  componentWillUpdate(nextProps) {
    const params = getOptionalParameters(nextProps);
    if (!_.every(['timeInterval', 'normalized'].map(
      param => _.isEqual(params[param], this.state[param])))) {
      this.setState({
        ...params
      });
    }
    // need to reload everything if time interval changes
    if (!_.isEqual(params.timeInterval, this.state.timeInterval)) {
      this.fetchMeasureDetailData({
        ...this.state,
        ...params
      });
    }
  }

  navigate(newParams) {
    const paramStr = ['timeInterval', 'normalized'].map((paramName) => {
      let value = (!_.isUndefined(newParams[paramName])) ? newParams[paramName] : this.state[paramName];
      if (typeof (value) === 'boolean') {
        value = value ? 1 : 0;
      }
      return `${paramName}=${value}`;
    }).join('&');
    this.props.history.push(`/${this.state.channel}/${this.state.platform}/${this.state.measure}?${paramStr}`);
  }

  timeIntervalChanged(ev) {
    const value = parseInt(ev.target.value, 10);
    if (!value) {
      // value = 0 => let user select a custom time interval
      this.setState({
        choosingCustomTimeInterval: true,
        customStartDate: undefined,
        customEndDate: undefined
      });
    } else {
      this.navigate({
        timeInterval: value
      });
    }
  }

  customStartDateChanged(ev) {
    this.setState({
      customStartDate: ev.target.value
    });
  }

  customEndDateChanged(ev) {
    this.setState({
      customEndDate: ev.target.value
    });
  }

  cancelChooseCustomTimeInterval() {
    this.setState({
      choosingCustomTimeInterval: false
    });
  }

  customTimeIntervalChosen() {
    this.setState({
      choosingCustomTimeInterval: false
    });
    const timeIntervalStr = `${this.state.customStartDate}-${this.state.customEndDate}`;
    this.props.history.push(`/${this.state.channel}/${this.state.platform}/${this.state.measure}?timeInterval=${timeIntervalStr}`);
  }

  isCustomTimeIntervalValid() {
    return (this.state.customStartDate && this.state.customEndDate &&
            this.state.customStartDate < this.state.customEndDate);
  }

  normalizeCheckboxChanged(ev) {
    this.navigate({
      normalized: ev.target.checked
    });
  }

  render() {
    return (
      <div>
        <Helmet>
          <title>
            { `${this.state.platform} ${this.state.channel} ${this.state.measure}` }
          </title>
        </Helmet>

        <SubViewNav
          breadcrumbs={[
            { name: 'Home', link: '/' },
            { name: `${this.state.platform} ${this.state.channel}`,
              link: `/${this.state.channel}/${this.state.platform}` },
            { name: this.state.measure,
              link: `/${this.state.channel}/${this.state.platform}/${this.state.measure}` }
          ]} />
        <div className="container center">
          <Row>
            <form className="form-inline">
              <select
                value={this.state.timeInterval}
                onChange={this.timeIntervalChanged}
                className="mb-2 mr-sm-2 mb-sm-0">
                {
                  this.state.validTimeIntervals.map(
                    timeInterval => (
                      <option
                        key={timeInterval.value}
                        value={timeInterval.value}>
                        {timeInterval.label}
                      </option>
                    )
                  )
                }
                <option value="0">Custom...</option>
              </select>
              <Modal
                isOpen={this.state.choosingCustomTimeInterval}
                toggle={this.cancelChooseCustomTimeInterval}>
                <ModalHeader toggle={this.cancelChooseCustomTimeInterval}>
                  Custom Date Range
                </ModalHeader>
                <ModalBody>
                  <FormGroup>
                    <Label for="startDate">
                      Start Date
                    </Label>
                    <Input
                      type="date"
                      onChange={this.customStartDateChanged}
                      id="startDate" />
                  </FormGroup>
                  <FormGroup>
                    <Label for="endDate">
                      End Date
                    </Label>
                    <Input
                      type="date"
                      onChange={this.customEndDateChanged}
                      id="endDate" />
                  </FormGroup>
                </ModalBody>
                <ModalFooter>
                  <Button
                    color="primary"
                    disabled={!this.isCustomTimeIntervalValid()}
                    onClick={this.customTimeIntervalChosen}>Ok</Button>
                </ModalFooter>
              </Modal>
              <FormGroup check title="Normalize measure by number of usage hours">
                <Label check>
                  <Input type="checkbox" checked={this.state.normalized} onChange={this.normalizeCheckboxChanged} />
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
                <Col>
                  <div
                    className="large-graph-container center"
                    id="measure-series">
                    <MeasureGraph
                      title={`${this.props.match.params.measure} ${(this.state.normalized) ? 'per 1k hours' : ''}`}
                      seriesList={
                        (this.state.normalized) ?
                        normalizeSeries(this.props.seriesList, this.props.match.params.measure) :
                        this.props.seriesList
                      }
                      y={`${this.props.match.params.measure}`}
                      linked={true}
                      linked_format="%Y-%m-%d-%H-%M-%S"
                      width={800}
                      height={200} />
                  </div>
                </Col>
              </Row>
              <Row>
                <Col>
                  <div
                    className="large-graph-container center"
                    id="time-series">
                    <MeasureGraph
                      title="Usage khours"
                      seriesList={this.props.seriesList}
                      y={'usage_hours'}
                      linked={true}
                      linked_format="%Y-%m-%d-%H-%M-%S"
                      width={800}
                      height={200} />
                  </div>
                </Col>
              </Row>
            </div>
          }
        </div>
      </div>
    );
  }
}

const DetailView = connect(mapStateToProps)(DetailViewComponent);

export default DetailView;
