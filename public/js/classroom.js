const ipc = require('electron').ipcRenderer;
window.$ = window.jQuery = require('jquery');

$(document).ready(() => {
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

    let qButton = document.createElement('button')
    qButton.innerHTML = "Ya Boi"

    qButton.onclick = () => {
        ipc.send('deleteQuestion', question)

        qText.remove()
        qButton.remove()
        qDiv.remove()
    }

    qDiv.appendChild(qText)
    qDiv.appendChild(qButton)
    questions.append(qDiv)
}
