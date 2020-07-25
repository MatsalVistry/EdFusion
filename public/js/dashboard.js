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
    // MEHUL PUT STAR CODE HERE
    colorStars( getUrlVars()['rating'])

    function fillStars(index){
        var code = getUrlVars()['code'];
        var student_id = getUrlVars()['student_id'];
        window.location.href = "./edfusion3.html?code="+code+"&student_id="+student_id+"&rating="+index;
    }
    
    function getUrlVars() {
        var vars = {};
        var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
            vars[key] = value;
        });
        return vars;
    }
    
    function colorStars(index){
        //fill em up
        for(let i = 1;  i<=index; i++){
            document.getElementById("star"+i).src = "./assets/Icon_material-star.svg";
        }
    
    }
})

ipc.on('updatedReviews', (event, data) => {
    data.map(rev => {
        pushReview(rev)
    })
})
