const ipc = require('electron').ipcRenderer;
var Chart = require('chart.js');
window.$ = window.jQuery = require('jquery');

let chart;

$(document).ready(() => {
    $("#end-class").click((e) => {
        e.preventDefault()
        ipc.send('endClass')
    })
})

ipc.on('newQuestion', (event, question) => {
    console.log(question)
    pushQuestion(question)
}); 

const pushQuestion = (question) => {
    let questions = document.querySelector(".questions");

    let qDiv = document.createElement('div')
    qDiv.className = "questionCard"

    let qText = document.createElement('p')
    qText.innerHTML = question

    let qDelButton = document.createElement('button')
    qDelButton.innerHTML = "Yeet"
    qDelButton.onclick = () => {
        ipc.send('deleteQuestion', question)

        qText.remove()
        qDelButton.remove()
        qDiv.remove()
    }

    let qMuteButton = document.createElement('button')
    qMuteButton.innerHTML = "Mute"
    qMuteButton.onclick = () => {
        ipc.send('mutePerson', question)
    }

    qDiv.appendChild(qText)
    qDiv.appendChild(qDelButton)
    qDiv.appendChild(qMuteButton)
    questions.append(qDiv)
}

const loadChart = (data, ctx) => {
    var data = {
        labels: data.map(point => point.x),
        datasets: [{
          label: "Average Confusion Rating",
          data: data.map(point => point.y)
        }]
    };

    chart = new Chart(ctx, {
        type: 'line',
        data: data,
        options: {
            title: {
                display: true,
                text: 'Live Confusion Graph'
            }
        }
    });
}

const updateChart = (data) => {
    let latestX = data[data.length-1].x
    let latestY = data[data.length-1].y

    chart.data.labels.push(latestX);
    chart.data.datasets.forEach((dataset) => {
        dataset.data.push(latestY);
    });
    chart.update();
}

ipc.on('updatedSessionChart', (event, data) => {
    const confusionCTX = $('#session_confusion')

    if(data.length > 1) {
        updateChart(data)
    } else {
        loadChart(data, confusionCTX) 
    }
})