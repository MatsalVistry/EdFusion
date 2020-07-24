window.$ = window.jQuery = require('jquery');
$(document).ready(function() 
{
    $('.initialHeader').text(0);
    var counter = 0;

    const ipc = require('electron').ipcRenderer;

    $('.btn').click(function (event){
        event.preventDefault();
        counter++;
        ipc.send('clicked', counter);
    });

    ipc.on('reply', function(event, reply) {
        // event.preventDefault();     not working for page refresh
        $('.initialHeader').text(reply);
    });


});