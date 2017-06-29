import React from 'react';
import { Link } from 'react-router-dom';

export const ERROR_TYPE_INSUFFICIENT_DATA = 'INSUFFICIENT_DATA';
export const ERROR_TYPE_OUTSIDE_RANGE = 'OUTSIDE_RANGE';

export class ErrorTable extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      platformName: props.platformName,
      channelName: props.channelName,
      errorType: props.errorType,
      errors: props.errors
    };
  }

  render() {
    const errorTypeOutsideRange = this.state.errorType === ERROR_TYPE_OUTSIDE_RANGE;
    return (
      <table className="table table-sm">
        <thead>
          <tr>
            <th>Measure</th>
            <th>{errorTypeOutsideRange ? 'Limit' : 'Expected'}</th>
            <th>Current</th>
          </tr>
        </thead>
        <tbody>
          {
            this.state.errors.map(e => (
              <tr key={e.measure} className={errorTypeOutsideRange ? 'table-danger' : 'table-warning'}>
                <td>
                  <Link to={`/${this.state.channelName}/${this.state.platformName}/${e.measure}`}>
                    { e.measure }
                  </Link>
                </td>
                <td>{ errorTypeOutsideRange ? e.limit : e.expected }</td>
                <td>{ e.current }</td>
              </tr>
            ))
          }
        </tbody>
      </table>
    );
  }
}
