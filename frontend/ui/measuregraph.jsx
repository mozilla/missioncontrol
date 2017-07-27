import React from 'react';
import { curveLinear } from 'd3';
import { timeFormat } from 'd3-time-format';
import MetricsGraphics from 'react-metrics-graphics';

export default class MeasureGraph extends React.Component {
  render() {
    const numSeries = this.props.seriesList.length;
    return (
      <MetricsGraphics
        title={this.props.title}
        chart_type={!numSeries ? 'missing-data' : undefined}
        legend={numSeries > 1 ? this.props.seriesList.map(s => s.name) : undefined}
        data={numSeries ? this.props.seriesList.map(s => s.data) : undefined}
        width={this.props.width}
        height={this.props.height}
        interpolate={curveLinear}
        missing_text="No data for this measure"
        x_accessor="date"
        y_accessor={this.props.y || 'value'}
        xax_format={this.props.xax_format ? timeFormat(this.props.xax_format) : undefined}
        xax_count={this.props.xax_count}
        linked={this.props.linked}
        linked_format={this.props.linked_format}
        right={40} />);
  }
}
