const ipc = require('electron').ipcRenderer;
window.$ = window.jQuery = require('jquery');

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
