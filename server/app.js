var express = require('express');
var path = require('path');
var http = require('http');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');

var socketio = require('socket.io');

var mongo = require('mongodb').MongoClient;


var app = express();
var httpServer = http.Server(app);
var io = socketio(httpServer);

//------------------------------------------------------------------------------------
//------------------------------------------------------------------------------------

app.use(express.static('../public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:false}));

var routes = express.Router('questions');

//------------------------------------------------------------------------------------
//------------------------------------------------------------------------------------

mongo.connect('mongodb://127.0.0.1:27017/TAQ', function(err, db) {
    if (err) throw err;
    console.log("Connected to database TAQ");

    var collection = db.collection('questions');
    var collection2 = db.collection('questionSets');
    var collection3 = db.collection('users');
    var collection4 = db.collection('urls');
    var collection5 = db.collection('results');

    var playerList = [];

    routes.get('/db', function(req, res) {
        var dataresponse = {};

        collection.find().toArray( function( err, resultArray){
            dataresponse.questions = resultArray;

            collection2.find().toArray( function( err, resultArray){
                dataresponse.questionSets = resultArray;
                res.json(dataresponse);
            });
        });
    });

    routes.post('/login', function(req,res) {
        var userExists = false;
        collection3.find().toArray(function(err, resultArray){
            var i;
            for(i = 0; i < resultArray.length; i++) {
                if(resultArray[i].username === req.body.username && resultArray[i].password === req.body.password) {
                    userExists = true;
                    break;
                }
                else if(i == resultArray.length -1 && resultArray[i].username !== req.body.username && resultArray[i].password !== req.body.password) {
                    userExists = false;
                }
            }
            res.json(userExists);
        });
    });

    routes.post('/docent/:id', function(req,res) {
        collection4.insert(req.body, function(err, result) {
            res.json(result[0])
        })
    });

    routes.post('/docent', function(req,res) {
        collection2.insert(req.body, function(err, result) {
            res.json(result[0]);
        });
    });

    routes.post('/:id', function(req,res) {
        var urlExists = false;

//        if(playerList.indexOf(req.body.studentName) < 0) {
//            console.log('toegevoegd');
//            var newPlayer = {
//                studentName: req.body.studentName,
//                score: 0
//            };
//
//            playerList.push(newPlayer);
//            console.log(playerList);

            collection4.find().toArray(function (err, resultArray) {
                var i;
                for (i = 0; i < resultArray.length; i++) {
                    if (resultArray[i].urlString === req.params.id) {
                        urlExists = true;
                        break;
                    }
                    else if(i == resultArray.length -1 &&  resultArray[i].urlString !== req.params.id) {
                        urlExists = false;

                    }
                }
                res.json(urlExists);
            });

    });


    routes.get('/error', function(req,res) {
    });

    io.on("connection",function(socket) {

        socket.on("new player", function(name) {
            var newPlayerObject = {
                studentName: name,
                score: 0
            };
            playerList.push(newPlayerObject);

            socket.emit("new player joined", newPlayerObject);
            socket.broadcast.emit("new player joined", newPlayerObject);
        });

        socket.on("send question", function(question) {
            socket.broadcast.emit("question sent", question);
        });

        socket.on("send answer", function(answerObject) {
            console.log(answerObject);
            socket.broadcast.emit("answer sent", answerObject);
        });

        socket.on("quiz results", function(finaldata) {
            socket.broadcast.emit("results sent", finaldata);

            for(var i=0; i< finaldata.players.length; i++) {
                delete finaldata.players[i].$$hashKey;
            }

            finaldata.date = new Date();
            console.log(finaldata);
            collection5.insert(finaldata, function(err, result) {
                console.log(result);
                console.log(err);
            });
        })
    });



    app.use('/', routes);

});


//------------------------------------------------------------------------------------
//------------------------------------------------------------------------------------



//------------------------------------------------------------------------------------
//------------------------------------------------------------------------------------




//------------------------------------------------------------------------------------
//------------------------------------------------------------------------------------

httpServer.listen(3001, '0.0.0.0');
