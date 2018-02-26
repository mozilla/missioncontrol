import React from 'react';
import { Provider } from 'react-redux';
import { DropdownItem, DropdownMenu, DropdownToggle, Modal, ModalBody, ModalHeader, Nav, Navbar, NavbarBrand, UncontrolledDropdown } from 'reactstrap';
import { HashRouter as Router } from 'react-router-dom';
import MainView from './mainview.jsx';
import SubView from './subview.jsx';
import DetailView from './detailview.jsx';
import PropsRoute from './PropsRoute.jsx';
import { ERROR_AGGREGATES_URL } from '../schema';
import { fetchChannelPlatformSummaryData, fetchMeasureData } from '../actions';

export default class Dashboard extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      cards: [],
      filter: '',
      showingAbout: false,
      store: props.store
    };

    this.filterChanged = this.filterChanged.bind(this);
    this.toggleShowAbout = this.toggleShowAbout.bind(this);
  }

  filterChanged(ev) {
    this.setState({
      filter: ev.target.value
    });
  }

  toggleShowAbout() {
    this.setState({
      showingAbout: !this.state.showingAbout
    });
  }

  shouldComponentUpdate(nextProps, nextState) {
    return this.state !== nextState;
  }

  render() {
    return (
      <div className="body-container">
        <Modal isOpen={this.state.showingAbout} toggle={this.toggleShowAbout}>
          <ModalHeader toggle={this.toggleShowAbout}>About</ModalHeader>
          <ModalBody>
              Mission Control is a monitoring service for Firefox release health, it allows you to view in
              (near) real time the rate of crashes and other quantitative measures of quality. Under the hood,
              it uses the <a href={ERROR_AGGREGATES_URL} target="blank_">error aggregates dataset</a>.
            </ModalBody>
        </Modal>

        <Navbar className="navbar-dark bg-dark missioncontrol-navbar" expand="md">
          <NavbarBrand href="#/">Mission Control</NavbarBrand>
          <span className="navbar-text">Realtime Telemetry</span>
          <Nav className="ml-auto" navbar>
            <UncontrolledDropdown nav inNavbar>
              <DropdownToggle nav caret>
                Help
              </DropdownToggle>
              <DropdownMenu right>
                <DropdownItem onClick={this.toggleShowAbout}>
                  <i className="fa fa-info-circle" aria-hidden="true"></i>&nbsp; About
                </DropdownItem>
                <DropdownItem target="blank_" href={ERROR_AGGREGATES_URL}>
                  <i className="fa fa-database" aria-hidden="true"></i>&nbsp; Dataset docs
                </DropdownItem>
                <DropdownItem target="blank_" href="https://github.com/mozilla/missioncontrol/issues/">
                  <i className="fa fa-bug" aria-hidden="true"></i>&nbsp; Report an issue
                </DropdownItem>
                <DropdownItem target="blank_" href="https://github.com/mozilla/missioncontrol/">
                  <i className="fa fa-github" aria-hidden="true"></i>&nbsp; Source
                </DropdownItem>
              </DropdownMenu>
            </UncontrolledDropdown>
          </Nav>
        </Navbar>
        <Provider store={this.state.store}>
          <Router>
            <div className="body-element">
              <PropsRoute
                exact
                path="/"
                component={MainView}
                fetchChannelPlatformSummaryData={params =>
                  this.state.store.dispatch(fetchChannelPlatformSummaryData(params))} />
              <PropsRoute
                exact
                path="/:channel/:platform"
                component={SubView}
                fetchChannelPlatformSummaryData={params =>
                  this.state.store.dispatch(fetchChannelPlatformSummaryData(params))} />
              <PropsRoute
                exact
                name="measureDetail"
                path="/:channel/:platform/:measure"
                component={DetailView}
                fetchMeasureData={params =>
                  this.state.store.dispatch(fetchMeasureData(params))
                } />
            </div>
          </Router>
        </Provider>
      </div>
    );
  }
}
