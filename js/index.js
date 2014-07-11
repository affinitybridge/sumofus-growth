var log = require('bows')('index.js'),
    topojson = require('topojson'),
    queue = require('queue-async'),
    d3 = require('d3'),
    moment = require('moment');

window.localStorage.debug = true;

var width = 960,
    height = 600;

var projection = d3.geo.mercator()
        .scale((width + 1) / 2 / Math.PI)
        .translate([width / 2, height / 2])
        .precision(0.1);

var path = d3.geo.path()
        .projection(projection);

var body = d3.select("body"),
    dateContainer = body.append('div'),
    button = body.append('button').text('Start'),
    svg = body.append("svg")
        .attr("width", width)
        .attr("height", height);


// var timeline = d3.time.scale()

queue()
    .defer(d3.json, "../data/world-50m.json")
    .defer(d3.tsv, "../data/world-country-names.tsv")
    .defer(d3.csv, "../data/map5mm_country.csv")
    .await(ready);

function ready(err, world, names, monthlyCountByCountry) {
    var countries = topojson.feature(world, world.objects.countries).features,
        neighbors = topojson.neighbors(world.objects.countries.geometries),
        byMonth = {},
        countryCount = {};

        var colors = ['rgb(255, 255, 255)','rgb(247,251,255)','rgb(222,235,247)','rgb(198,219,239)','rgb(158,202,225)','rgb(107,174,214)','rgb(66,146,198)','rgb(33,113,181)','rgb(8,69,148)'], // 'rgb(255,255,217)','rgb(237,248,177)','rgb(199,233,180)','rgb(127,205,187)','rgb(65,182,196)','rgb(29,145,192)','rgb(34,94,168)','rgb(12,44,132)'],
            range = [0, 50,  500, 1000, 5000, 10000, 100000, 1000000, 5000000], //[0, 1, 4, 16, 64, 256])
            fill = d3.scale.threshold()
                .domain(range)
                .range(colors);

    // Pairing country geoms with names.
    countries = countries.filter(function (d) {
            return names.some(function (n) {
                if (d.id == n.id) return d.properties.name = n.name;
            });
        });

    // Initializing counts per country.
    names.forEach(function (d) { countryCount[d.name] = 0; });

    // Grouping country counts by month.
    monthlyCountByCountry.forEach(function (record) {
        var month = new Date(record['year-month']);
        if (!byMonth[month]) {
            byMonth[month] = [];
        }
        record.country = record.country.trim();
        byMonth[month].push(record);
    });


    var select = svg.selectAll(".country")
            .data(countries)
        .enter().insert("path")
            .attr("class", function (d, i) {
                return "country " + d.properties.name.toLowerCase().replace(/\s/g, '-');
            })
            .attr("fill", function (d) { return fill(countryCount[d.properties.name]); })
            .attr("d", path);

    var render = function (date){
        select.data(countries)
            .transition().duration(250)
            .attr("fill", function (d) {
                return fill(countryCount[d.properties.name]);
            });
        dateContainer.text(moment(date).format('MMMM, YYYY'));
    };

    var months = Object.keys(byMonth).sort(function (a, b) {
        return (new Date(a)) - (new Date(b));
    });

    var iterate = function () {
            var current = months.shift();

            byMonth[current].forEach(function (record) {
                countryCount[record.country] = +record.members;
            });

            render(current);

            if (months.length > 0) {
                setTimeout(iterate, 250);
            }
            else {
                log('DONE');
            }
        };

    button.on('click', function (e) {
        setTimeout(iterate, 500);
    });
}
