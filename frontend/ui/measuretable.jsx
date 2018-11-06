import _ from 'lodash';
import moment from 'moment';
import React from 'react';
import numeral from 'numeral';

const getReleaseValue = (release, countType, timeWindow) => {
  const property =
    timeWindow === 'adjusted'
      ? `adjusted${_.capitalize(countType)}`
      : countType;

  if (_.isUndefined(release) || _.isUndefined(release[property])) {
    return 'N/A';
  }

  return (
    <span
      title={
        countType === 'count' ? numeral(release[property]).format('0,0') : null
      }>
      {numeral(release[property]).format('0.00a')}
    </span>
  );
};

class MeasureTable extends React.Component {
  render() {
    return (
      <div>
        <h3>{this.props.title}</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Measure</th>
              {this.props.versions.map(version => (
                <th key={`th-${version}`}>{version}</th>
              ))}
              <th>Last updated</th>
            </tr>
          </thead>
          <tbody>
            {this.props.measures.map(measure => (
              <tr key={measure.name}>
                <td>
                  <a
                    href={`#/${this.props.subviewState.channel}/${
                      this.props.subviewState.platform
                    }/${measure.name}`}>
                    {measure.name}
                  </a>
                </td>
                {this.props.versions.map(versionStr => (
                  <td
                    key={`${measure.name}-${versionStr}`}
                    title={
                      versionStr.includes('.')
                        ? `Events when ${versionStr} was latest`
                        : `All values from all point releases during selected time window when ${versionStr} was latest`
                    }>
                    {getReleaseValue(
                      measure.versions.find(
                        release => release.version === versionStr
                      ),
                      this.props.subviewState.countType,
                      this.props.subviewState.timeWindow
                    )}
                  </td>
                ))}
                <td>
                  {measure.lastUpdated
                    ? moment(measure.lastUpdated).fromNow()
                    : 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
}

export default MeasureTable;
