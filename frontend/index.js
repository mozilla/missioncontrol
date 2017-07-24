import React from 'react';
import { render } from 'react-dom';
import thunkMiddleware from 'redux-thunk';
import { createLogger } from 'redux-logger';
import { createStore, applyMiddleware } from 'redux';
import 'bootstrap/dist/css/bootstrap.css';
import 'metrics-graphics/dist/metricsgraphics.css';
import 'font-awesome/css/font-awesome.min.css';
import Dashboard from './ui/dashboard.jsx';
import rootReducer from './reducers';
import './global.css';

const loggerMiddleware = createLogger();

const store = createStore(rootReducer,
                          applyMiddleware(thunkMiddleware, loggerMiddleware));

render(<Dashboard store={store} />, document.getElementById('root'));
