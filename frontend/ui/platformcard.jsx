import _ from 'lodash';
import numeral from 'numeral';
import React from 'react';
import { Card, CardBody, CardHeader } from 'reactstrap';
import { KEY_MEASURES } from '../schema';

const getChangeIndicator = versions => {
  if (versions.length > 2 && versions[2].adjustedRate > 0.0) {
    const pctChange =
      (versions[1].adjustedRate - versions[2].adjustedRate) /
      versions[2].adjustedRate *
      100.0;
    const pctFormat = Math.abs(pctChange) < 1 ? '0.0a' : '0a';
    const title = `${versions[2].adjustedRate} → ${versions[1].adjustedRate}`;

    if (versions[1].adjustedRate > versions[2].adjustedRate) {
      return (
        <span title={title} className={pctChange > 25 ? 'text-danger' : ''}>
          {numeral(pctChange).format(pctFormat)}%&nbsp;
          <i className="fa fa-arrow-up" aria-hidden="true" />
        </span>
      );
    }

    return (
      <span title={title} className={pctChange < -25 ? 'text-success' : ''}>
        {numeral(pctChange).format(pctFormat)}%&nbsp;<i
          className="fa fa-arrow-down"
          aria-hidden="true"
        />
      </span>
    );
  }

  return <i className="fa fa-minus" aria-hidden="true" />;
};

class PlatformCard extends React.Component {
  constructor(props) {
    super(props);
    this.cardClicked = this.cardClicked.bind(this);
  }

  cardClicked() {
    this.props.history.push(
      `${this.props.summary.channel}/${this.props.summary.platform}`
    );
  }

  render() {
    const { summary } = this.props;

    return (
      <Card onClick={() => this.cardClicked()} className="missioncontrol-card">
        <CardHeader className={`alert-${summary.status}`}>
          <center>
            {`${_.capitalize(summary.application)} ${_.capitalize(
              summary.platform
            )} `}
            {summary.latestVersionSeen && (
              <small className="text-muted">
                ({summary.latestVersionSeen})
              </small>
            )}
          </center>
        </CardHeader>
        <CardBody>
          <div className="summary-rate">
            <abbr
              title={_.intersection(
                summary.expectedMeasures,
                KEY_MEASURES
              ).join(' + ')}>
              {summary.summaryRate ? summary.summaryRate : 'N/A'}
            </abbr>
          </div>
          <table className="table table-sm summary-table">
            <tbody>
              {summary.measures
                .filter(
                  measure =>
                    KEY_MEASURES.includes(measure.name) &&
                    measure.versions.length &&
                    measure.versions[0].version === summary.latestVersionSeen
                )
                .map(measure => (
                  <tr
                    key={`${summary.application}-${summary.platform}-${
                      measure.name
                    }`}
                    title={
                      measure.versions.length > 1
                        ? `Average ${
                            measure.versions[1].adjustedRate
                          } events per 1000 hours`
                        : ''
                    }>
                    <td>{measure.name}</td>
                    <td align="right">
                      {measure.versions.length > 1 &&
                        measure.versions[1].adjustedRate}
                    </td>
                    <td align="right">
                      {measure.versions && getChangeIndicator(measure.versions)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    );
  }
}

export default PlatformCard;
