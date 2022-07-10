require('dotenv').config();
var app = require('express')();
// var cookieParser = require("cookie") 
var http = require('http').Server(app);
// var io = require('socket.io')(http, { cors: {
//   origin: "http://localhost:3000"
// }});
var xss = require("xss");
var io = require('socket.io')(http);
const axios = require('axios');

const jwt = require("jsonwebtoken");
const cookieParser = require('socket.io-cookie-parser');
 
io.use(cookieParser());

function  decode_token (socket, next,data)  {
 
  const token =  data && data.sid || socket.request.cookies['sid'] || socket.request.cookies['lid'];
  if (!token) {
    console.warn("!token");

    return socket.emit("redirect");
  }
  try {

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    socket.user = decoded;
    socket.user.u_id = decoded.uId;
    socket.user.sid = token;
  } catch (err) {
    console.error(err);

    return socket.emit("redirect");

  }
 
  if( next){
    return next();
  }

}

var port = process.env.PORT || 8000;
 
var u_s = {};  // userid to socketid
var s_u = {};  // socketid to userid
var user_connected_to_uid = {}; // user id  to session data
/*
user_connected_to_uid.f_list: store userid of friends which are currently chatting with this user
user_connected_to_uid.offer : sdp of this user
*/
 
function intialize_empty_user_session() { 
  return {
    f_list: [],
    offer: null,
    on_call: false,
    user_data: null,
    caller_u_id: null, // user_id of caller 
  };
}

// Event 'uncaughtException'
process.on('uncaughtException', (error) => {
  // fs.writeSync(process.stderr.fd, error);
  console.error( "******error*******");
  console.error(error);
});

app.get('/', (req, res) => {
  res.status(200).json({message:"Connected Successfully 1"});

});

io.on('connection', function (socket) {

  socket.on("user-connected", async (data) => {

    try {

      decode_token( socket , null, data);
  
      let cookie =  socket.user;
      
      if( !cookie){ 
        socket.emit("redirect"); 
      }

      //if user already added 
      if (u_s[cookie.u_id]) {

        delete s_u[u_s[cookie.u_id]];

      }
      
      s_u[socket.id] = cookie.u_id;
      u_s[cookie.u_id] = socket.id;
      if (user_connected_to_uid[cookie.u_id]) {
        
        let f_list = user_connected_to_uid[cookie.u_id].f_list;
        for (let i = 0; i < f_list.length; i++) {
          socket.broadcast.to(u_s[f_list[i]]).emit('friend-status', { id: cookie.u_id, current_status: "online" });
        }

      }
      else {
        user_connected_to_uid[cookie.u_id] = intialize_empty_user_session();
      }

      user_connected_to_uid[cookie.u_id].user_data = cookie;
      // socket.emit("setid", { id: cookie.u_id });
      socket.emit("connection-sucess", { id: cookie.u_id });
    
    }
    catch (err) {
      console.error(err);
    }

  });

  socket.on('typing', async (data) => {
    data.u_id = socket.user.uId ; 
    socket.broadcast.to(u_s[data.curr_f_id]).emit('typing', data);
 
  });

  socket.on('not-typing', async (data) => {
    data.u_id = socket.user.uId ; 
    socket.broadcast.to(u_s[data.curr_f_id]).emit('not-typing', data);

  });

  //add the client to his friend u_id list 
  socket.on('connected-to', async (data) => {

    //removed the client from his previosu friend  u_id list 
    if (data.prev_f_id && user_connected_to_uid[data.prev_f_id]) {
      let index = user_connected_to_uid[data.prev_f_id].f_list.indexOf(data.u_id);
      if (index != -1) {
        user_connected_to_uid[data.prev_f_id].f_list.splice(index, 1);
      }

    }
    //add the client in his current friend u_id list 
    if (user_connected_to_uid[data.curr_f_id]) {
      user_connected_to_uid[data.curr_f_id].f_list.push(data.u_id);
    } else {
      // user_connected_to_uid[data.curr_f_id] = { f_list:[data.u_id]}; 
    }

  });

  socket.on('send-message', async (data) => {
  
    let f_s_id = u_s[data.curr_f_id];
    data.friend_u_id = data.curr_f_id;
    // data.u_id = data.user_id;
    let  messageData =  {
      "receiver": {
        "uId": data.curr_f_id ,
        // "currentStatus": "offline"
      },
      "message": xss( data.message) || " ",
      "messageType": data.messageType || "text", 
      result: true , 
      
    };
    /* if file then add file details */
    if(  data.messageType == "file" ){
      messageData.fileName= data.fileName; 
      messageData.mimeType= data.mimeType; 
    }
    
    //if user is online emit rec-message and save to database 
 
    if (u_s[data.curr_f_id]) { 
      // emit message directly to friend if he is online 
      data.createdBy = "friend"; 
      data.user_id  =  socket.user.uId ; // user_id of user who sended this message
      socket.broadcast.to(f_s_id).emit('rec-message', data);
      messageData.receiver.currentStatus = "online"; 

    } else {
      messageData.receiver.currentStatus = "offline"; 
     
    }

    try{ 

      await axios({
        method: 'post',
        url: process.env.API_URL + "/save_message",
        data: (messageData),
        headers: {
          "Content-type": "application/json",
          "x-access-token": socket.user.sid
        },  
      });   

    }
    catch (err){ 
 
      console.error( err.response && err.response.data ?err.response.data :err  )  ; 
    }

  });

  socket.on('sent-file', async (data) => {
    // pr("sendign file  to ",data);
    let f_s_id = u_s[data.curr_f_id];
    data.friend_u_id = data.curr_f_id;
    data.u_id = data.user_id;

    let url;

    if (u_s[data.curr_f_id]) {

      socket.broadcast.to(f_s_id).emit('rec-message', data);
      url = "/save_readed_file";

    } else {
      url = "/save_unreaded_file";
    }

    axios({
      method: 'post',
      url: process.env.API_URL + url,
      data: data
    }).then(function ( ) {
   
    }).catch(err => {
      // console.log("error is: ");
      console.error(err.message);
    });

  });

  socket.on("store_candidate", (candidate) => {

    socket.broadcast.emit("candidate", candidate);
  });

  socket.on("store_offer", async (data) => {
    try {
     
      let cookie = socket.user ; 

      if (user_connected_to_uid[cookie.u_id]) {

        if (user_connected_to_uid[data.f_id]) {
        
          user_connected_to_uid[cookie.u_id].offer = data.offer;
          let user_data = user_connected_to_uid[cookie.u_id].user_data;
          // let friend_data = user_connected_to_uid[data.f_id].user_data;

          let output_data = { name: user_data.name, f_id: cookie.u_id, profileImg: user_data.profileImg };
          socket.broadcast.to(u_s[data.f_id]).emit('calling', output_data);
          user_connected_to_uid[cookie.u_id].caller_u_id = data.f_id; // store friend id into self data
          user_connected_to_uid[data.f_id].caller_u_id = cookie.u_id; // store calling id to friend data 
        
        }
        else {
          socket.emit("friend-is-offlinein sotre offer");
        }

      }
      else {
        socket.emit("redirect");
      }

    } catch (err) {
      console.error(err);
    }

  });

  socket.on("send_answer", async (data) => {
 
    socket.broadcast.emit("answer", data);
   
  });

  // eslint-disable-next-line no-unused-vars
  socket.on("end-call", async (data) => {
 
    try {
      let cookie = socket.user ; 
      if (user_connected_to_uid[cookie.u_id]) {
        let user_data = user_connected_to_uid[cookie.u_id];
        let friend_data = user_connected_to_uid[user_data.caller_u_id];
        let friend_socket_id = u_s[user_data.caller_u_id];
 
        socket.to(friend_socket_id).emit("call-ended");
        // reset session  call data  of self and friend
        user_data.offer = null;
        user_data.on_call = false;
        user_data.caller_u_id = null;

        friend_data.offer = null;
        friend_data.on_call = false;
        friend_data.caller_u_id = null;
      }
    }
    catch (err) {
      console.error(err);
    }
    // infrom  other user  that call is ended 

    // socket.to( socket.id ).emit("take_offer", my_offer);
    // socket.emit("answer", data);
  });
  // eslint-disable-next-line no-unused-vars
  socket.on("call-decline", async (data) => {
 
    try {
      let cookie = socket.user;
     
      if (user_connected_to_uid[cookie.u_id]) {
        let user_data = user_connected_to_uid[cookie.u_id];
        let friend_data = user_connected_to_uid[user_data.caller_u_id];
        let friend_socket_id = u_s[user_data.caller_u_id];

        socket.to(friend_socket_id).emit("call-decline");
        // reset session  call data  of self and friend

        friend_data.offer = null;
        friend_data.on_call = false;
        friend_data.caller_u_id = null;
      }
    }
    catch (err) {
      console.error(err);
    }
  
  });

  socket.on("send_candidate", async (data) => {
 
    socket.broadcast.emit("candidate", data);
  });
  // eslint-disable-next-line no-unused-vars
  socket.on("join_call", async (data) => {

    try {
      let cookie = socket.user;

      if (user_connected_to_uid[cookie.u_id]) {
        let user_data = user_connected_to_uid[cookie.u_id];
        let friend_data = user_connected_to_uid[user_data.caller_u_id];

        socket.emit("take_offer", friend_data.offer);
      }
      else {
        socket.emit("redirect");
      }
    }

    catch (err) {
      console.error(err);
    }

  });

  socket.on('user-disconnect', async (data) => {
 
    try {

      let cookie = data;
      let curr_f_id = cookie.curr_f_id;
      let u_id = s_u[socket.id];
      let send_data = { u_id: u_id, time: cookie.time, date: cookie.date };
      
      //remove the client to his connected list 
      if (curr_f_id && user_connected_to_uid[curr_f_id]) {
        let index = user_connected_to_uid[curr_f_id].f_list.indexOf(u_id);
        if (index != -1) {
          // pr("**removing at index ",index); 
          user_connected_to_uid[curr_f_id].f_list.splice(index, 1);
        }

      }

      // delete socket_to_detail[socket.id];
      // 
      // delete u_id_to_detail[cookie.u_id];

      if (user_connected_to_uid[u_id]) {
        let f_list = user_connected_to_uid[u_id].f_list;
        for (let i = 0; i < f_list.length; i++) {
          socket.broadcast.to(u_s[f_list[i]]).emit('friend-status', { id: u_id, current_status: "Last seen on " + (cookie.date) + " at " + (cookie.time) });
        }
      }
      delete u_s[u_id];
      delete s_u[socket.id];
      delete user_connected_to_uid[u_id];
 
      //update  user as offline 
 
      axios({
        method: 'post',
        url: process.env.API_URL + "/offline_user",
        data: send_data
      }).then(function ( ) {

      }).catch(err => { 
        console.error(err.message);
      });
     
    } catch (err) {
      console.error(err);
    }
  });

});

http.listen(port, function () {
  // eslint-disable-next-line no-console
  console.log('listening on *:' + port);
});

// function isFriend(friend_u_id, friend_list) {

//   try{
//     for (let i = 0; i < friend_list.length; i++) {
//       if (friend_list[i].sender_p_id == friend_u_id) {
//         return true;
//       }
//     }
//     return false;
//   }catch(err){ 
//     return false;
//   }

// }

// // sending to sender-client only
// socket.emit('message', "this is a test");

// // sending to all clients, include sender
// io.emit('message', "this is a test");

// // sending to all clients except sender
// socket.broadcast.emit('message', "this is a test");

// // sending to all clients in 'game' room(channel) except sender
// socket.broadcast.to('game').emit('message', 'nice game');

// // sending to all clients in 'game' room(channel), include sender
// io.in('game').emit('message', 'cool game');

// // sending to sender client, only if they are in 'game' room(channel)
// socket.to('game').emit('message', 'enjoy the game');

// // sending to all clients in namespace 'myNamespace', include sender
// io.of('myNamespace').emit('message', 'gg');

// // sending to individual socketid
// socket.broadcast.to(socketid).emit('message', 'for your eyes only');

// socket.join('some-unique-room-name'); // Do this for both users you want to chat with each other
// socket.broadcast.to('the-unique-room-name').emit('message', 'blah'); // Send a message to the chat room.