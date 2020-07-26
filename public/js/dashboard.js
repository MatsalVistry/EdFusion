const ipc = require('electron').ipcRenderer;
var Chart = require('chart.js');
window.$ = window.jQuery = require('jquery');

$(document).ready(() => {
    $("#create-classroom").click((e) => {
        e.preventDefault()
        $("#create-classroom").prop('disabled', true)
        ipc.send('getRoomCode')
    })
    pushReview("you suck lol")
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

const pushReview = (rev) => {
    let reviews = document.querySelector(".reviews");

    let qDiv = document.createElement('div')
    qDiv.className = "reviewCard"

    let qText = document.createElement('p')
    qText.innerHTML = rev

    qDiv.appendChild(qText)
    reviews.append(qDiv)
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
    let rating = math.round(data);
    colorStars(rating)
})

ipc.on('updatedReviews', (event, data) => {
    data.map(rev => {
        pushReview(rev)
    })
})

const colorStars = (index) => {
    for(let i = 1;  i<=index; i++){
        document.getElementById("star"+i).src = "../assets/Icon_material-star.svg";
        console.log(document.getElementById("star"+i).src)
    }
}
