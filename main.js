const electron = require('electron');
const url = require('url');
const path = require('path');
const { protocol } = require('electron');
const { pipeline } = require('stream');
const { verify } = require('crypto');

const { app, BrowserWindow } = electron;

let mainWindow;
const ipc = electron.ipcMain;
const MongoClient = require('mongodb').MongoClient;
var teacherID = null;
var questions = new Set();

app.on('ready', function () {
    mainWindow = new BrowserWindow({
        webPreferences: {
            nodeIntegration: true
        }
    });

    mainWindow.loadURL(url.format({ 
        pathname: '/public/html/login.html',//'/index.html',
        protocol: 'file:',
        slashes: true,
    }));

    mainWindow.webContents.openDevTools()


    // const uri = "mongodb+srv://edfusion:hackathon@cluster0.zetfo.mongodb.net/edfusion?retryWrites=true&w=majority";
    // MongoClient.connect(uri).then(function (mongo) 
    // {
    //     console.log('Connected...');

    //     const collection = mongo.db("edfusion").collection("classrooms");
    //     const changeStream = collection.watch();

    //     changeStream.on('change',function(change)
    //     {
    //         // console.log("ASDONJFOSDIHNFIOSDNF"+JSON.stringify(change));

    //         const query = {};
    //         collection.find(query).toArray().then(items =>
    //         {
    //             mainWindow.webContents.send('reply', JSON.stringify(items));

    //         }).catch(err => console.error(`Failed to find documents: ${err}`))
    //     });

    // }).catch(function (err) {})

});

// ipc.on('clicked', async function (event, value) 
// {
//     event.preventDefault();
//     const uri = "mongodb+srv://edfusion:hackathon@cluster0.zetfo.mongodb.net/edfusion?retryWrites=true&w=majority";
//     var data = await getData(uri);
//     mainWindow.webContents.send('reply',data);



//     //either work
//     // mainWindow.webContents.send('reply', stuffDb);
//     // event.sender.send('reply', 'value recieved is '+value);
// });

ipc.on('login_data', async function (event, value) {
    event.preventDefault();
    const uri = "mongodb+srv://edfusion:hackathon@cluster0.zetfo.mongodb.net/edfusion?retryWrites=true&w=majority";
    await verifyTeacher(uri, value).then((data) => {
        console.log(data);
        if (data === true) {
            mainWindow.loadURL(url.format({
                pathname: '/public/html/dashboard.html',
                protocol: 'file:',
                slashes: true,
            }));
        }
    });

    // mainWindow.webContents.send('reply',success);

    //either work
    // mainWindow.webContents.send('reply', stuffDb);
    // event.sender.send('reply', 'value recieved is '+value);
});

ipc.on('getRoomCode', async function (event, value) {
    event.preventDefault();
    const uri = "mongodb+srv://edfusion:hackathon@cluster0.zetfo.mongodb.net/edfusion?retryWrites=true&w=majority";
    await getRoomCode(uri).then((roomCode) => {
        console.log(roomCode);
        if (roomCode) {
            mainWindow.loadURL(url.format({
                pathname: '/public/html/classcode.html',
                protocol: 'file:',
                slashes: true,
            })).then(() => {
                mainWindow.webContents.send('code', roomCode);
            });
        }
    });

    //either work
    // mainWindow.webContents.send('reply', stuffDb);
    // event.sender.send('reply', 'value recieved is '+value);
});


ipc.on('startClass', async function (event, value) {
    event.preventDefault();
    mainWindow.loadURL(url.format({
        pathname: '/public/html/classroom.html',
        protocol: 'file:',
        slashes: true,
    })).then(()=>
    {
        console.log("CHANGED SCREEN")
        const uri = "mongodb+srv://edfusion:hackathon@cluster0.zetfo.mongodb.net/edfusion?retryWrites=true&w=majority";
        MongoClient.connect(uri).then(function (mongo) 
        {
            console.log('Connected...');

            const collection = mongo.db("edfusion").collection("classrooms");
            const changeStream = collection.watch();

            changeStream.on('change',function(change)
            {
                var questionsArr = change.fullDocument.questions;
                var question = questionsArr[questionsArr.length-1].question;
                if(!questions.has(question))
                    mainWindow.webContents.send('newQuestion', question);
            });

        }).catch(function (err) {
            console.log("ERROR"+ err)
        })

    });

   
});

async function verifyTeacher(uri, value) {
    return await MongoClient.connect(uri)
        .then(async function (mongo) {
            console.log('Connected...');

            const collection = mongo.db("edfusion").collection("teachers");

            const query = { email: value[0], password: value[1] };
            var data = null;
            return await collection.find(query).toArray().then(items => {
                console.log(items.length);
                if (items.length > 0)
                    data = true;
                else
                    data = false;
                teacherID = items[0]._id;
                return data;
            }).catch(err => console.error(`Failed to find documents: ${err}`))


        }).catch(function (err) { })

}
async function getRoomCode(uri) {
    return await MongoClient.connect(uri)
        .then(async function (mongo) {
            console.log('Connected...');

            const collection = mongo.db("edfusion").collection("classrooms");

            const query = {};
            return await collection.find(query).toArray().then(async (items) => {
                var codes = new Set();
                items.forEach((item) => {
                    codes.add(item.code)
                })
                // codes.forEach((code)=>console.log(code));
                var num = Math.floor((Math.random() * 999999) + 1);
                while (codes.has(num) === true)
                    num = Math.floor((Math.random() * 999999) + 1);

                await collection.insertOne
                    (
                        {
                            "code": num,
                            "teacherID": teacherID,
                            "students": [],
                            "questions": [],
                            "ratings": []
                        }
                    );

                return num;
            }).catch(err => console.error(`Failed to find documents: ${err}`))


        }).catch(function (err) { })

}

async function getData(uri) {
    await MongoClient.connect(uri)
        .then(async function (mongo) {
            console.log('Connected...');

            const collection = mongo.db("edfusion").collection("classrooms");

            // collection.deleteMany({ stuffs: "i got added" });

            await collection.insertOne
                (
                    {
                        "code": 15927,
                        "teacherID": "453125",
                        "students":
                            [
                                {
                                    "student_id": "saidojasd",
                                    "muted": false,
                                    "confusion": 40,
                                }
                            ],
                        "questions":
                            [
                                {
                                    "student_id": "saidojasd",
                                    "question": "Why is sarvesh?"
                                }
                            ],
                        "ratings": [4, 1, 5]
                    }
                );

            // await collection.insertOne
            // (
            //     {
            //         "email":"hi@gmail.com",
            //         "password":"duisdfisk",
            //         "code": 3457823,
            //         "statistics":
            //         [
            //             {
            //                 "classroomID": "asdfd324324",
            //                 "averageRating": 2,
            //                 "averageConfusion": 40,
            //                 "studentsAttended": 20
            //             }
            //         ]
            //     }
            // );

            const query = {};
            var data = null;
            await collection.find(query).toArray().then(items => {
                data = JSON.stringify(items);

            }).catch(err => console.error(`Failed to find documents: ${err}`))

            return data;

        }).catch(function (err) { })

}