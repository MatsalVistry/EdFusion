const ipc = require('electron').ipcRenderer;
var Chart = require('chart.js');
window.$ = window.jQuery = require('jquery');

$(document).ready(() => {
    $("#create-classroom").click((e) => {
        e.preventDefault()
        $("#create-classroom").prop('disabled', true)
        ipc.send('getRoomCode')
        setWidth = (window.innerWidth - (window.innerWidth * 0.4)) / 3
        console.log(setWidth);
        $(".canvasDiv").width(setWidth);
    })

    setWidth = (window.innerWidth - (window.innerWidth * 0.4)) / 3
    $(".canvasDiv").width(Math.floor(setWidth))
    $(".canvasDiv").height(Math.floor(setWidth))

    $(window).resize(function () {
        setWidth = (window.innerWidth - (window.innerWidth * 0.4)) / 3
        $(".canvasDiv").width(Math.floor(setWidth))
        $(".canvasDiv").height(Math.floor(setWidth))
    });
    colorStars(3)
})

const loadChart = (data, ctx, xAxisLabel, yAxisLabel, title, border, backgroundColor) => {

    var data = {
        labels: data.map(point => point.x),
        datasets: [{
            label: title,
            data: data.map(point => point.y)
        }]
    };

    data.datasets[0].borderColor = border
    data.datasets[0].backgroundColor = backgroundColor

    new Chart(ctx, {
        type: 'line',
        data: data,
        options: {
            legend: {
                display: false
            },
            title: {
                display: true,
                text: title
            },
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                yAxes: [{
                    scaleLabel: {
                        display: true,
                        labelString: yAxisLabel
                    }
                }],
                xAxes: [{
                    scaleLabel: {
                        display: true,
                        labelString: xAxisLabel
                    }
                }]
            }
        },
    });
}

const pushReview = (rev) => {
    let reviews = document.querySelector(".reviews");

    let qDiv = document.createElement('div')
    qDiv.className = "reviewCard"

    let qText = document.createElement('p')
    qText.innerHTML = rev

    qDiv.appendChild(qText)
    reviews.prepend(qDiv)
}

ipc.on('chartData', (event, data) => {
    const confusionCTX = $('#confusion');
    const ratingCTX = $('#ratings');
    const attendanceCTX = $('#attendance');

    loadChart(data[0], confusionCTX, "Sessions", "Confusion", "Lifetime Confusion","#8039b4","rgba(128, 57, 180,0.5)")
    loadChart(data[1], ratingCTX, "Sessions", "Ratings", "Lifetime Ratings","#4E39B4","rgba(78, 57, 180,0.5)")
    loadChart(data[2], attendanceCTX, "Sessions", "Attendance", "Lifetime Attendance","#C31D6C","rgba(195, 29, 108,0.5)")

})

ipc.on('loadPreviousSessionGraph', (event, data) => {
    const confusionCTX = $('#session-confusion');
    $('.prev-ctr').toggleClass('hidden',false)
    loadChart(data, confusionCTX, "Time", "Average Confusion", "Session Confusion","#2BEBBD","rgba(43, 235, 189,0.5)")
    console.log(data);
})

ipc.on('updatedRatings', (event, data) => {
    let rating = Math.round(data);
    colorStars(rating)
})

ipc.on('updatedReviews', (event, data) => {
    data.map(rev => {
        pushReview(rev)
    })
})

const colorStars = (index) => {
    for (let i = 1; i <= 5; i++) {
        if (i <= index) {
            document.getElementById("star" + i).src = "../assets/Icon_material-star.svg";
        } else {
            document.getElementById("star" + i).src = "../assets/Icon_material-star-border.svg";
        }
        console.log(document.getElementById("star" + i).src)
    }
}
