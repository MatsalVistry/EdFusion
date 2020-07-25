const electron = require('electron');
const url = require('url');
const path = require('path');
const { protocol, Notification } = require('electron');
const { pipeline } = require('stream');
const { verify } = require('crypto');

const { app, BrowserWindow } = electron;

let mainWindow;
const ipc = electron.ipcMain;
const MongoClient = require('mongodb').MongoClient;
var teacherID = null;
var questions = new Set();
var classCode = null;
const uri = "mongodb+srv://edfusion:hackathon@cluster0.zetfo.mongodb.net/edfusion?retryWrites=true&w=majority";

var addStatus = true;
var teacherID = null;
var inSession = null;
var ratings = null;
var ratingsSession = null;
var confusionChartvsTime = [];


app.on('ready', async function () {
    mainWindow = new BrowserWindow({
        webPreferences: {
            nodeIntegration: true
        }
    });

    mainWindow.loadURL(url.format({
        pathname: '/public/html/login.html',
        protocol: 'file:',
        slashes: true,
    }));

    mainWindow.webContents.openDevTools() //TODO remove on prod

    mainWindow.on('close', async (e) => {
        e.preventDefault();
        MongoClient.connect(uri).then(async function (mongo) {
            const collection = mongo.db("edfusion").collection("classrooms");
            const query = { code: classCode };
            const collection2 = mongo.db("edfusion").collection("teachers");
            const query2 = { code: classCode };

            if (ratingsSession) {
                ratingsSession = false;
                var classID = await collection.find(query).toArray().then(items => { return items[0]._id; }).catch((err) => console.log(err));

                var doc = await finalTeacherUpdate(collection2, query2, classID);

                await collection2.findOneAndReplace(
                    query2,
                    doc
                ).then(() => {
                    collection.deleteOne(
                        query
                    ).catch(err => console.error(`Failed to find documents: ${err}`)).then(() => {
                        app.exit(0)
                    })
                }).catch((err) => console.log(err))
            }
            else
                app.exit(0);
        }).catch((err) => console.log(err))
    });
});

const finalTeacherUpdate = async (collection, query, classID) => {
    return await collection.find(query).toArray().then(items => {
        var items2 = items;
        items2[0].code = null;
        items2[0].statistics.forEach((stat) => {
            if ((stat && stat.classroomID && classID) && stat.classroomID.toString() == classID.toString()) {
                stat.averageRating = ratings;
            }
        });
        return items2[0];
    }).catch(err => console.error(`Failed to find documents: ${err}`))

}

ipc.on('login_data', async function (event, value) {
    event.preventDefault();
    await verifyTeacher(value).then((data) => {
        if (data === true) {
            mainWindow.loadURL(url.format({
                pathname: '/public/html/dashboard.html',
                protocol: 'file:',
                slashes: true,
            })).then(() => {
                getChartData().then(data => {
                    mainWindow.webContents.send('chartData', data);
                })
            });
        }
    });
});

async function getChartData() {
    return await MongoClient.connect(uri).then(async function (mongo) {
        const collection = mongo.db("edfusion").collection("teachers");
        const query = { _id: teacherID };
        return await collection.find(query).toArray().then(items => {
            var items2 = items;
            var confusionChart = [];
            var ratingsChart = [];
            var attendanceChart = [];
            var counter = 0;
            items2[0].statistics.forEach((indClass) => {
                counter++;
                var confusionPoint =
                {
                    "x": counter,
                    "y": indClass.averageConfusion || 0
                }
                confusionChart.push(confusionPoint);
                var ratingPoint =
                {
                    "x": counter,
                    "y": indClass.averageRating || 0
                }
                ratingsChart.push(ratingPoint);
                var attendancePoint =
                {
                    "x": counter,
                    "y": indClass.studentsAttended || 0
                }
                attendanceChart.push(attendancePoint);
            });
            return [confusionChart, ratingsChart, attendanceChart];
        }).catch(err => console.error(`Failed to find documents: ${err}`))
    }).catch(err => console.log(err))
};

ipc.on('getRoomCode', async function (event, value) {
    event.preventDefault();
    await getRoomCode().then((roomCode) => {
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
});

ipc.on('endClass', async function (event, value) {
    event.preventDefault();
    inSession = false;
    await updateClassroom();
    await updateTeacher();

    mainWindow.loadURL(url.format({
        pathname: '/public/html/dashboard.html',
        protocol: 'file:',
        slashes: true,
    })).then(async () => {
        getChartData().then(data => {
            mainWindow.webContents.send('chartData', data);
        })
        mainWindow.webContents.send('loadPreviousSessionGraph', confusionChartvsTime);
        ratingsSession = true;
        ratings = 0;
        await ratingsBuilder();
    });
});

const ratingsBuilder = async () => {
    var timeout = 5000;
    setTimeout(async () => {
        await MongoClient.connect(uri).then(async function (mongo) {
            if (ratingsSession) {
                const collection = mongo.db("edfusion").collection("classrooms");
                const query = { code: classCode };
                await collection.find(query).toArray().then(items => {
                    var rateAverage = 0;
                    var totalStudents = 0;
                    items[0].ratings.forEach((rate) => {
                        rateAverage += rate;
                        totalStudents++;
                    });
                    rateAverage /= totalStudents;
                    ratings = rateAverage || 0;

                }).catch(err => console.error(`Failed to find documents: ${err}`))
            }
        });

        if (ratingsSession) {
            mainWindow.webContents.send('updatedRatings', ratings);
            ratingsBuilder();
        }
    }, timeout)
}

ipc.on('mutePerson', async function (event, question) {
    event.preventDefault();
    await mutePerson(question).then(async () => { });
});

async function mutePerson(question) {
    return await MongoClient.connect(uri).then(async function (mongo) {
        console.log('Connected...');

        const collection = mongo.db("edfusion").collection("classrooms");

        const query = { code: classCode };
        var doc = await muteHelper(collection, query, question);

        await collection.findOneAndReplace(
            query,
            doc
        ).catch((err) => console.log(err))
    }).catch(function (err) { })
}

async function muteHelper(collection, query, question) {

    return await collection.find(query).toArray().then(items => {
        var items2 = items;
        var studentID = null;
        items2[0].questions.forEach((q) => {
            if (q.question == question)
                studentID = q.student_id;
        })

        items2[0].students.forEach((student) => {
            if (student.student_id == studentID)
                student.muted = !student.muted;
        })
        return items2[0];
    }).catch(err => console.error(`Failed to find documents: ${err}`))
}

async function updateClassroom() {
    return await MongoClient.connect(uri).then(async function (mongo) {
        console.log('Connected...');

        const collection = mongo.db("edfusion").collection("classrooms");

        const query = { code: classCode };
        const update = { $set: { "finished": true } }
        return await collection.updateOne(query, update).catch(err => {
            console.log(err);
        })
    })
}

async function updateTeacher() {
    return await MongoClient.connect(uri).then(async function (mongo) {
        console.log('Connected...');
        const collection = mongo.db("edfusion").collection("classrooms");

        const query = { code: classCode };
        var data = null;
        return await collection.find(query).toArray().then(async (items) => {
            var totalStudents = 0;
            var averageConfusion = 0;
            var averageRatings = 0;

            items[0].students.forEach((student) => {
                averageConfusion += student.confusion;
                totalStudents++;
            });
            items[0].ratings.forEach((rate) => averageRatings += rate);
            averageRatings /= items[0].ratings.length;
            averageConfusion /= totalStudents;
            var arr = [averageConfusion, averageRatings, totalStudents];


            const collection2 = mongo.db("edfusion").collection("teachers");
            const query2 = { code: classCode };
            var doc = await getUpdatedTeacher(collection2, query2, arr, items[0]._id);

            await collection2.findOneAndReplace(
                query2,
                doc
            ).catch((err) => console.log(err))
        }).catch(err => console.error(`Failed to find documents: ${err}`))

    }).catch(function (err) { })
}

async function getUpdatedTeacher(collection, query, arr, cid) {
    return await collection.find(query).toArray().then(items => {
        var items2 = items;
        var obj =
        {
            "averageConfusion": arr[0],
            "averageRating": arr[1],
            "studentsAttended": arr[2],
            "classroomID": cid
        }
        items2[0].statistics.push(obj);
        return items2[0];
    }).catch(err => console.error(`Failed to find documents: ${err}`))
}



ipc.on('deleteQuestion', async function (event, question) {
    addStatus = false;
    questions.delete(question);
    event.preventDefault();
    await deleteQuestion(question).then(async () => {
        addStatus = true;
    });
});

async function deleteQuestion(question) {
    return await MongoClient.connect(uri).then(async function (mongo) {
        console.log('Connected...');
        const collection = mongo.db("edfusion").collection("classrooms");

        const query = { code: classCode };
        var doc = await getUpdatedDocument(collection, query, question);

        await collection.findOneAndReplace(
            query,
            doc
        ).catch((err) => console.log(err))
    }).catch(function (err) { })
}

async function getUpdatedDocument(collection, query, question) {
    console.log("TRYING TO UPDATE");

    return await collection.find(query).toArray().then(items => {
        var items2 = items;
        var questionsArr = items2[0].questions;
        questionsArr = questionsArr.filter(q => q.question != question);
        items2[0].questions = questionsArr;

        return items2[0];
    }).catch(err => console.error(`Failed to find documents: ${err}`))
}

ipc.on('startClass', async function (event, value) {
    event.preventDefault();
    mainWindow.loadURL(url.format({
        pathname: '/public/html/classroom.html',
        protocol: 'file:',
        slashes: true,
    })).then(() => {
        MongoClient.connect(uri).then(function (mongo) {

            console.log('Connected...');
            inSession = true;
            addStatus = true;
            confusionChartvsTime = [];
            questions = new Set();
            let today = new Date();

            confusionChartvsTime.push({
                "x": (today.getHours() % 12) + ":" + today.getMinutes() + ":" + today.getSeconds(),
                "y": 0
            })
            mainWindow.webContents.send('updatedSessionChart', confusionChartvsTime);
            confusionChartBuilder();
            const collection = mongo.db("edfusion").collection("classrooms");
            var changeStream = collection.watch();

            changeStream.on('change', function (change) {
                if (addStatus) {
                    console.log(change)
                    const query = { _id: change.documentKey._id }
                    collection.findOne(query).then((res) => {
                        if (res.code == classCode) {
                            let questionsArr = null;
                            if (change.fullDocument)
                                questionsArr = change.fullDocument.questions;
                            else if (change.updateDescription)
                                questionsArr = change.updateDescription.updatedFields.questions;
                            if (questionsArr && questionsArr.length > 0) {
                                var question = questionsArr[questionsArr.length - 1].question;
                                if (!questions.has(question)) {
                                    questions.add(question)
                                    mainWindow.webContents.send('newQuestion', question);
                                    new Notification({
                                        title: "New Question!",
                                        body: question
                                    }).show()
                                }
                            }
                        }
                    })
                }
            });
        }).catch(function (err) {
            console.log("ERROR" + err)
        })
    });
});


async function confusionChartBuilder() {
    var timeout = 5000;
    setTimeout(async () => {
        await MongoClient.connect(uri).then(async function (mongo) {
            if (inSession) {
                const collection = mongo.db("edfusion").collection("classrooms");
                const query = { code: classCode };
                await collection.find(query).toArray().then(items => {
                    var confusionAverage = 0;
                    var totalStudents = 0;
                    items[0].students.forEach((student) => {
                        confusionAverage += student.confusion;
                        totalStudents++;
                    });
                    confusionAverage /= totalStudents;
                    var today = new Date();

                    var obj =
                    {
                        "x": (today.getHours() % 12) + ":" + today.getMinutes(),
                        "y": (confusionAverage) || 0
                    }
                    confusionChartvsTime.push(obj);

                }).catch(err => console.error(`Failed to find documents: ${err}`))
            }
        });

        if (inSession) {
            mainWindow.webContents.send('updatedSessionChart', confusionChartvsTime);
            confusionChartBuilder();
        }
    }, timeout)

}

async function verifyTeacher(value) {
    return await MongoClient.connect(uri)
        .then(async function (mongo) {
            console.log('Connected...');

            const collection = mongo.db("edfusion").collection("teachers");

            const query = { email: value[0], password: value[1] };
            var data = null;
            return await collection.find(query).toArray().then(items => {
                if (items.length > 0) {
                    data = true;
                }
                else
                    data = false;
                teacherID = items[0]._id;
                return data;
            }).catch(err => console.error(`Failed to find documents: ${err}`))


        }).catch(function (err) { })
}

async function getRoomCode() {
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
                var num = Math.floor((Math.random() * 999999) + 1);
                while (codes.has(num) === true)
                    num = Math.floor((Math.random() * 999999) + 1);
                classCode = num;

                await collection.insertOne
                    (
                        {
                            "code": num,
                            "teacherID": teacherID,
                            "finished": false,
                            "students": [],
                            "questions": [],
                            "ratings": [],
                            "reviews": []
                        }
                    );
                const collection2 = mongo.db("edfusion").collection("teachers");
                const query2 = { _id: teacherID };
                var doc = await updateTeacherCode(collection2, query2, num);

                await collection2.findOneAndReplace(
                    query2,
                    doc
                ).catch((err) => console.log(err))
                return num;
            }).catch(err => console.error(`Failed to find documents: ${err}`))
        }).catch(function (err) { })
}
async function updateTeacherCode(collection, query, num) {
    return await collection.find(query).toArray().then(items => {
        var items2 = items;
        items2[0].code = num;
        return items2[0];
    }).catch(err => console.error(`Failed to find documents: ${err}`))
}