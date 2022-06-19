require('dotenv').config();
var app = require('express')();
// var cookieParser = require("cookie") 
var http = require('http').Server(app);
// var io = require('socket.io')(http, { cors: {
//   origin: "http://localhost:3000"
// }});
var io = require('socket.io')(http);
const axios = require('axios');
const { createSocket } = require('dgram');
const jwt = require("jsonwebtoken");
const cookieParser = require('socket.io-cookie-parser');
// var cookie = require('cookie')




var cors = require('cors');
const { fstat } = require('fs');
const { json } = require('express');
// app.use(cors())
io.use(cookieParser());


io.use((socket, next) => {

  console.log(  "socket.request.cookies['sid']")
  console.log(  socket.request.cookies)
  // console.log(  socket.user)
  // return next();
  console.log("inside middleware********")
  // next(new Error("redirect"));
  const token = socket.request.cookies['sid'] || socket.request.cookies['lid'];
  if (!token) {
    console.log("!token")

    return socket.emit("redirect");
  }
  try {

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    socket.user = decoded;
    socket.user.u_id = decoded.uId;
    socket.user.sid = token;
  } catch (err) {
    console.log(err)
  
    return socket.emit("redirect");

  }
  console.log("moving to next")
  return next();

})

var port = process.env.PORT || 8000;

let my_offer;

var u_s = {};  // userid to socketid
var s_u = {};  // socketid to userid
var user_connected_to_uid = {}; // user id  to session data
/*
user_connected_to_uid.f_list: store userid of friends which are currently chatting with this user
user_connected_to_uid.offer : sdp of this user
*/

function print_session_data() {

  console.log("u_s")
  console.log(u_s)
  console.log("s_u")
  console.log(s_u)
  console.log("user_connected_to_uid")
  console.log(user_connected_to_uid)
}


function intialize_empty_user_session() {
  console.log("intialize_empty_user_session************")
  return {
    f_list: [],
    offer: null,
    on_call: false,
    user_data: null,
    caller_u_id: null, // user_id of caller 
  }
}

// Event 'uncaughtException'
process.on('uncaughtException', (error) => {
  // fs.writeSync(process.stderr.fd, error);
  console.log( "******error*******")
  console.log(error)
});

app.get('/', (req, res) => {
 res.status(200).json({message:"Connected Successfully"})

})
 

io.on('connection', function (socket) {
  console.log(" -- initial new user connecte\n");
  // let parsed_cookie = cookie.parse(socket.handshake.headers.cookie);    
  // console.log( parsed_cookie)
  let cookie = jwt.decode(socket.request.cookies['li']);
  // console.log("cookei data is "); 
  // console.log(cookie);
  // print_session_data() 

  socket.on("user-connected", async (data) => {

    try {
      console.log("data");
      console.log (data);
 
      console.log("socket.user");
      console.log(socket.user);

      // let cookie =  jwt.verify(data.sid, process.env.JWT_SECRET_KEY) ;
      let cookie =  socket.user;
      
      console.log("cookie");
      console.log(cookie);
      if( !cookie){ 
        socket.emit("redirect"); 
      }
  

     

        //if user already added 
        if (u_s[cookie.u_id]) {

          delete s_u[u_s[cookie.u_id]];

        }
        // console.log("response.data.user_data.friend_list" )
        // console.log(response.data.user_data.friend_list )
        s_u[socket.id] = cookie.u_id;
        u_s[cookie.u_id] = socket.id;
        if (user_connected_to_uid[cookie.u_id]) {
        
          let f_list = user_connected_to_uid[cookie.u_id].f_list;
          for (let i = 0; i < f_list.length; i++) {
            socket.broadcast.to(u_s[f_list[i]]).emit('friend-status', { id: cookie.u_id, current_status: "online" });
          }

        }
        else {
          user_connected_to_uid[cookie.u_id] = intialize_empty_user_session()
        }

        user_connected_to_uid[cookie.u_id].user_data = cookie;
        // socket.emit("setid", { id: cookie.u_id });
        socket.emit("connection-sucess", { id: cookie.u_id });
        
        console.log("connected andd added to all "); 
        print_session_data();
        // pr("connected andd added to all "); 
        // pr( "----------------u_s",u_s); 
        // pr("s_u",s_u,"friend list ",user_connected_to_uid); 
 
 

      return ; 
      // axios({
      //   method: 'post',
      //   url: process.env.API_URL + "/check_user_details",
      //   data: cookie
      // }).then(function (response) {
      //   // console.log("resipo: id  ", socket.id , "response data = ");
      //   // console.log(response.data);
      //   // console.log("<--end of response data)"); 



      //   if (response.data.status == "ok") {

      //     //if user already added 
      //     if (u_s[cookie.u_id]) {

      //       delete s_u[u_s[cookie.u_id]];

      //     }
      //     // console.log("response.data.user_data.friend_list" )
      //     // console.log(response.data.user_data.friend_list )
      //     s_u[socket.id] = cookie.u_id;
      //     u_s[cookie.u_id] = socket.id;
      //     if (user_connected_to_uid[cookie.u_id]) {
            

      //       let f_list = user_connected_to_uid[cookie.u_id].f_list;
      //       for (let i = 0; i < f_list.length; i++) {
      //         socket.broadcast.to(u_s[f_list[i]]).emit('friend-status', { id: cookie.u_id, current_status: "online" });
      //       }

      //     }
      //     else {
      //       user_connected_to_uid[cookie.u_id] = intialize_empty_user_session()
      //     }

      //     user_connected_to_uid[cookie.u_id].user_data = response.data.user_data;
      //     socket.emit("setid", { id: cookie.u_id });
      //     // pr("connected andd added to all "); 
      //     // pr( "----------------u_s",u_s); 
      //     // pr("s_u",s_u,"friend list ",user_connected_to_uid); 



      //   } else {
      //     // socket.emit("redirect"); 
      //   }
      // }).catch(err => {
      //   console.log("error is: ");
      //   console.log(err.message);
      // });
    }
    catch (err) {
      console.log(err);
    }

  })



  socket.on('typing', async (data) => {
    socket.broadcast.to(u_s[data.curr_f_id]).emit('typing', data);
   print_session_data(); 
   console.log( "socket.user")
   console.log( socket.user)
  });

  socket.on('not-typing', async (data) => {

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
      user_connected_to_uid[data.curr_f_id].f_list.push(data.u_id)
    } else {
      // user_connected_to_uid[data.curr_f_id] = { f_list:[data.u_id]}; 
    }



  });



  socket.on('send-message', async (data) => {
    console.log( "data") ;
    console.log( data) ;
    let f_s_id = u_s[data.curr_f_id];
    data.friend_u_id = data.curr_f_id;
    // data.u_id = data.user_id;
    let  messageData =  {
      "receiver": {
          "uId": data.curr_f_id ,
          // "currentStatus": "offline"
      },
      "message": data.message || " ",
      "messageType": data.messageType || "text", 
       result: true , 
      
  }
  /* if file then add file details */
  if(  data.messageType == "file" ){
    messageData.fileName= data.fileName; 
    messageData.mimeType= data.mimeType; 
  }

    console.log( "messageData") ;
    console.log( messageData) ;

    console.log( " s_u[socket.id] ") ;
    console.log(  s_u[socket.id] ) ;

       console.log( " s_u[socket.id] ") ;
    console.log(  s_u[socket.id] ) ;

             console.log( " user_connected_to_uid  ") ;
    console.log(  user_connected_to_uid  ) ;

    console.log( " socket.user  ") ;
    console.log(  socket.user  ) ;


    console.log( " data  ") ;
    console.log(  data  ) ;


     // pr("fs_did" ,f_s_id,"uerid to detail ", u_id_to_detail[ f_s_id])
    //if user is online emit rec-message and save to database 
    // print_session_data()
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

    let response = await axios({
      method: 'post',
      url: process.env.API_URL + "/save_message",
      data: (messageData),
      headers: {
        "Content-type": "application/json",
        "x-access-token": socket.user.sid
      },  
     });   
     console.log( "response") 
     console.log( response.data) 

  }
  catch (err){ 
    console.log( "error*****")  ;; 
    console.log( err.response && err.response.data ?err.response.data :err  )  ;; 
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
    }).then(function (response) {

      // if (response.data.status == "ok") {
      //     pr("saved the message to url = ",url,data); 
      // }else{
      //   pr(" NOt abele to saved the rrmessage to url = ",url,data); 
      // }

    }).catch(err => {
      // console.log("error is: ");
      // console.log(err.message);
    });




  });





  socket.on("store_candidate", (candidate) => {
    console.log("store_candidate");
    // console.log( candidate); 
    socket.broadcast.emit("candidate", candidate)
  });

  socket.on("store_offer", async (data) => {
    try {
      console.log("store_offer");
      // console.log( data); 
      // my_offer = data ; 
      print_session_data()
      let cookie = socket.user ; 
      console.log(cookie);
      // my_offer = data.offer ; 

      if (user_connected_to_uid[cookie.u_id]) {



        if (user_connected_to_uid[data.f_id]) {
          console.log("user_connected_to_uid[ cookie.u_id]")
          console.log(user_connected_to_uid[cookie.u_id])
          user_connected_to_uid[cookie.u_id].offer = data.offer;
          let user_data = user_connected_to_uid[cookie.u_id].user_data;
          let friend_data = user_connected_to_uid[data.f_id].user_data
          // if (isFriend(friend_data.p_id, user_data.friend_list) == false) {
          //   socket.emit("not-friend");
          //   return;
          // }

          let output_data = { name: user_data.name, f_id: cookie.u_id, profileImg: user_data.profileImg }
          socket.broadcast.to(u_s[data.f_id]).emit('calling', output_data);
          user_connected_to_uid[cookie.u_id].caller_u_id = data.f_id; // store friend id into self data
          user_connected_to_uid[data.f_id].caller_u_id = cookie.u_id; // store calling id to friend data 
          console.log("stored frined uid ")
          print_session_data()
        }
        else {
          socket.emit("friend-is-offlinein sotre offer");
        }

      }
      else {
        socket.emit("redirect");
      }


    } catch (err) {
      console.log(err);
    }

  });

  socket.on("send_answer", async (data) => {
    console.log("send_answer");
    console.log( data); 
    socket.broadcast.emit("answer", data)
    // socket.emit("answer", data);
  });

  socket.on("end-call", async (data) => {
    console.log("end-call");
    console.log (data);
    try {
      let cookie = socket.user ;
      console.log(cookie);
      if (user_connected_to_uid[cookie.u_id]) {
        let user_data = user_connected_to_uid[cookie.u_id];
        let friend_data = user_connected_to_uid[user_data.caller_u_id]
        let friend_socket_id = u_s[user_data.caller_u_id];
        console.log(user_data);
        console.log("friend_socket_id");
        console.log(friend_socket_id);
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
      console.log(err);
    }
    // infrom  other user  that call is ended 


    // socket.to( socket.id ).emit("take_offer", my_offer);
    // socket.emit("answer", data);
  });

  socket.on("call-decline", async (data) => {
    console.log("call-decline");
    console.log (data);
    try {
      let cookie = socket.user;
      console.log(cookie);
      if (user_connected_to_uid[cookie.u_id]) {
        let user_data = user_connected_to_uid[cookie.u_id];
        let friend_data = user_connected_to_uid[user_data.caller_u_id]
        let friend_socket_id = u_s[user_data.caller_u_id];

        socket.to(friend_socket_id).emit("call-decline");
        // reset session  call data  of self and friend

        friend_data.offer = null;
        friend_data.on_call = false;
        friend_data.caller_u_id = null;
      }
    }
    catch (err) {
      console.log(err);
    }
    // infrom  other user  that call is ended 


    // socket.to( socket.id ).emit("take_offer", my_offer);
    // socket.emit("answer", data);
  });

  socket.on("send_candidate", async (data) => {
    console.log("send_candidate");
    // console.log( data); 
    // socket.emit("candidate", data);
    socket.broadcast.emit("candidate", data);
  });

  socket.on("join_call", async (data) => {
    console.log("join_call");
    // console.log( data); 
    // print_session_data();
    // console.log(socket.id);
    // console.log("user_connected_to_uid[ cookie.u_id]")
    // console.log(user_connected_to_uid[cookie.u_id])

    // socket.to( socket.id ).emit("take_offer", my_offer);
    let offer;

    try {
      let cookie = socket.user;
      console.log( "cookie ")
      console.log( cookie )
      console.log( "data ")
      console.log( data )

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
      console.log(err)
    }



  });



  socket.on('user-disconnect', async (data) => {
    console.log("user-disconnect")
    console.log("socket.id")
    console.log(socket.id);
    try {


      let cookie = data;
      let curr_f_id = cookie.curr_f_id;
      let u_id = s_u[socket.id];
      let send_data = { u_id: u_id, time: cookie.time, date: cookie.date }
      // pr("coikie<idsoconnected> is data ",cookie,"u_Id ",u_id); 
      //remove the client to his connected list 
      if (curr_f_id && user_connected_to_uid[curr_f_id]) {
        let index = user_connected_to_uid[curr_f_id].f_list.indexOf(u_id);
        if (index != -1) {
          // pr("**removing at index ",index); 
          user_connected_to_uid[curr_f_id].f_list.splice(index, 1);
        }

      }

      // let a = []; 
      // a.

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
      // print_session_data()
      //update  user as offline 
      // pr("curent cookie si: ",cookie) ; 
      axios({
        method: 'post',
        url: process.env.API_URL + "/offline_user",
        data: send_data
      }).then(function (response) {


      }).catch(err => {
        // console.log("error is: ");
        // console.log(err.message);
      });
      // pr( "---disconnected--------u_s",u_s); 
      // pr("s_u",s_u,"friend list ",user_connected_to_uid); 
    } catch (err) {
      console.log(err);
    }
  });


});

http.listen(port, function () {
  console.log('listening on *:' + port);
});



function isFriend(friend_u_id, friend_list) {

  try{
     for (let i = 0; i < friend_list.length; i++) {
    if (friend_list[i].sender_p_id == friend_u_id) {
      return true;
    }
  }
  return false;
}catch(err){ 
  return false;
}
 

}



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