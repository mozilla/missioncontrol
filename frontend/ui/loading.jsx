import React from 'react';

export default class Loading extends React.Component {

  render() {
    return (
      <div className="container d-flex align-items-center justify-content-center loading-widget">
        <p>
          Loading... <i className="fa fa-spinner fa-spin" aria-hidden="true"></i>
        </p>
      </div>
    );
  }
}
