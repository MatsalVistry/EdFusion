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
var classCode = 0;
const uri = "mongodb+srv://edfusion:hackathon@cluster0.zetfo.mongodb.net/edfusion?retryWrites=true&w=majority";
var addStatus = true;
var inSession = null;
var ratings = null;
var ratingsSession = null;
var confusionChartvsTime = [];
var reviewSet = new Set();
var alreadySessionMade = false;
var changeStreamMongo = null;
var changeStream = null;
var codeEnterSession = false;
var studentsAmount = 0;
var questionWindow = null;
var currentQuestionOnWindow = null;


app.on('ready', async function () {
    mainWindow = new BrowserWindow({
        minWidth: 1050,
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
            const query = { "code": classCode };
            const collection2 = mongo.db("edfusion").collection("teachers");
            const query2 = { "code": classCode };

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
                    ).catch(err => console.error(`Failed to find documents A: ${err}`))
                }).catch((err) => console.error(`Failed to find documents B: ${err}`))
            }
            if(classCode!=0)
            {
                collection.deleteOne(
                    query
                ).catch(err => console.error(`Failed to find documents AA: ${err}`))
            }
            mongo.close()
        }).catch(() => {
            app.exit(0)
        }).finally(() => {
            app.exit(0)
        })
    });
});

ipc.on('sessionAlreadyDone', async function (event) 
{
    mainWindow.webContents.send('chartData', alreadySessionMade);
});

const finalTeacherUpdate = async (collection, query, classID) => {
    return await collection.find(query).toArray().then(items => {
        var items2 = items;
        if(items2)
        {
        items2[0].code = 0;
        items2[0].statistics.forEach((stat) => {
            if ((stat && stat.classroomID && classID) && stat.classroomID.toString() == classID.toString()) {
                stat.averageRating = ratings;
            }
        });
    }
        return items2[0];
    }).catch(err => console.error(`Failed to find documents C: ${err}`))
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
        } else {
            mainWindow.loadURL(url.format({
                pathname: '/public/html/login.html',
                protocol: 'file:',
                slashes: true,
            })).then(() => {
                mainWindow.webContents.send('login_error', "Incorrect credentials.");              
            });
        }
    });
});

async function getChartData() {
    return await MongoClient.connect(uri).then(async function (mongo) {
        const collection = mongo.db("edfusion").collection("teachers");
        const query = { "_id": teacherID };
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
                    "y": indClass.averageConfusion || 50
                }
                confusionChart.push(confusionPoint);
                var ratingPoint =
                {
                    "x": counter,
                    "y": indClass.averageRating || 2.5
                }
                ratingsChart.push(ratingPoint);
                var attendancePoint =
                {
                    "x": counter,
                    "y": indClass.studentsAttended || 0
                }
                attendanceChart.push(attendancePoint);
            });
            mongo.close()
            return [confusionChart, ratingsChart, attendanceChart];
        }).catch(err => console.error(`Failed to find documents D: ${err}`))
    }).catch(err => console.log(err))
};

ipc.on('getRoomCode', async function (event, value) {
    event.preventDefault();

    if (alreadySessionMade) {
        await MongoClient.connect(uri).then(async function (mongo) {
            const collection = mongo.db("edfusion").collection("classrooms");
            const query = { "code": classCode };
            const collection2 = mongo.db("edfusion").collection("teachers");
            const query2 = { code: classCode };


            ratingsSession = false;
            var classID = await collection.find(query).toArray().then(items => { return items[0]._id; }).catch((err) => console.log(err));
            var doc = await finalTeacherUpdate(collection2, query2, classID);

            await collection2.findOneAndReplace
                (
                    query2,
                    doc
                ).then(() => { collection.deleteOne(query).catch((err) => console.log(err)) })
            mongo.close()
        }).catch((err) => console.log(err))
    }

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
    changeStreamMongo.close();
    changeStream.close();
    inSession = false;
    reviewSet = new Set();
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
        reviewsBuilder();
        ratingsBuilder();
    });
});


const reviewsBuilder = async () => {
    var reviews = []
    var timeout = 5000;
    setTimeout(async () => {
        await MongoClient.connect(uri).then(async function (mongo) {
            if (ratingsSession) {
                const collection = mongo.db("edfusion").collection("classrooms");
                const query = { "code": classCode };
                await collection.find(query).toArray().then(items => {
                    items[0].reviews.forEach((review) => {
                        if (!reviewSet.has(review)) {
                            reviews.push(review);
                            reviewSet.add(review);
                        }
                    })

                }).catch(err => console.error(`Failed to find documents E: ${err}`))
            }
            mongo.close()
        });

        if (ratingsSession) {
            // console.log(reviews);
            mainWindow.webContents.send('updatedReviews', reviews);
            reviewsBuilder();
        }
    }, timeout)
}

const ratingsBuilder = async () => {
    var timeout = 5000;
    setTimeout(async () => {
        await MongoClient.connect(uri).then(async function (mongo) {
            if (ratingsSession) {
                const collection = mongo.db("edfusion").collection("classrooms");
                const query = { "code": classCode };
                await collection.find(query).toArray().then(items => {
                    var rateAverage = 0;
                    var totalStudents = 0;
                    items[0].ratings.forEach((rate) => {
                        rateAverage += rate;
                        totalStudents++;
                    });
                    rateAverage /= totalStudents;
                    ratings = rateAverage || 2.5;

                }).catch(err => console.error(`Failed to find documents F: ${err}`))
                mongo.close();
            }
            else
                mongo.close();
        });

        if (ratingsSession) {
            mainWindow.webContents.send('updatedRatings', ratings);
            console.log(ratings);
            ratingsBuilder();
        }
    }, timeout)
}

ipc.on('mutePerson', async function (event, question) {
    event.preventDefault();
    await mutePerson(question).then(async () => { });
    var arr = await  mutePersonQuestions(question);
    console.log(arr);
    mainWindow.webContents.send('mutedArray', arr);

});

async function mutePersonQuestions(q)
{
    return await MongoClient.connect(uri).then(async function (mongo) 
    {
        const collection = mongo.db("edfusion").collection("classrooms");

        const query = { "code": classCode };
        var questionsArr = []
        await collection.find(query).toArray().then(items => 
        {
            var studentID = null;
            items[0].questions.forEach((quest)=>
            {
                if(quest.question.toString()==q.toString())
                {
                    studentID=quest.student_id;
                }
            })
            items[0].questions.forEach((quest)=>
            {
                if(quest.student_id.toString()==studentID.toString())
                {
                    questionsArr.push(quest.question);
                }
            })
        }).catch(err => console.error(`Failed to find documents G: ${err}`))
        mongo.close()
        return questionsArr;
    }).catch((err)=>{console.log(err)});
}

async function mutePerson(question) {
    return await MongoClient.connect(uri).then(async function (mongo) {

        const collection = mongo.db("edfusion").collection("classrooms");

        const query = { "code": classCode };
        var doc = await muteHelper(collection, query, question);

        await collection.findOneAndReplace(
            query,
            doc
        ).catch((err) => console.log(err))
        mongo.close()
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
    }).catch(err => console.error(`Failed to find documents G: ${err}`))
}

async function updateClassroom() {
    await MongoClient.connect(uri).then(async function (mongo) {

        const collection = mongo.db("edfusion").collection("classrooms");

        const query = { "code": classCode };
        const update = { $set: { "finished": true } }
        await collection.updateOne(query, update).catch(err => {
            console.log(err);
        })
        mongo.close()
    })
}

async function updateTeacher() {
    await MongoClient.connect(uri).then(async function (mongo) {
        const collection = mongo.db("edfusion").collection("classrooms");

        const query = { "code": classCode };
        var data = null;
        await collection.find(query).toArray().then(async (items) => {
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
            var arr = [averageConfusion || 50, averageRatings || 2.5, totalStudents||0];


            const collection2 = mongo.db("edfusion").collection("teachers");
            const query2 = { code: classCode };
            var doc = await getUpdatedTeacher(collection2, query2, arr, items[0]._id);

            await collection2.findOneAndReplace(
                query2,
                doc
            ).catch((err) => console.log(err))
            mongo.close()
        }).catch(err => console.error(`Failed to find documents H: ${err}`))
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
    }).catch(err => console.error(`Failed to find documents: 6${err}`))
}



ipc.on('deleteQuestion', async function (event, question) {
    if(currentQuestionOnWindow && (currentQuestionOnWindow==question))
    {
        mainWindow.webContents.send('removeQuestion', question);
        currentQuestionOnWindow = null;
        questionWindow.destroy();
        questionWindow = null;
    }
    addStatus = false;
    questions.delete(question);
    event.preventDefault();
    await deleteQuestion(question).then(async () => {
        addStatus = true;
    });
});

async function deleteQuestion(question) {
    return await MongoClient.connect(uri).then(async function (mongo) {
        const collection = mongo.db("edfusion").collection("classrooms");

        const query = { "code": classCode };
        var doc = await getUpdatedDocument(collection, query, question);

        await collection.findOneAndReplace(
            query,
            doc
        ).catch((err) => console.log(err))
        mongo.close()
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
    }).catch(err => console.error(`Failed to find documents I: ${err}`))
}

const unmuteAll =async(collection,query)=>
{
    return await collection.find(query).toArray().then(items => 
    {
        items2 = items;
        items2[0].students.forEach((student)=>
        {
            student.muted = false;
        })
        return items2[0];
    });
}

ipc.on('startClass', async function (event, value) {
    codeEnterSession = false;
    event.preventDefault();
    mainWindow.loadURL(url.format({
        pathname: '/public/html/classroom.html',
        protocol: 'file:',
        slashes: true,
    })).then(() => {
        MongoClient.connect(uri, { poolSize: 1 }).then(async function (mongo) {
            alreadySessionMade = true;
            inSession = true;
            addStatus = true;
            ratingsSession = false;
            confusionChartvsTime = [];
            questions = new Set();
            let today = new Date();

            confusionChartvsTime.push({
                "x": (today.getHours() % 12) + ":" + today.getMinutes() + ":" + today.getSeconds(),
                "y": 50
            })
            mainWindow.webContents.send('updatedSessionChart', confusionChartvsTime);
            confusionChartBuilder();
            const collection = mongo.db("edfusion").collection("classrooms");
            const query = {"code": classCode};
            var newDoc = await unmuteAll(collection,query)
            await collection.findOneAndReplace(
                query,
                newDoc
            )
            changeStreamMongo = mongo;
            changeStream = collection.watch();

            changeStream.on('change', function (change) {
                if (addStatus) {
                    const query = {"_id": change.documentKey._id }
                    collection.findOne(query).then((res) => {
                        if (res && (res.code == classCode)) {
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
                                    
                                    var n = new Notification({
                                        title: "New Question!",
                                        body: question
                                    })
                                    n.show()
                                    
                                    n.on('click', async (e) => 
                                    {
                                        currentQuestionOnWindow = question;
                                        if(questionWindow)
                                            questionWindow.destroy();

                                        questionWindow = new BrowserWindow({
                                            webPreferences: {
                                                nodeIntegration: true
                                            }
                                        });

                                        questionWindow.loadURL(url.format({
                                            pathname: '/public/html/questionWindow.html',
                                            protocol: 'file:',
                                            slashes: true,
                                        })).then(() => {
                                            questionWindow.webContents.send('newQuestion', question);
                                            questionWindow.on('close',async(e)=>
                                            {
                                                currentQuestionOnWindow = null;
                                            })
                                        })
                                    })
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

ipc.on('deleteQuestionWindow', async function (event, question) {
    mainWindow.webContents.send('removeQuestion', question);
    currentQuestionOnWindow = null;
    questionWindow.destroy();
    questionWindow = null;
   
});

async function confusionChartBuilder() {
    var timeout = 5000;
    setTimeout(async () => {
        await MongoClient.connect(uri).then(async function (mongo) {
            if (inSession) {
                const collection = mongo.db("edfusion").collection("classrooms");
                const query = { "code": classCode };
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
                        "y": (confusionAverage) || 50
                    }
                    confusionChartvsTime.push(obj);

                }).catch(err => console.error(`Failed to find documents J: ${err}`))
            }
            mongo.close()
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

            const collection = mongo.db("edfusion").collection("teachers");

            const query = { "email": value[0], "password": value[1] };
            var data = null;
            return await collection.find(query).toArray().then(items => {
                if (items.length > 0) 
                {
                    data = true;
                    teacherID = items[0]._id;
                }
                else
                    data = false;
                mongo.close()
                return data;

            }).catch(err => console.error(`Failed to find documents K: ${err}`))
        }).catch(function (err) { })
}

async function getRoomCode() {
    return await MongoClient.connect(uri)
        .then(async function (mongo) {
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
                codeEnterSession = true;
                studentsAmount = 0;
                studentsAmountBuilder();
                mongo.close()
                return num;
            }).catch(err => console.error(`Failed to find documents L: ${err}`))
        }).catch(function (err) { })
}
async function updateTeacherCode(collection, query, num) {
    return await collection.find(query).toArray().then(items => {
        var items2 = items;
        items2[0].code = num;
        return items2[0];
    }).catch(err => console.error(`Failed to find documents M: ${err}`))
}

const studentsAmountBuilder = async () => {
    var timeout = 3000;
    setTimeout(async () => {
        await MongoClient.connect(uri).then(async function (mongo) {
            if (codeEnterSession) {
                const collection = mongo.db("edfusion").collection("classrooms");
                const query = { "code": classCode };
                await collection.find(query).toArray().then(items => {
                    studentsAmount = Object.keys(items[0].students).length;
                });
            }
            mongo.close()
        });

        if (codeEnterSession) {
            mainWindow.webContents.send('updatedStudents', studentsAmount);
            studentsAmountBuilder();
        }
    }, timeout)
}