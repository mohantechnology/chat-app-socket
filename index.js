require('dotenv').config();
var app = require('express')();
// var cookieParser = require("cookie") 
var http = require('http').Server(app);
var io = require('socket.io')(http);
const axios = require('axios');
const { createSocket } = require('dgram');
const jwt = require("jsonwebtoken");
const cookieParser = require('socket.io-cookie-parser');
// var cookie = require('cookie')




var cors = require('cors')
app.use(cors())
io.use(cookieParser());
 

var port = process.env.PORT || 8000;

 let my_offer ;

var u_s = {};  // userid to socketid
var s_u = {};  // socketid to userid
var user_connected_to_uid = {}; // user id  to session data
/*
user_connected_to_uid.f_list: store userid of friends which are currently chatting with this user
user_connected_to_uid.offer : sdp of this user
*/

function print_session_data(){
  
  console.log( "u_s" )
  console.log( u_s )
  console.log( "s_u" )
  console.log( s_u )
  console.log( "user_connected_to_uid" )
  console.log( user_connected_to_uid )
}


function intialize_empty_user_session ( ){  
  return { 
    f_list: [], 
    offer : null, 
    on_call : false, 
    user_data: null, 
  }
}

io.on('connection', function (socket) {
  console.log(" -- initial new user connecte\n");
  // let parsed_cookie = cookie.parse(socket.handshake.headers.cookie);    
  // console.log( parsed_cookie)
  let cookie = jwt.decode(socket.request.cookies['li']);
  console.log("cookei data is "); 
  console.log(cookie);
  print_session_data() 
socket.on("user-connected",(data)=>{


  let cookie = jwt.decode(data.li );


console.log( process.env.API_URL + "/check_user_details")

  axios({
    method: 'post',
    url: process.env.API_URL + "/check_user_details",
    data: cookie
  }).then(function (response) {
    console.log("resipo: id  ", socket.id , "response data = ");
    console.log(response.data);
    console.log("<--end of response data)"); 


 
    if (response.data.status == "ok") {

      //if user already added 
      if(u_s[cookie.u_id]){
   
        delete s_u[ u_s[cookie.u_id]]; 

      }
      console.log("response.data.user_data.friend_list" )
      console.log(response.data.user_data.friend_list )
      s_u[socket.id] = cookie.u_id;
      u_s[cookie.u_id] = socket.id ;
      if (user_connected_to_uid[cookie.u_id]) {
      
        let f_list = user_connected_to_uid[cookie.u_id].f_list;
        for (let i = 0; i < f_list.length; i++) {
          socket.broadcast.to(u_s[f_list[i]]).emit('friend-status',{id:cookie.u_id, current_status:"online"});
          }

      }
      else{ 
        user_connected_to_uid[cookie.u_id] = intialize_empty_user_session( )
      }
      
      user_connected_to_uid[cookie.u_id].user_data = response.data.user_data; 
      socket.emit("setid",{id:cookie.u_id});
  // pr("connected andd added to all "); 
  // pr( "----------------u_s",u_s); 
  // pr("s_u",s_u,"friend list ",user_connected_to_uid); 



    } else { 
      // socket.emit("redirect"); 
    }
  }).catch(err => {
    console.log("error is: ");
    console.log(err.message);
  });


})



  socket.on('typing', (data) => {
    socket.broadcast.to(u_s[data.curr_f_id]).emit('typing',data);

  }); 

  socket.on('not-typing', (data) => {

     socket.broadcast.to(u_s[data.curr_f_id]).emit('not-typing',data);


   }); 
 


//add the client to his friend u_id list 
  socket.on('connected-to', (data) => {
 
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
      // user_connected_to_uid[data.curr_f_id] = { f_list:[data.u_id]}; 
    }

 
   
  });
  


  socket.on('send-message', (data) => { 
    let f_s_id=    u_s[data.curr_f_id]; 
    data.friend_u_id = data.curr_f_id; 
  data.u_id = data.user_id; 

    let url ; 
    // pr("fs_did" ,f_s_id,"uerid to detail ", u_id_to_detail[ f_s_id])
    //if user is online emit rec-message and save to database 
    print_session_data()
    if( u_s[ data.curr_f_id] ){
      // data.is_readed=true;
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
    
    // if (response.data.status == "ok") {
    //     pr("saved the message to url = ",url,data); 
    // }else{
    //   pr(" NOt abele to saved the message to url = ",url,data); 
    // }
   
  }).catch(err => {
    
  });

    

     
  });






  socket.on('sent-file', (data) => {
    // pr("sendign file  to ",data);
    let f_s_id=    u_s[data.curr_f_id]; 
    data.friend_u_id = data.curr_f_id; 
  data.u_id = data.user_id; 
 
    let url ; 
 
    if( u_s[ data.curr_f_id] ){
   
      socket.broadcast.to(f_s_id).emit('rec-message', data);
       url = "/save_readed_file"; 
       
    }else{
        url = "/save_unreaded_file"; 
    }
    
  axios({
    method: 'post',
    url: process.env.API_URL + url,
    data:data
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
    console.log( "store_candidate"); 
    // console.log( candidate); 
    socket.broadcast.emit("candidate", candidate)
});

socket.on("store_offer", (data) => {
    console.log( "store_offer"); 
    // console.log( data); 
    // my_offer = data ; 
    print_session_data()
      let cookie = jwt.decode(data.li );
      console.log( cookie); 
      my_offer = data.offer ; 
  
      if( user_connected_to_uid[ cookie.u_id] ){ 

       
       
         if( user_connected_to_uid[data.f_id ]){ 
          console.log( "user_connected_to_uid[ cookie.u_id]" )
          console.log( user_connected_to_uid[ cookie.u_id] )    
          user_connected_to_uid[ cookie.u_id].offer = data.offer ; 
          let user_data =    user_connected_to_uid[ cookie.u_id].user_data;  
          let friend_data =  user_connected_to_uid[ data.f_id].user_data
          if( isFriend(friend_data.p_id , user_data.friend_list )== false){
            socket.emit("not-friend"); 
             return ; 
           }
           
           let output_data = { name: user_data.name,  f_id: cookie.u_id , profile_img:user_data.profile_img}
           socket.broadcast.to(u_s[data.f_id ]).emit('calling',output_data ); 
         }
         else{ 
          socket.emit("friend-is-offline"); 
         }
         
      }
      else{ 
        socket.emit("redirect"); 
      }
    console.log("user_connected_to_uid[cookie.u_id]")
    console.log(user_connected_to_uid[cookie.u_id])
    console.log("user_connected_to_uid[data.f_id] , data.f_id]= " +data.f_id)
    console.log(user_connected_to_uid[data.f_id])
      // if (user_connected_to_uid[cookie.u_id]) {
      
      //   let f_list = user_connected_to_uid[cookie.u_id].f_list;
      //   for (let i = 0; i < f_list.length; i++) {
      //     socket.broadcast.to(u_s[f_list[i]]).emit('friend-status',{id:cookie.u_id, current_status:"online"});
      //     }

      // }
    
});

socket.on("send_answer", (data) => {
    console.log( "send_answer"); 
    // console.log( data); 
    socket.broadcast.emit("answer", data)
    // socket.emit("answer", data);
});

socket.on("end-call", (data) => {
  console.log( "end-call"); 
  // console.log( data); 
  // socket.broadcast.emit("answer", data)
  // socket.emit("answer", data);
});

socket.on("send_candidate", (data) => {
    console.log( "send_candidate"); 
    // console.log( data); 
    // socket.emit("candidate", data);
    socket.broadcast.emit("candidate", data);
});

socket.on("join_call", (data) => {
    console.log( "join_call"); 
    // console.log( data); 
    console.log( socket.id ) ; 
    // socket.to( socket.id ).emit("take_offer", my_offer);
    socket.emit("take_offer", my_offer);
});



  socket.on('user-disconnect', (data) => {
    console.log( "user-disconnect")
    console.log( "socket.id")
    console.log( socket.id);
       let cookie =  data;  
    let curr_f_id = cookie.curr_f_id; 
    let u_id = s_u[socket.id]; 
    let send_data = {u_id:u_id,time:cookie.time,date:cookie.date}
      // pr("coikie<idsoconnected> is data ",cookie,"u_Id ",u_id); 
    //remove the client to his connected list 
    if(curr_f_id && user_connected_to_uid[curr_f_id]){
      let index = user_connected_to_uid[curr_f_id].f_list.indexOf(u_id); 
      if(index!=-1){
        // pr("**removing at index ",index); 
        user_connected_to_uid[curr_f_id].f_list.splice(index,1); 
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
        socket.broadcast.to(u_s[f_list[i]]).emit('friend-status',{id:u_id, current_status:"Last seen on "+(cookie.date)+" at "+(cookie.time)});
      }
    }
    delete u_s[u_id]; 
    delete s_u[socket.id];
    delete user_connected_to_uid[u_id] ; 
    // print_session_data()
//update  user as offline 
// pr("curent cookie si: ",cookie) ; 
    axios({
      method: 'post',
      url: process.env.API_URL + "/offline_user",
      data:send_data
    }).then(function (response) {
       
     
    }).catch(err => {
      // console.log("error is: ");
      // console.log(err.message);
    });
    // pr( "---disconnected--------u_s",u_s); 
    // pr("s_u",s_u,"friend list ",user_connected_to_uid); 

  });


});

http.listen(port, function () {
  console.log('listening on *:' + port);
});



function isFriend(friend_u_id, friend_list ) { 

  for( let i=0; i< friend_list.length ; i++){ 
    if( friend_list[i].sender_p_id == friend_u_id ){
      return true; 
    }
  }
  return false; 

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