const express = require('express')
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('lists_rundop.sqlite');
const app = express()
const bodyParser = require('body-parser');
const config = require ('./config');
const csv = require ('csv');
const fs= require('fs');

app.use(bodyParser.urlencoded({ extended: true }));

var seedUuid = new Date().getTime();

isArray = function(a) {
    return (!!a) && (a.constructor === Array);
};

function logNonConstraintError(err) {
  if (err.code != 'SQLITE_CONSTRAINT') {
    console.log(err);
  }
}

// respond with "hello world" when a GET request is made to the homepage
app.post('/greendrop/save', function (req, res) {

  var worksheet = {};
  var clientName = req.body.client_name;
  if (!clientName.trim()) {
  res.statusCode=500;
  res.send('empty client name, cannot save hours');
  } else {
  worksheet.clientName = clientName; 
  worksheet.hours = req.body.nb_hours; 
  worksheet.furnitures =[];
  worksheet.furnituresArray =[];

  //console.log(req.body);

  //saving the client name for fast lookup later
  db.prepare("insert into clients values (?)").run(clientName, function(err) {
    if (err) { 
      logNonConstraintError(err);
    } else {
      console.log('new client saved : '+clientName);
    }
  });

  var furnitureInsert = db.prepare("insert into furnitures values (?)");
  
  if (isArray(req.body.furniture)) {
    req.body.furniture.forEach(function(value,i) {
      if (value.trim()) {
        worksheet.furnitures.push({name:value, quantity:req.body.quantity[i]});
        worksheet.furnituresArray.push([value, req.body.quantity[i]]);
        furnitureInsert.run(value, function(err) {
          if (err) { 
            logNonConstraintError(err);
          } else {
            console.log('new furniture saved : '+value);
          }
        });
      }
    });
  } else {
    if (req.body.furniture.trim()) {
      worksheet.furnitures.push({name:req.body.furniture, quantity:req.body.quantity});
      worksheet.furnituresArray.push([req.body.furniture, req.body.quantity]);
      furnitureInsert.run(req.body.furniture, function(err) {
        if (err) { 
          logNonConstraintError(err);
        } else {
          console.log('new furniture saved : '+req.body.furniture);
        }
      });
    }
  }


  console.log(worksheet);

    var now = new Date();
    var directory = config.root_csv_directory+'/'+now.getUTCFullYear();
if (!fs.existsSync(directory)) {
  fs.mkdirSync(directory);
}
    directory = directory +'/'+(1+now.getUTCMonth()); 
if (!fs.existsSync(directory)) {
  fs.mkdirSync(directory);
}
  csv.stringify(worksheet.furnituresArray, {quotedString:true}, function(err, csv) {
    var filename = directory+'/'+encodeURIComponent(worksheet.clientName)+'_'+worksheet.hours+'h_'+now.getUTCFullYear()+twoCharsInteger(1+now.getUTCMonth())+twoCharsInteger(now.getUTCDate()+"_"+((seedUuid++).toString(36))+".csv"); 
    fs.writeFile(filename, csv, function(err) {
      if (err) {
        console.log(err);
      } else {
        console.log(filename+' saved');
      }
    });
    
  });
  /*
  db.prepare("insert into hours values (?,?)").run(clientName,JSON.stringify(worksheet), function(err) {
      if (err) { 
        console.log(err);
      } else {
        console.log('new hours saved : '+req.body.furniture);
      }
    });
    */
  
  res.statusCode=302;
  res.setHeader('Location', config.root_app);
  res.send('');
  }
})

function twoCharsInteger(value) {
  if (value<10) {
    return "0"+value;
  } else {
    return value;
  }
}


app.get('/greendrop/furnitures', function (req,res) {
  db.serialize(function() {
    db.all("SELECT name from furnitures", function(err, rows) {
      res.send(rows);
    });
  });

})
app.get('/greendrop/clients', function (req,res) {
  db.serialize(function() {
    db.all("SELECT name from clients", function(err, rows) {
      res.send(rows);
    });
  });

})

if (!fs.existsSync(config.root_csv_directory)) {
  fs.mkdirSync(config.root_csv_directory);
}
db.run("CREATE TABLE if not exists clients (name TEXT primary key)");
db.run("CREATE TABLE if not exists furnitures (name TEXT primary key)");
//db.run("CREATE TABLE if not exists hours (client TEXT, hours TEXT )");

app.listen(3000, function () {
  console.log('Example app listening on port 3000!')
});

