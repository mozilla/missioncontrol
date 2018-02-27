import React from 'react';
import _ from 'lodash';
import Dimensions from 'react-dimensions';
import { curveLinear } from 'd3';
import MetricsGraphics from 'react-metrics-graphics';


class DetailGraph extends React.Component {
  shouldComponentUpdate(nextProps) {
    return !_.isEqual(this.props.seriesList, nextProps.seriesList) ||
      this.props.containerWidth !== nextProps.containerWidth ||
      this.props.containerHeight !== nextProps.containerHeight;
  }

  render() {
    const numSeries = this.props.seriesList.length;
    return (
      <MetricsGraphics
        title={this.props.title}
        chart_type={!numSeries ? 'missing-data' : undefined}
        legend={numSeries > 1 ? this.props.seriesList.map(s => s.name) : undefined}
        data={numSeries ? this.props.seriesList.map(s => s.data) : undefined}
        width={this.props.containerWidth}
        height={this.props.height || this.props.containerHeight}
        interpolate={curveLinear}
        missing_text="No data for this measure"
        x_accessor="date"
        y_accessor={this.props.y}
        x_label={this.props.relative ? 'Hours since release' : undefined}
        x_mouseover={this.props.relative ? s => `Hour: ${s.key.toFixed(2)}` : undefined}
        y_mouseover={this.props.relative ? s => s[this.props.y].toFixed(2) : undefined}
        linked={true}
        linked_format={this.props.relative ? undefined : '%Y-%m-%d-%H-%M-%S'}
        aggregate_rollover={true}
        y_extended_ticks={true}
        right={Math.min(120, 40 + (5 * (this.props.seriesList.length ?
                                        _.max(this.props.seriesList.map(s => s.name.length)) : 0)))} />);
  }
}

const dimensions = Dimensions;
export default dimensions()(DetailGraph);
