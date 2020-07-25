const ipc = require('electron').ipcRenderer;
window.$ = window.jQuery = require('jquery');

$(document).ready(function () {

})

ipc.on('code', (event, code) => {
    console.log(code);
    $('.class_code').text(code)
}); 