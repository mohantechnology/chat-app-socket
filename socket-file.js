// const io = require('socket.io')( process.env.PORT || 8000); 



// const user = {}; 

// io.on('connection',(socket)=>{







  var app = require('express')();
  var http = require('http').Server(app);
  var io = require('socket.io')(http);
  // var port = process.env.PORT || 3000;
  var port = process.env.PORT || 8000;
  
  app.get('/client.js', function (req, res) {
    res.sendFile(__dirname + '/client.js');
    // res.send("dkfjk"); 
  });
  
  app.get('/index.html', function (req, res) {
    res.sendFile(__dirname + '/index.html');
  });
  
  let user = {};
  let user_array= [];  
  io.on('connection', function (socket) {
  console.log(" -- initial new user connecte"); 



  socket.on('new-user-connected',(data)=>{
    console.log("new user connected " + data.name); 
    socket.broadcast.emit("new-user-connected" ,data.name); 
    user[socket.id] = data.name; 
}); 


socket.on('message-sent',(data)=>{

  socket.broadcast.emit("message-recived" ,data); 
  
}); 

socket.on('send-specific-client',(data)=>{
  
 console.log( Object.keys(user)); 
  io.to(Object.keys(user)[0]).emit('recieved-pecific-client'," your are the only one who recied message "); 
});


  socket.on('disconnect', () => {
    console.log('user-disconnected');
    socket.broadcast.emit("user-disconnected" ,user[socket.id] )
    delete    user[socket.id] ; 

  });
}); 


http.listen(port, function () {
  console.log('listening on *:' + port);
});



// function str_match(text, patt){

//   let i,j,last,patt_sum,str_sum,total_sum , result;
//    let len1,len2; 


// let str = text.toLowerCase();
//    patt = patt.toLowerCase(); 
//    len1= patt.length(); 
//    len2=str.length(); 
//   if(len1 > len2 ){
//     return text;
//   }


//    patt_sum=str_sum=0; 
//    total_sum= power(128,len1)
//    var str = "HELLO WORLD";
//    var n = str.charCodeAt(str.length-1);


//    for(i=0; i<len1; i++) 
//     {
//       patt_sum += (patt_sum + patt[i]) *128; 
//     }
//     console.log("patterns um is: "+ patt_sum); 
//      console.log( " pwoer of 128  : " , total_sum); 

//      for(i=0; i<len1; i++ ){
//       str_sum += (str_sum + str[i])
//      }
// }