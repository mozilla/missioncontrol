import React from 'react';
import { render } from 'react-dom';
import 'bootstrap/dist/css/bootstrap.css';
import 'metrics-graphics/dist/metricsgraphics.css';
import Dashboard from './ui/dashboard.jsx';
import './global.css';

render(<Dashboard/>, document.getElementById('root'));

