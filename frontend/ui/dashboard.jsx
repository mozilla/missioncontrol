import React from 'react';
import { Provider } from 'react-redux';
import { Navbar, NavbarBrand } from 'reactstrap';
import { HashRouter as Router } from 'react-router-dom';
import MainView from './mainview.jsx';
import SubView from './subview.jsx';
import DetailView from './detailview.jsx';
import PropsRoute from './PropsRoute.jsx';
import { fetchChannelPlatformSummaryData, fetchMeasureData } from '../actions';

export default class Dashboard extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      cards: [],
      filter: '',
      store: props.store
    };

    this.filterChanged = this.filterChanged.bind(this);
  }

  filterChanged(ev) {
    this.setState({
      filter: ev.target.value
    });
  }

  shouldComponentUpdate(nextProps, nextState) {
    return this.state !== nextState;
  }

  render() {
    return (
      <div className="body-container">
        <Navbar className="navbar-dark bg-dark missioncontrol-navbar">
          <NavbarBrand href="#/">Mission Control</NavbarBrand>
          <span className="navbar-text">Realtime Telemetry</span>
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
