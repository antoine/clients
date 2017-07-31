const express = require('express')
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('lists_rundop.sqlite');
const app = express()
const bodyParser = require('body-parser');
const config = require ('./config');
const csv = require ('csv');
const fs= require('fs');
//recursive copy
const ncp=require('ncp').ncp;
//recursive rmdir
const rmdir = require('rimraf');
const exec= require('child_process');
const format = require('util').format;

ncp.limit=16;

app.use(bodyParser.urlencoded({ extended: true }));

var seedUuid = new Date().getTime();

isArray = function(a) {
  return (!!a) && (a.constructor === Array);
};

function logNonConstraintError(err) {
  if (err.code != 'SQLITE_CONSTRAINT') {
    console.error(err);
    return true;
  } else {
    return false;
  }
}

app.post('/greendrop/save', function (req, res) {

  var worksheet = {};
  var clientName = unescape(req.body.client_name).replace(/_/g,'-');
  if (!clientName.trim()) {
    res.statusCode=500;
    res.send('empty client name, cannot save hours');
  } else {
    worksheet.clientName = clientName; 
    worksheet.hours = req.body.nb_hours; 
    worksheet.furnitures =[];
    worksheet.furnituresArray =[];
    worksheet.furnituresArray.push(['hours', req.body.nb_hours]);

    //console.log(req.body);

    //saving the client name for fast lookup later
    db.prepare("insert into clients (name, occurences, invoice_name, invoice_street, invoice_city) values (?, 1, ?, '', '')").run(clientName, clientName, function(err) {
      if (err) { 
        if (!logNonConstraintError(err)) {
          db.prepare("update clients set occurences = occurences+1 where name = ?").run(clientName, function(err) {
            if (err) { 
              console.error(err);
            }});


        }
      } else {
        console.log('new client saved : '+clientName);
      }
    });

    var furnitureInsert = db.prepare("insert into furnitures values (?,0)");

    if (isArray(req.body.furniture)) {
      req.body.furniture.forEach(function(value,i) {
        if (value.trim()) {

          worksheet.furnitures.push({name:unescape(value), quantity:req.body.quantity[i]});
          worksheet.furnituresArray.push([unescape(value), req.body.quantity[i]]);
          furnitureInsert.run(unescape(value), function(err) {
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
        worksheet.furnitures.push({name:unescape(req.body.furniture), quantity:req.body.quantity});
        worksheet.furnituresArray.push([unescape(req.body.furniture), req.body.quantity]);
        furnitureInsert.run(unescape(req.body.furniture), function(err) {
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
    directory = directory +'/'+(twoCharsInteger(1+now.getUTCMonth())); 
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory);
    }
    csv.stringify(worksheet.furnituresArray, {quotedString:true}, function(err, csv) {
      var filename = format("%s/%s%s%s_%s_%sh_%s.csv",
                            directory,
                            now.getUTCFullYear(),
                            twoCharsInteger(1+now.getUTCMonth()),
                            twoCharsInteger(now.getUTCDate()),
                            worksheet.clientName,
                            worksheet.hours,
                           (seedUuid++).toString(36)); 
      var filename_toinvoice=filename+".todo";
      var filename_notes=filename+".notes";
      fs.writeFile(filename, csv, {encoding:'utf8'}, function(err) {
        if (err) {
          console.log(err);
        } else {
          console.log(filename+' saved');
        }
      });
      fs.writeFile(filename_toinvoice, "TODO");
      var notes = req.body.notes;
      if (notes.trim()) {
        console.log(notes);
        fs.writeFile(filename_notes, notes);
      }

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

    res.statusCode=201;
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

const todoSuffix = ".todo";
const row_start_index=13;
const nb_lines_in_invoice=13;
const invoice_template_directory="invoice_template";
const invoice_header='content.xml';
const invoice_footer='invoice_footer.xmlfragment';

app.post('/greendrop/admin/tasks/invoices', function(req,res){
  console.log('generating invoices');
  var directory = config.root_csv_directory;
    var now = new Date();
  var ods_directory= config.root_ods_directory+"/"+now.getUTCFullYear();
    if (!fs.existsSync(ods_directory)) {
      fs.mkdirSync(ods_directory);
    }
  var rowTemplate=fs.readFileSync('row.template', {encoding:'utf8'});
  var emptyRowTemplate=fs.readFileSync('empty_row.template', {encoding:'utf8'});
                          db.all("SELECT * from furnitures",  function(err, furnitures) {
                            if (err) {
                              res.send(500,err);
                            } else {

  fs.readdirSync(directory).forEach(function(year_value,i) {
    var year=directory+"/"+year_value;
    if (fs.statSync(year).isDirectory()){
      fs.readdirSync(year).forEach(function(month_value,i) {
        var month=year+"/"+month_value;
        if (fs.statSync(month).isDirectory()){
          fs.readdirSync(month).forEach(function(file_value,i) {
            var todoFile=month+"/"+file_value;
            if (todoFile.endsWith(todoSuffix)) {
              console.log('found '+todoFile)
              var file = todoFile.substring(0,todoFile.length-todoSuffix.length);
              var ods_content = ods_directory+"/"+file_value+".invoice";
              rmdir(ods_content,function(err){
                if (err) {
                  console.error('could not process '+file);
                  console.error(err);
                } else {
                  ncp(invoice_template_directory, ods_content, function(err){
                    if (err) {
                      console.error('could not process '+file);
                      console.error(err);
                    } else {
                      var file_rows= ods_content+'/'+invoice_header;

                      var rowIndex = 0;
                      csv.parse(fs.readFileSync(file, {encoding:'utf8'}), function(err,invoiceData){
                        if (err) {
                          console.error('could not process '+file);
                          console.error(err);
                        } else {
                          //generating the row containing data
                          invoiceData.forEach(function(line_value,i){
                            currentRow = row_start_index+(rowIndex++);
                            var furniture_name = line_value[0];
                            var unit_price = findPriceOf(furniture_name, furnitures);
                            var row = rowTemplate
                            .replace('$name', unescape(line_value[0]))
                            .replace('$quantity', line_value[1])
                            .replace('$unit_price', unit_price)
                            .replace('$unit_price_in_eur', unit_price)
                            .replace(/\$rowIndex/g,currentRow);
                            fs.appendFileSync(file_rows, row, {encoding:'utf8'});

                          });
                          //filling with empty rows
                          while(rowIndex<=nb_lines_in_invoice) {
                            var empty_row = emptyRowTemplate
                            .replace(/\$rowIndex/g,row_start_index+(rowIndex++));
                            fs.appendFileSync(file_rows, empty_row, {encoding:'utf8'});
                          }

                          //appending the footer
                          fs.appendFileSync(file_rows, fs.readFileSync(invoice_footer, {encoding:'utf8'}), {encoding:'utf8'});

                          //deleting existing archive if any
                          var ods_file=file_value.substring(0,file_value.length-todoSuffix.length-".csv".length)+".ods";
                          if (fs.existsSync(month+'/'+ods_file)) {
                            console.log('deleting existing ods '+month+'/'+ods_file);
                            fs.unlinkSync(month+'/'+ods_file);
                          }

                          //replacing variables that were part of the header
                          var name_split=ods_file.split('_');
                          console.log(name_split);
                          var client_name= name_split[1];
                          db.all("SELECT * from clients where name =?", client_name, function(err, rows) {
                            if (err) {
                              res.send(500,err);
                            } else {
                              var client_data = rows[0];
                              if (client_data) {
                                //adding months to get the due date
                                var due_date = date_of(name_split[0]);
                                due_date.setMonth(due_date.getMonth() +config.nb_month_before_due_date);
                          exec.execSync(format("sed -i -e 's/#client_name/%s/' -e 's/#client_street/%s/' -e 's/#client_city/%s/' -e 's/#date_work/%s/' -e 's/#fact_num/%s/' -e 's/#date_due/%s/' content.xml",
                                               client_data.invoice_name,
                                               client_data.invoice_street,
                                               client_data.invoice_city,
                                               format_invoice_date(date_of(name_split[0])), 
                                               'facture num '+client_data.occurences, 
                                               format_invoice_date(due_date) 
                                               ), {cwd:ods_content});
                              } else {
                              console.error('no client data found for %s', client_name);
                              }

                          //zipping the ods
                          //putting mimetype first in the archive to respect the ODF format and avoid a 'corrupted' warning
                          exec.exec("zip -r ../"+safe_filename(ods_file)+" mimetype .", {cwd:ods_content}, function(error, stdout, stderr){
                            if (error) {
                              console.error(error);
                              console.error(stderr);
                            } else {
                              console.log('created '+ods_directory+'/'+ods_file);
                              if (fs.existsSync(file+".notes")) {
                                fs.writeFileSync(ods_directory+'/'+ods_file+'-notes.txt', fs.readFileSync(file+'.notes', {encoding:'utf8'}), {encoding:'utf8'});
                              }
                              fs.unlinkSync(todoFile);
                              rmdir(ods_content,function(err){
                                if (err) {
                                  console.error('could not process '+file);
                                  console.error(err);
                                }
                              });
                            }
                          });
                            }
                          });
                        }
                      });
                    }
                  });
                }
              });
            }
          });
        }
      });
    }
  })

  res.send('ok');
                            }
                          });
});

function date_of(date_string) {
  return new Date(date_string.substring(0,4), date_string.substring(4,6)-1,date_string.substring(6,8));
}

function format_invoice_date(invoice_date) {
  return format("%s\\/%s\\/%s",
                invoice_date.getUTCFullYear(), 
                twoCharsInteger(1+invoice_date.getUTCMonth()), 
                twoCharsInteger(invoice_date.getUTCDate()));
}

function findPriceOf(furniture_name, all_furnitures) {
  for (var i = 0; i<all_furnitures.length;i++){
    if (all_furnitures[i].name === furniture_name) {
      console.log('price %s found for %s', all_furnitures[i].unit_price, furniture_name);
    return all_furnitures[i].unit_price;
    }
  }
      console.log('no price found for %s', furniture_name);
  return '0';
}

function safe_filename(filename) {
  return filename.replace (/'/g, '\\\'')
  .replace(/ /g,'\\ ')
  .replace(/\//g,'\\/')
    ;
}


app.get('/greendrop/furnitures', function (req,res) {
  db.serialize(function() {
    db.all("SELECT name from furnitures", function(err, rows) {
      res.send(rows);
    });
  });

});

app.get('/greendrop/clients', function (req,res) {
  db.serialize(function() {
    db.all("SELECT name from clients", function(err, rows) {
      res.send(rows);
    });
  });
});

//admin resources

app.get('/greendrop/admin', function (req,res) {
        res.send(format("<html><body><h1>invoices</h1><ul><li><a href='/invoices'>invoices</a></li>"+
                 "<li><form method='post' action='%s/tasks/invoices'><input type='submit' value='generate invoices'></form></li>"+
                 "</ul><h1>configuration</h1><a href='%s/clients'>clients list</a><br><a href='%s/furnitures'>furnitures list</a>",
                       config.admin_root_app,
                       config.admin_root_app,
                       config.admin_root_app
                       ));
});

function listNamedEntities(entityType,res) {
  db.serialize(function() {
    db.all("SELECT name from "+entityType, function(err, rows) {
      if (err) {
        res.send(500,err);
      } else {
        res.send(rows.map(function(entity){return format("<li><a href='%s/%s/%s'>%s</a></li>",
                                                         config.admin_root_app,
                                                         entityType, 
                                                         entity.name, 
                                                         entity.name );})
                      .reduce(function(list, entry){return list+entry}, '<a href=".">back to main page</a>'));
      }
    });
  });
}

app.get('/greendrop/admin/clients', function (req,res) {
  listNamedEntities('clients', res);
});

app.get('/greendrop/admin/clients/:id', function (req,res) {
  db.serialize(function() {
    db.all("SELECT * from clients where name =?", req.params.id, function(err, rows) {
      if (err) {
        res.send(500,err);
      } else {
        var client = rows[0];
        res.send(format("<html><body><body><a href='%s/clients'>back to clients list</a><h2>client data for %s</h2><p>Current invoice number : %s</p><form method='POST' ><label>invoice name<br><input name='invoice_name' value='%s'></label><br><label>invoice street<br><input name='invoice_street' value='%s'></label><br><label> postal code and city<br><input name='invoice_city' value='%s'></label><br><input type='submit'></form>",
                config.admin_root_app,
                req.params.id,
                client.occurences,
                client.invoice_name,
                client.invoice_street,
                client.invoice_city));
      }
    });
  });
});

app.post('/greendrop/admin/clients/:id', function (req,res) {
          db.prepare("update clients set invoice_name= ?, invoice_street=?, invoice_city=? where name = ?").run(
            req.body.invoice_name,
            req.body.invoice_street,
            req.body.invoice_city,
            req.params.id, 
            function(err) {
            if (err) { 
              console.error(err);
            }});
            res.redirect('./'+req.params.id);
});

app.get('/greendrop/admin/furnitures', function (req,res) {
  listNamedEntities('furnitures', res);
});

app.get('/greendrop/admin/furnitures/:id', function (req,res) {
  db.serialize(function() {
    db.all("SELECT * from furnitures where name =?", req.params.id, function(err, rows) {
      if (err) {
        res.send(500,err);
      } else {
        var client = rows[0];
        res.send(format("<html><body><a href='%s/furnitures'>back to furnitures list</a><h2>parameters for furniture %s</h2><form method='POST' ><label>unit price<br><input name='unit_price' value='%s'></label><br><input type='submit'></form>",
                        config.admin_root_app,
                req.params.id,
                client.unit_price));
      }
    });
  });
});

app.post('/greendrop/admin/furnitures/:id', function (req,res) {
          db.prepare("update furnitures set unit_price = ? where name = ?").run(
            req.body.unit_price,
            req.params.id, 
            function(err) {
            if (err) { 
              console.error(err);
            }});
            res.redirect('./'+req.params.id);
});

function createConfigDirectories(directory) {
if (!fs.existsSync(directory)) {
  console.log('creating '+directory);
  fs.mkdirSync(directory);
}
}
createConfigDirectories(config.root_csv_directory);
createConfigDirectories(config.root_ods_directory);

db.run("CREATE TABLE if not exists clients (name TEXT primary key, invoice_name TEXT, invoice_street TEXT, invoice_city TEXT, occurences INTEGER)");
db.run("CREATE TABLE if not exists furnitures (name TEXT primary key, unit_price TEXT)");
    //db.run("CREATE TABLE if not exists hours (client TEXT, hours TEXT )");

    app.listen(3000, function () {
      console.log('Example app listening on port 3000!')
    });

