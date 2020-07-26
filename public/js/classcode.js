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

ipc.on('updatedStudents', (event, studentCount) => {
    console.log(studentCount);
    $(".student-val").text(studentCount)
})