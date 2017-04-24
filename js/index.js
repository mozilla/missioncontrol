"use strict";

let fakeSpike = _.zip(_.range(1, 21),
                      _.times(10, _.constant(100)).concat(_.times(10, _.constant(150)))).map(
                          (tuple) => ({date: new Date('2017-04-' + tuple[0]),
                                       value: tuple[1] + (Math.random()*5)}));

let fakeSteady = _.zip(_.range(1, 21), _.times(20, _.constant(100))).map(
    (tuple) => ({date: new Date('2017-04-' + tuple[0]), value: tuple[1] + (Math.random()*5)}));

var crashCards = [
    {
        name: 'nightly-cpu',
        danger: false,
        data: fakeSteady
    },
    {
        name: 'nightly-gpu',
        danger: true,
        data: fakeSpike
    },
    {
        name: 'beta-cpu',
        danger: false,
        data: fakeSteady
    },
    {
        name: 'beta-gpu',
        danger: false,
        data: fakeSteady
    },
    {
        name: 'release-cpu',
        danger: true,
        data: fakeSpike
    },
    {
        name: 'release-gpu',
        danger: false,
        data: fakeSteady
    }
];

let render = function() {
    let filter = $('#filter-input').val();

    let row = 0, col = 0;
    $('#crash-cards').html(`<div class="row" id="crash-card-row-${row}"></div>`);
    crashCards.forEach(c => {
        // skip entries that don't match the filter
        if (filter.length && !c.name.includes(filter))
            return;

        var cardClass = c.danger ? 'alert-danger' : 'alert-success';
        $(`#crash-card-row-${row}`).append(`
          <div class="col">
            <div class="card ${cardClass}" style="width: 20rem;">
              <div class="card-block card-content">
                <h4 class="card-title">${c.name}</h4>
                <div class="graph" id="${c.name}"></div>
                <p>
              </div>
            </div>
          </div>`);
        MG.data_graphic({
            data: c.data,
            width: 280,
            height: 200,
            target: '#' + c.name,
            x_accessor: 'date',
            y_accessor: 'value',
            xax_count: 4
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

render();

$('#filter-input').on('input', function() {
    render();
});
