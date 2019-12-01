var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require('path');

//for internal logging
require('log-timestamp');

const hostname = '127.0.0.1';
const port = 80;

// mongodb guides
  // https://docs.mongodb.com/manual/tutorial/install-mongodb-on-os-x/
  // http://mongodb.github.io/node-mongodb-native/2.2/quick-start/quick-start/

var mongoDBClient = require('mongodb').MongoClient, assert = require('assert');
var mongoURL = 'mongodb://localhost:27017/data';

// 1. terminal 1: go to server folder
//    cd Server
// 2. start mongoDB
//    mongod --dbpath data
// 3. terminal 2: got to server folder
//    cd Server
// 4. start node server
//    node server.js

//Initially connect to the database and create the collection in which the sessions are saved for their duration
mongoDBClient.connect(mongoURL, function(err, client) {
  if (err) throw err;

  var mongoDB = client.db("messagesDB");

  mongoDB.createCollection("sessions", function(err, res) {
    if (err) throw err;

    console.log("Collection \"sessions\" created.");
    client.close();
  });
});

//Supply the whole client folder to any requesting host and console log when it happened
app.use(function(req, res, next) {
  if (req.originalUrl == "/") console.log("The site was requested!", req.originalUrl);
  next();
}, express.static(path.join(__dirname, '../Client/')));

function createSessionEntry(mongoDB, clientID) {
  mongoDB.collection("sessions").insertOne({ c1: clientID, c2: null }, function(err, res) {
    if (err) throw err;

    console.log("Created new session entry for client " + clientID + ".");
  });
}

//Handle a connection from a client when it wants to play a multiplayer game
io.on('connection', function(socket){
  var clientID = socket.id;
  console.log("Client " + clientID + " has connected.");
  //Connect to the database
  mongoDBClient.connect(mongoURL, function(err, client) {
    if (err) throw err;
    //Check if we have anyone waiting for an opponent
    var mongoDB = client.db("messagesDB");
    var query = { c2: null };
    mongoDB.collection("sessions").find(query).toArray(function(err, result) {
      if (err) throw err;

      if (result.length == 0) { //If not, create a new session for the client to wait on an opponent
        createSessionEntry(mongoDB, clientID);
      } else {  //If there already exists a sesstion, add the client to it and begin game
        var newValues = {$set: {c2: clientID}};
        mongoDB.collection("sessions").updateOne(result[0], newValues, function(err, res) {
          if (err) throw err;

          console.log("Added client " + clientID + " to existing session entry.");
        });
        socket.to(result[0].c1).emit('showBoard', 0);
        socket.emit('showBoard', 1);//Begin game on both clients
      }
      client.close();
    });
  });
  
  // When one player makes a move, handle it
  socket.on('setMove', function(msg){
    mongoDBClient.connect(mongoURL, function(err, client) {
      if (err) throw err;

      // Return the move to client so it is shown on the board
      socket.emit('setMove', msg);
      
      // Get the other player and send the move of the other player to it. Have to check for c1 or c2, because we can be 1st or 2nd comer.
      var mongoDB = client.db("messagesDB");
      var query = { c1: clientID };
      mongoDB.collection("sessions").find(query).toArray(function(err, result) {
        if (err) throw err;
        if (result.length != 0) {
          socket.to(result[0].c2).emit('setMove', msg); // Send to other player
        }
        client.close();
      });

      // Get the other player and send the move of the other player to it. Have to check for c1 or c2, because we can be 1st or 2nd comer.
      query = { c2: clientID };
      mongoDB.collection("sessions").find(query).toArray(function(err, result) {
        if (err) throw err;
        if (result.length != 0) {
          socket.to(result[0].c1).emit('setMove', msg); // Send to other player
        }
        client.close();
      });
    });
  });

  //Delete session when one disconnects
  socket.on('disconnect', function(){
    console.log("Client " + clientID + " has disconnected.");

    mongoDBClient.connect(mongoURL, function(err, client) {
      if (err) throw err;
      
      var mongoDB = client.db("messagesDB");
      var query = { c1: clientID };
      mongoDB.collection("sessions").find(query).toArray(function(err, result) {
        if (err) throw err;
        if (result.length != 0) {
          socket.to(result[0].c2).emit('hideBoard', "");
          var clientID2 = result[0].c2;
          mongoDB.collection("sessions").deleteOne(result[0], function(err, res) {
            if (err) throw err;
            
            console.log("The session entry of " + clientID + " & " + clientID2 + " has been deleted from the DB.");
            client.close();
          });
        }
      });

      query = { c2: clientID };
      mongoDB.collection("sessions").find(query).toArray(function(err, result) {
        if (err) throw err;
        if (result.length != 0) {
          socket.to(result[0].c1).emit('hideBoard', "");
          var clientID2 = result[0].c1;
          mongoDB.collection("sessions").deleteOne(result[0], function(err, res) {
            if (err) throw err;
            
            console.log("The session entry of " + clientID2 + " & " + clientID + " has been deleted from the DB.");
            client.close();
          });
        }
      });
    });
  });
});

// Initialize the listening function
http.listen(port, function(){
  console.log(`Server running at http://${hostname}:${port}/`);
});
