import MetricsGraphics from 'react-metrics-graphics';
import React from 'react';
import { timeFormat } from 'd3-time-format';
import { Button, Card, Modal, ModalHeader, ModalBody } from 'reactstrap';

export default class DataCard extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            name: this.props.name,
            data: this.props.data,
            showDetail: false
        };
    }

    componentWillMount() {
        // doing this here (instead of the constructor) due to:
        // https://github.com/mozilla-neutrino/neutrino-dev/issues/172
        this.toggleDetail = this.toggleDetail.bind(this);
    }

    toggleDetail() {
        this.setState({
            showDetail: !this.state.showDetail
        });
    }

    render() {
        return (
            <Card block onClick={this.toggleDetail}>
              <center><h4>{this.state.name}</h4></center>
              <figure className="graph" id={this.state.name}>
                <MetricsGraphics
                  data={this.state.data}
                  width={280}
                  height={200}
                  x_accessor="date"
                  y_accessor="main_rate"
                  xax_format={timeFormat('%Hh')}
                  xax_count={4}
                  	right={40}
                  />
              </figure>
              <Modal isOpen={this.state.showDetail} size="lg" toggle={this.toggleDetail}>
                <ModalHeader toggle={this.toggleDetail}>{this.state.name}</ModalHeader>
                <ModalBody>
                  <div className="container">
                    <div className="row">
                      <div className="col">
                        <center><h5>Crash rate</h5></center>
                        <MetricsGraphics
                          data={this.state.data}
                          width={700}
                          height={300}
                          x_accessor="date"
                          y_accessor="main_rate"
                          xax_format={timeFormat('%Hh')}
                          linked={true}
                          linked_format="%Y-%m-%d-%H-%M-%S"
                          />
                      </div>
                    </div>
                    <div className="row">
                      <div className="col">
                        <center><h5>Usage khours</h5></center>
                        <MetricsGraphics
                          description="Cheezburger"
                          data={this.state.data}
                          width={700}
                          height={200}
                          x_accessor="date"
                          y_accessor="usage_khours"
                          xax_format={timeFormat('%Hh')}
                          show_secondary_x_label={false}
                          linked={true}
                          linked_format="%Y-%m-%d-%H-%M-%S"
                          />
                      </div>
                    </div>
             </div>
                </ModalBody>
              </Modal>
            </Card>
        );
    }

}

