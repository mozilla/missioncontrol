"use strict";

var crashCards = [];

let render = function() {
    let filter = $('#filter-input').val();

    let row = 0, col = 0;
    $('#crash-cards').html(`<div class="row" id="crash-card-row-${row}"></div>`);
    console.log(crashCards);
    crashCards.forEach(c => {
        // skip entries that don't match the filter
        if (filter.length && !c.name.includes(filter))
            return;

        $(`#crash-card-row-${row}`).append(`
          <div class="col">
            <div class="card" style="width: 20rem;">
              <div class="card-block card-content">
                <center><h4 class="card-title">${c.name}</h4></center>
                <figure class="graph" id="${c.name}"></figure>
              </div>
            </div>
          </div>`);
        MG.data_graphic({
            data: c.data,
            width: 280,
            height: 200,
            target: '#' + c.name,
            x_accessor: 'date',
            y_accessor: 'main_rate',
            xax_format: d3.timeFormat('%Hh'),
            xax_count: 4
        });
        $('#' + c.name).click(function() {
            $('#crash-card-detail .modal-body').html(`
             <div class="container">
                <div class="row"><div class="col"><figure id="linked_${c.name}-enlarged"></figure></div></div>
                <div class="row"><div class="col"><figure id="linked_${c.name}-khours-enlarged"></figure></div></div>
             </div>`);

            $('#crash-card-detail-title').html(`${c.name} details`);
            MG.data_graphic({
                title: "Main crash rate",
                data: c.data,
                width: 700,
                height: 300,
                target: `#linked_${c.name}-enlarged`,
                x_accessor: 'date',
                y_accessor: 'main_rate',
                xax_format: d3.timeFormat('%Hh'),
                show_secondary_x_label: false,
                linked: true,
                linked_format: "%Y-%m-%d-%H-%M-%S"
            });
            MG.data_graphic({
                title: "Usage khours",
                data: c.data,
                width: 700,
                height: 200,
                target: `#linked_${c.name}-khours-enlarged`,
                x_accessor: 'date',
                y_accessor: 'usage_khours',
                xax_format: d3.timeFormat('%Hh'),
                show_secondary_x_label: false,
                linked: true,
                linked_format: "%Y-%m-%d-%H-%M-%S"
            });
            $('#crash-card-detail').modal({});
        });

        col++;
        if (col > 2) {
            row++;
            col = 0;
            $('#crash-cards').append(`<div class="row" id="crash-card-row-${row}"></div>`);
        }
    });
    while (col < 3) {
        $(`#crash-card-row-${row}`).append('<div class="col"></div>');
        col++;
    }
}

fetch('https://sql.telemetry.mozilla.org/api/queries/4351/results.json?api_key=WIbd6HdaP3I9vzgTp28vMHLZXLY2VaVl7bDNBchs').then(
    function(response) {
	// Convert to JSON
	return response.json();
    }).then(function(data) {
        console.log(data);
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

        crashCards = _.flattenDeep(_.values(crashCardsMap).map(channelMap => _.values(channelMap)));
        crashCards.forEach(c => {
            c.data.sort(d => { return d.date; });
        });
        render();
    });


$('#filter-input').on('input', function() {
    render();
});
