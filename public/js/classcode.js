const ipc = require('electron').ipcRenderer;
window.$ = window.jQuery = require('jquery');

$(document).ready(() => {
    $("#start-class").click((e) => {
        e.preventDefault()
        ipc.send('startClass')
    })
})

ipc.on('code', (event, code) => {
    console.log(code);
    $('.class_code').text(code)
}); 