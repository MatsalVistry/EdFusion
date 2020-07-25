window.$ = window.jQuery = require('jquery');
$(document).ready(function() 
{
    $('.initialHeader').text(0);
    var counter = 0;

    const ipc = require('electron').ipcRenderer;

    $('.btn').click(function (event){
        event.preventDefault();
        counter++;
        var arr = ["hi@gmail.com","duisdfisk"];
        ipc.send('clicked', arr);
    });

    ipc.on('reply', function(event, reply) {
        // event.preventDefault();     not working for page refresh
        $('.initialHeader').text(reply);
    });
    ipc.on('logInStatus', function(event, reply) {
        // event.preventDefault();     not working for page refresh
        console.log(reply);
    });


});