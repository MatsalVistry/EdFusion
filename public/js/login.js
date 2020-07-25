const ipc = require('electron').ipcRenderer;
window.$ = window.jQuery = require('jquery');


$(document).ready(() => {
    $(".login-inputs").submit((e) => {
        e.preventDefault()
        let username = $('.user').val()
        let password = $('.pass').val()
        ipc.send('login_data',[username,password])
    })
})