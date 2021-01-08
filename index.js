require('dotenv').config();
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
const axios = require('axios');
const { createSocket } = require('dgram');
const jwt = require("jsonwebtoken");
const cookieParser = require('socket.io-cookie-parser');




function pr(r1, r2, r3, r4) {

  if (r1) {
      console.log(r1)
  }

  if (r2) {
      console.log(r2)
  }
  if (r3) {
      console.log(r3)
  }
  if (r4) {
      console.log(r4)
  }
}





io.use(cookieParser());



var port = process.env.PORT || 8000;




//socket id to uniqe id and friend detail
// var socket_to_detail = {};

// var u_id_to_detail = {};

var u_s = {};
var s_u = {};
//user connected to this u_id 
var user_connected_to_uid = {};

io.on('connection', function (socket) {
  console.log(" -- initial new user connecte\n");
  let cookie = jwt.decode(socket.request.cookies['li']);
  console.log(cookie);

  axios({
    method: 'post',
    url: process.env.API_URL + "/check_user_details",
    data: cookie
  }).then(function (response) {
    console.log("resipo: id  ", socket.id);
    console.log(response.data);



    if (response.data.status == "ok") {

      //if user already added 
      if(u_s[cookie.u_id]){
        pr("upadated previos"); 

        delete s_u[ u_s[cookie.u_id]]; 

      }

      s_u[socket.id] = cookie.u_id;
      u_s[cookie.u_id] = socket.id ;
      if (user_connected_to_uid[cookie.u_id]) {
      
        let f_list = user_connected_to_uid[cookie.u_id].f_list;
        for (let i = 0; i < f_list.length; i++) {
          socket.broadcast.to(u_s[f_list[i]]).emit('friend-status',{id:cookie.u_id, current_status:"online"});
          }

      }
  
      socket.emit("setid",{id:cookie.u_id});
  pr("connected andd added to all "); 
  pr( "----------------u_s",u_s); 
  pr("s_u",s_u,"friend list ",user_connected_to_uid); 

    } else { socket.emit("redirect"); }
  }).catch(err => {
    console.log("error is: ");
    console.log(err.message);
  });



  socket.on('typing', (data) => {
   pr("typing .. ",data); 
    socket.broadcast.to(u_s[data.curr_f_id]).emit('typing',data);

  }); 

  socket.on('not-typing', (data) => {
    pr("NOt - -typing  ",data); 
     socket.broadcast.to(u_s[data.curr_f_id]).emit('not-typing',data);
 
   }); 
 
// socket.on("close",(data)=>{
//   socket.broadcast.emit("close",data); 
// })




//add the client to his friend u_id list 
  socket.on('connected-to', (data) => {
   

    pr("connected to dat ",data) ; 
 //removed the client from his previosu friend  u_id list 
 if(data.prev_f_id && user_connected_to_uid[data.prev_f_id]){
  let index = user_connected_to_uid[data.prev_f_id].f_list.indexOf(data.u_id); 
  if(index!=-1){
    user_connected_to_uid[data.prev_f_id].f_list.splice(index,1); 
  }

}
 //add the client in his current friend u_id list 
    if(user_connected_to_uid[data.curr_f_id]){
      user_connected_to_uid[data.curr_f_id].f_list.push(data.u_id)
    }else{
      user_connected_to_uid[data.curr_f_id] = { f_list:[data.u_id]}; 
    }

    pr("connetcted to and adding in friend list incomig ",data); 
    pr( "u_s",u_s); 
    pr("s_u",s_u,"friend list ",user_connected_to_uid); 
  
   
  });
  


  socket.on('send-message', (data) => {
    pr("sendign message to ",data);
    let f_s_id=    u_s[data.curr_f_id]; 
    data.friend_u_id = data.curr_f_id; 
  data.u_id = data.user_id; 
    // let send_data = {date:data.date,time:data.time,u_id:data.user_id, friend_u_id : f_s_id}

    let url ; 
    // pr("fs_did" ,f_s_id,"uerid to detail ", u_id_to_detail[ f_s_id])
    if( u_s[ data.curr_f_id] ){
   
      socket.broadcast.to(f_s_id).emit('rec-message', data);
       url = "/save_readed_message"; 
       
    }else{
        url = "/save_unreaded_message"; 
    }
    
  axios({
    method: 'post',
    url: process.env.API_URL + url,
    data:data
  }).then(function (response) {
    
    if (response.data.status == "ok") {
        pr("saved the message to url = ",url,data); 
    }else{
      pr(" NOt abele to saved the message to url = ",url,data); 
    }
   
  }).catch(err => {
    console.log("error is: ");
    console.log(err.message);
  });

    

     
  });














  socket.on('disconnect', (data) => {
       let cookie =   socket.request.cookies; 
    let curr_f_id = cookie.curr_f_id; 
    let u_id = s_u[socket.id]; 
    let send_data = {u_id:u_id,time:cookie.time,date:cookie.date}
      pr("coikie data ",cookie,"u_Id ",u_id); 
    //remove the client to his connected list 
    if(curr_f_id && user_connected_to_uid[curr_f_id]){
      let index = user_connected_to_uid[curr_f_id].f_list.indexOf(u_id); 
      if(index!=-1){
        pr("**removing at index ",index); 
        user_connected_to_uid[curr_f_id].f_list.splice(index,1); 
      }
    
    }

// let a = []; 
// a.

    // delete socket_to_detail[socket.id];
    // 
    // delete u_id_to_detail[cookie.u_id];
    delete u_s[u_id]; 
    delete s_u[socket.id];
    if (user_connected_to_uid[u_id]) {
      let f_list = user_connected_to_uid[u_id].f_list;
      for (let i = 0; i < f_list.length; i++) {
        socket.broadcast.to(u_s[f_list[i]]).emit('friend-status',{id:u_id, current_status:"Last seen on "+(cookie.date)+" at "+(cookie.time)});
      }
    }
  
//update  user as offline 
// pr("curent cookie si: ",cookie) ; 
    axios({
      method: 'post',
      url: process.env.API_URL + "/offline_user",
      data:send_data
    }).then(function (response) {
      
       console.log("cokies saved ",response.data); 
     
    }).catch(err => {
      console.log("error is: ");
      console.log(err.message);
    });
    pr( "---disconnected--------u_s",u_s); 
    pr("s_u",s_u,"friend list ",user_connected_to_uid); 

  });


});

http.listen(port, function () {
  console.log('listening on *:' + port);
});





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