import React from 'react';
import { curveLinear } from 'd3';
import { timeFormat } from 'd3-time-format';
import MetricsGraphics from 'react-metrics-graphics';

export default class MeasureGraph extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      title: this.props.title,
      y: this.props.y || 'value',
      width: this.props.width,
      height: this.props.height
    };
  }

  render() {
    const numSeries = this.props.seriesList.length;
    return (
      <MetricsGraphics
        title={this.state.title}
        chart_type={!numSeries ? 'missing-data' : undefined}
        legend={numSeries > 1 ? this.props.seriesList.map(s => s.name) : undefined}
        data={numSeries ? this.props.seriesList.map(s => s.data) : undefined}
        width={this.state.width}
        height={this.state.height}
        interpolate={curveLinear}
        missing_is_hidden={true}
        missing_text="No data for this measure"
        x_accessor="date"
        y_accessor={this.state.y}
        xax_format={this.props.xax_format ? timeFormat(this.props.xax_format) : undefined}
        xax_count={this.props.xax_count}
        linked={this.props.linked}
        linked_format={this.props.linked_format}
        right={40} />);
  }
}
