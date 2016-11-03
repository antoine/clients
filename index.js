var express = require('express')
var app = express()
var bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({ extended: true }));

//TODO persists that 
var clients = [];

// respond with "hello world" when a GET request is made to the homepage
app.post('/greendrop/save', function (req, res) {
  console.log('saving data for '+req.body.client_name);
  clients.push({name:req.body.client_name});
  res.statusCode=302;
  res.setHeader('Location', '/');
  res.send('');
})

app.get('/greendrop/clients', function (req,res) {
  //res.send([ {name:'antoine'}, {name:'cristina'}]);
  res.send(clients);
})

app.listen(3000, function () {
  console.log('Example app listening on port 3000!')
})
