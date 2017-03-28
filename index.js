// Setup basic express server
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var mysql = require("mysql");
var port = process.env.PORT || 3000;

// First you need to create a connection to the db
var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root",
  database : "xxx",
  socketPath: '/Applications/MAMP/tmp/mysql/mysql.sock',
  multipleStatements: true
});

server.listen(port, function () {
  console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(__dirname + '/public'));

// Database
con.connect(function(err) {
  if(err) {
    console.log('Error connecting to Db ' + err);
    return;
  }
  console.log('Connection established');
});

// var chatx = { username: 'Cinni', to_username: 'Minni', msg: 'Hello!!' };
// con.query('INSERT INTO chatx SET ?', chatx, function(err,res){
//   if(err) throw err;

//   console.log('Last insert ID:', res.insertId);
// });

// con.query(
//   'UPDATE chatx SET to_username = ? WHERE username = ?',
//   ["Sindy", "Cinni"],
//   function (err, result) {
//     if (err) throw err;

//     console.log('Changed ' + result.changedRows + ' rows');
//   }
// );

// con.query(
//   'DELETE FROM employees WHERE id = ?',
//   [5],
//   function (err, result) {
//     if (err) throw err;

//     console.log('Deleted ' + result.affectedRows + ' rows');
//   }
// );

// con.query('SELECT * FROM chatx',function(err,rows){
//   if(err) throw err;

//   console.log('Data received from Db:\n');
//   for (var i = 0; i < rows.length; i++) {
//     console.log(rows[i].username);
//   };
// });

// Chatroom

var numUsers = 0;

io.on('connection', function (socket) {
  var addedUser = false;

  // when the client emits 'new message', this listens and executes
  socket.on('new message', function (data) {
    // we tell the client to execute 'new message'
    io.in(data.room).emit('mesaj', data);
    // console.log('username: ' , socket.username);

    // io.sockets.in(data.room).emit('new message', {
    //   room: data.room,
    //   username: socket.username,
    //   to: data.to,
    //   message: data.message
    // });

    // socket.broadcast.to(data.room).emit('new message', {
    //   room: data.room,
    //   username: socket.username,
    //   to: data.to,
    //   message: data.message
    // });

    var chatx = { username: data.username, to_username: data.to, msg: data.message };
    con.query('INSERT INTO chatx SET ?', chatx, function(err, res) {
      if(err) {
        // console.log(err);
        throw err;
      }
      // console.log('Last insert ID:', res.insertId);
    });
  });

  // socket.on('create room', function(room) {
  //   console.log('creating room', room);
  //   socket.join(room);
  //   var name = {name: room};
  //   con.query('INSERT INTO room SET ?', name, function(err,res){
  //     if(err) {
  //       // console.log(err);
  //       throw err;
  //     }
  //     // console.log('Last insert ID:', res.insertId);
  //   });
  // });

  socket.on('check db', function(room) {
    console.log('checking room', room);
    // var room = { name: room };
    con.query('SELECT * FROM room WHERE name = ?', room, function (err, result) {
      if (err) throw err;
      if (result.length > 0) {
        socket.join(room);
        console.log('joined room!', result);
      } else {
          // socket.emit('create room', to);
          console.log('no such room!');
          // alert('no such room!');
        }
      }
      );
  });

  // when the client emits 'add user', this listens and executes
  socket.on('add user', function (data) {
    if (addedUser) return;

    // var user = { username: data.username, pass: data.pass };
    var username = data.username;
    var pass = data.pass;
    con.query('SELECT * FROM users WHERE username=? AND pass=?', [username, pass], function (err, result) {
      if (err) throw err;
      if (result.length > 0) {
        console.log('logged in!');
          // we store the username in the socket session for this client
          socket.username = username;
          ++numUsers;
          addedUser = true;
          socket.emit('login', {
            numUsers: numUsers,
            username: username,
            pass: pass
          });
          // echo globally (all clients) that a person has connected
          socket.emit('user joined', {
            username: socket.username,
            numUsers: numUsers
          });
        } else {
          console.log('username or password is wrong!');
          socket.emit('disconnect');
        }
      });
  });

  // when the client emits 'typing', we broadcast it to others
  socket.on('typing', function () {
    socket.broadcast.emit('typing', {
      username: socket.username
    });
  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on('stop typing', function () {
    socket.broadcast.emit('stop typing', {
      username: socket.username
    });
  });

  // when the user disconnects.. perform this
  socket.on('disconnect', function () {
    if (addedUser) {
      --numUsers;

      // echo globally that this client has left
      socket.broadcast.emit('user left', {
        username: socket.username,
        numUsers: numUsers
      });
    }
  });
});

// con.end(function(err) {
//   // The connection is terminated gracefully
//   // Ensures all previously enqueued queries are still
//   // before sending a COM_QUIT packet to the MySQL server.
// });
