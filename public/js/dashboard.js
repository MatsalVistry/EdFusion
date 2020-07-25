const ipc = require('electron').ipcRenderer;
var Chart = require('chart.js');
window.$ = window.jQuery = require('jquery');

$(document).ready(() => {
    $("#create-classroom").click((e) => {
        e.preventDefault()
        $("#create-classroom").prop('disabled', true)
        ipc.send('getRoomCode')
    })
})


const loadChart = (data, ctx) => {

    var data = {
        labels: data.map(point => point.x),
        datasets: [{
          label: "Car Speed",
          data: data.map(point => point.y)
        }]
    };

    var chart = new Chart(ctx, {
        type: 'line',
        data: data,
        options: {
            title: {
                display: true,
                text: 'World population per region (in millions)'
            }
        }
    });
}

ipc.on('chartData', (event, data) => {
    const confusionCTX = $('#confusion');
    const ratingCTX = $('#ratings');
    const attendanceCTX = $('#attendance');

    loadChart(data[0], confusionCTX)
    loadChart(data[1], ratingCTX)
    loadChart(data[2], attendanceCTX)
})

ipc.on('loadPreviousSessionGraph', (event, data) => {
    const confusionCTX = $('#session-confusion');
    loadChart(data, confusionCTX)
    console.log(data);
})

ipc.on('updatedRatings', (event, data) => {
    console.log(`rating ${data}`)
})

