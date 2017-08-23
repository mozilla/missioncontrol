import React from 'react';
import { Link } from 'react-router-dom';
import { Breadcrumb, BreadcrumbItem } from 'reactstrap';

export default class SubViewNav extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      breadcrumbs: props.breadcrumbs
    };
  }

  render() {
    return (
      <Breadcrumb className="header-breadcrumb">
        { this.state.breadcrumbs.map(bc => (
          <BreadcrumbItem key={bc.link}>
            <Link to={bc.link}>
              {bc.name}
            </Link>
          </BreadcrumbItem>
        ))
        }
      </Breadcrumb>
    );
  }
}
