import percentile from 'aggregatejs/percentile';
import React from 'react';
import Dimensions from 'react-dimensions';

import DetailGraph from './detailgraph.jsx';


class MeasureDetailGraph extends React.Component {
  render() {
    let transformedSeriesList = this.props.seriesList;

    if (this.props.normalized) {
      transformedSeriesList = transformedSeriesList.map(series => ({
        ...series,
        data: series.data.map(d => ({
          ...d,
          [this.props.measure]: d[this.props.measure] / (d.usage_hours / 1000.0)
        }))
      }));
    }

    if (this.props.percentileThreshold < 100) {
      transformedSeriesList = transformedSeriesList.map((series) => {
        const threshold = percentile(
          series.data.map(d => d[this.props.measure]),
          this.props.percentileThreshold / 100.0
        );
        return {
          ...series,
          data: series.data.filter(d => d[this.props.measure] < threshold)
        };
      });
    }

    return (
      <DetailGraph
        title={`${this.props.measure} ${(this.props.normalized) ? 'per 1k hours' : ''}`}
        seriesList={transformedSeriesList}
        y={this.props.measure}
        relative={this.props.relative} />
    );
  }
}

const dimensions = Dimensions;
export default dimensions()(MeasureDetailGraph);
