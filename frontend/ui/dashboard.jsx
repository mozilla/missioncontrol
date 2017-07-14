import React from 'react';
import { Provider } from 'react-redux';
import { HashRouter as Router, Route } from 'react-router-dom';
import MainView from './mainview.jsx';
import SubView from './subview.jsx';
import DetailView from './detailview.jsx';
import PropsRoute from './PropsRoute.jsx';
import { fetchMeasureDetailData, fetchChannelSummaryData, fetchVersionData } from '../actions';

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
      <div>
        <nav className="navbar navbar-inverse bg-inverse">
          <a className="navbar-brand" href="#">Mission Control</a>
        </nav>
        <Provider store={this.state.store}>
          <Router>
            <div>
              <Route exact path="/" component={MainView} />
              <PropsRoute
                exact
                path="/:channel/:platform"
                component={SubView}
                fetchChannelSummaryData={params => this.state.store.dispatch(
                  fetchChannelSummaryData(params))} />
              <PropsRoute
                exact
                name="measureDetail"
                path="/:channel/:platform/:measure"
                component={DetailView}
                fetchVersionData={() => this.state.store.dispatch(fetchVersionData())}
                fetchMeasureDetailData={params => this.state.store.dispatch(
                  fetchMeasureDetailData(params))} />
            </div>
          </Router>
        </Provider>
      </div>
    );
  }
}
