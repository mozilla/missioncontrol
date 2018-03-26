import React from 'react';
import {
  Button,
  FormGroup,
  Input,
  Label,
  Modal,
  ModalBody,
  ModalHeader,
  ModalFooter,
} from 'reactstrap';

export default class DateSelectorModal extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      startDate: new Date(this.props.defaultStart),
      endDate: new Date(this.props.defaultEnd),
    };

    this.handleStartDateChanged = this.handleStartDateChanged.bind(this);
    this.handleEndDateChanged = this.handleEndDateChanged.bind(this);
    this.handleTimeIntervalChosen = this.handleTimeIntervalChosen.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      startDate: new Date(nextProps.defaultStart),
      endDate: new Date(nextProps.defaultEnd),
    });
  }

  handleStartDateChanged(ev) {
    this.setState({
      startDate: new Date(ev.target.value),
    });
  }

  handleEndDateChanged(ev) {
    this.setState({
      endDate: new Date(ev.target.value),
    });
  }

  handleTimeIntervalChosen() {
    this.props.timeIntervalChosen(this.state.startDate, this.state.endDate);
  }

  isCustomTimeIntervalValid() {
    return (
      this.state.startDate &&
      this.state.endDate &&
      this.state.startDate < this.state.endDate
    );
  }

  render() {
    return (
      <Modal isOpen={this.props.isOpen} toggle={this.props.toggle}>
        <ModalHeader toggle={this.props.toggle}>Custom Date Range</ModalHeader>
        <ModalBody>
          <FormGroup>
            <Label for="startDate">Start Date</Label>
            <Input
              type="date"
              onChange={this.handleStartDateChanged}
              id="startDate"
              defaultValue={this.props.defaultStart}
            />
          </FormGroup>
          <FormGroup>
            <Label for="endDate">End Date</Label>
            <Input
              type="date"
              onChange={this.handleEndDateChanged}
              id="endDate"
              defaultValue={this.props.defaultEnd}
            />
          </FormGroup>
        </ModalBody>
        <ModalFooter>
          <Button
            color="primary"
            disabled={!this.isCustomTimeIntervalValid()}
            onClick={this.handleTimeIntervalChosen}>
            Ok
          </Button>
        </ModalFooter>
      </Modal>
    );
  }
}
