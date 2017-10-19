import React from 'react';
import Dimensions from 'react-dimensions';
import { curveLinear } from 'd3';
import { timeFormat } from 'd3-time-format';
import MetricsGraphics from 'react-metrics-graphics';


class MeasureGraph extends React.Component {
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
        y_accessor={this.props.y || 'value'}
        xax_format={this.props.xax_format ? timeFormat(this.props.xax_format) : undefined}
        xax_count={this.props.xax_count}
        linked={this.props.linked}
        linked_format={this.props.linked_format}
        aggregate_rollover={true}
        right={120} />);
  }
}

const dimensions = Dimensions;
export default dimensions()(MeasureGraph);
