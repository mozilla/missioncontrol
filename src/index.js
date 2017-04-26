import React from 'react';
import { render } from 'react-dom';
import Dashboard from './ui/dashboard';
import 'bootstrap/dist/css/bootstrap.css';
import 'metrics-graphics/dist/metricsgraphics.css';
import './global.css';

render(<Dashboard/>, document.getElementById('root'));

