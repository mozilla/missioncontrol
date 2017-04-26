import React from 'react';
import _ from 'lodash';
import DataCard from './card';

export default class Dashboard extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            cards: [],
            filter: ''
        };
    }

    componentDidMount() {
        var that = this;
        fetch('https://sql.telemetry.mozilla.org/api/queries/4351/results.json?api_key=WIbd6HdaP3I9vzgTp28vMHLZXLY2VaVl7bDNBchs').then(
            function(response) {
	        return response.json();
            }).then(function(data) {
                let crashCardsMap = {};
                data.query_result.data.rows.forEach(row => {
                    let osname = row.os_name;
                    let channel = row.channel;
                    if (!crashCardsMap[osname]) {
                        crashCardsMap[osname] = {};
                    }
                    if (!crashCardsMap[osname][channel]) {
                        crashCardsMap[osname][channel] = {
                            name: `${osname}-${channel}`,
                            data: []
                        };
                    }

                    crashCardsMap[osname][channel].data.push({
                        main_rate: row.main_rate,
                        usage_khours: row.usage_khours,
                        date: new Date(row.date)
                    });
                });
                let cards = _.flattenDeep(_.values(crashCardsMap).map(channelMap => _.values(channelMap)));
                cards.forEach(c => {
                    c.data.sort(d => { return d.date; });
                });

                that.setState({cards: cards});
            });

        // doing this here (instead of the constructor) due to:
        // https://github.com/mozilla-neutrino/neutrino-dev/issues/172
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
              <div className="container-fluid">
                <div className="container">
                  <div className="input-group filter-group">
                    <input id="filter-input" type="text" className="form-control" placeholder="Filter text" onChange={this.filterChanged}/>
                  </div>
                </div>
                <div className="container" id="crash-cards">
                  {
                      _.chunk(this.state.cards.filter(c => {
                          return c.name.toLowerCase().includes(
                              this.state.filter.toLowerCase());
                      }), 3).map((cardRow, i) => (
                          <div className="row" key={"row" + i}>
                            {cardRow.map((card, j) => (
                                <div className="col" key={`row-${i}-col-${j}`}>
                                  <DataCard name={card.name} data={card.data} key={card.name}/>
                                </div>
                            ))}
                          </div>
                      ))}
                </div>
              </div>
            </div>
        );
    }
}
