const ipc = require('electron').ipcRenderer;
window.$ = window.jQuery = require('jquery');

$(document).ready(() => {
    console.log("doc loaded")
})


ipc.on('newQuestion', (event, question) => {
    console.log("QUESTION" + question)
    $('.question').text(question)

    $(".mute").click((e) => {
        e.preventDefault()
        console.log("MUTE");
        ipc.send('mutePerson', question)
        ipc.send('deleteQuestionWindow')
    })

    $(".delete").click((e) => {
        e.preventDefault()
        console.log("delete");
        ipc.send('deleteQuestion', question)
        ipc.send('deleteQuestionWindow', question)
    })
}); 
