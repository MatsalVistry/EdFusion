const ipc = require('electron').ipcRenderer;
window.$ = window.jQuery = require('jquery');

$(document).ready(() => {
    $("#create-classroom").click((e) => {
        e.preventDefault()
        ipc.send('getRoomCode')
    })
})