/***********************************
* building the app 
***********************************/

function initializeApp() {
  preloadClients();
  preloadFurnitures();
  loadFont('https://fonts.googleapis.com/css?family=PT+Sans:400,700');  // hold tight, i tell you below.
  document.getElementById('uuid').value = uuid();
  monitorResubmitStatus();
};

function preloadClients() {

  var ajax = new XMLHttpRequest();
  ajax.open("GET", "rest/clients", true);
  ajax.onload = function(e) {
    if (ajax.status<400) {
      var list = JSON.parse(ajax.responseText).map(function(i) { return i.name; });
      new Awesomplete(document.querySelector("#dyn_client_name"),{ list: list });
    }
  };
  ajax.send();
}

//used when adding new furniture fields
var furnitures;

function preloadFurnitures() {

  var ajax = new XMLHttpRequest();
  ajax.open("GET", "rest/furnitures", true);
  ajax.onload = function(e) {
    if (ajax.status<400) {
      furnitures = JSON.parse(ajax.responseText).map(function(i) { return i.name; });
      new Awesomplete(document.querySelector("#dyn_furniture_name"),{ list: furnitures});
    }
  };
  ajax.send();
}

function loadFont(url) {
  var link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = url;
  document.head.appendChild(link);
}


function monitorResubmitStatus() {
  showResubmitbutton();
  setInterval("showResubmitbutton()", 1000);
}

/***********************************
* managing the resubmitting of data
***********************************/
function countRdpcliEntries() {
  var nb =0;
  for (var i = 0; i < localStorage.length; i++){
    var key = localStorage.key(i);
    if (key.startsWith(storageHeader)) {
      nb++;
    }
  }

  return nb;

}
const storageHeader = "rdpcli_";

const resubmittingId = 'resubmittingText';
const submitOkId = 'submitOkId';
const resubmitId = 'resubmitButton';

function showResubmitbutton() {
  if (nbResubmitting === 0) {
    //remove resubmitting text 
    removeElement(resubmittingId);
    var nbEntries = countRdpcliEntries();
    if( nbEntries>0) {
      var resubmitButton = document.getElementById(resubmitId);
      if (!resubmitButton) {
        var markerElement = document.getElementById('theform');
        var resubmit= document.createElement("button");
        resubmit.type='button';
        resubmit.id=resubmitId;
        resubmit.onclick = function() {
          resubmitting();
        };
        resubmit.innerHTML='resubmit '+nbEntries+' records';

        markerElement.insertBefore(resubmit, markerElement.firstChild);
      } else {
        resubmitButton.innerHTML='resubmit '+nbEntries+' records';
      } 
    } else {
      //delete resubmit button
      removeElement(resubmitId);
    } 
  } else {
    //delete resubmitting status 
    removeElement(resubmittingId);
  }
}

function removeElement(id) {
  var element= document.getElementById(id);
  if (element) {
    element.parentNode.removeChild(element);
  }
}

function showResubmitting() {
  removeElement(resubmittingId);
  var markerElement = document.getElementById('theform');
  var resubmit= document.createElement("span");
  resubmit.id=resubmittingId;
  resubmit.innerHTML='resubmitting '+nbResubmitting+' records...';
  
  //resubmit.value='resubmit';
  markerElement.insertBefore(resubmit, markerElement.firstChild);
}


/***********************************
* adding furniture lines 
***********************************/



function addFurniture(options) {

  var initial = typeof(options) === "undefined" ? false : options.initial || false;

  var markerElement = document.getElementById('furnitureList');
  var line = document.createElement("li");
  var furniture= document.createElement("input");
  furniture.type = "text";
  //furniture.placeholder = 'used';
  furniture.name = "furniture";
  furniture.className= 'furniture';

  var quantity= document.createElement("input");
  quantity.type = "number";
  quantity.name = "quantity";
  quantity.min = 1;
  quantity.step= 0.5;
  quantity.value= 1;

  if (initial) {
    var label = document.createElement("label");
    label.innerHTML = 'I used';
    label.appendChild(document.createElement("br"));
    label.appendChild(furniture);
    line.appendChild(label);
  } else {
    line.appendChild(furniture);
  }
  var xlabel = document.createElement("label");
  xlabel.innerHTML = ' x ';
  xlabel.appendChild(quantity);
  line.appendChild(xlabel);

  markerElement.appendChild(line);
  new Awesomplete(furniture,{ list: furnitures});
}

/***********************************
* saving data 
***********************************/


function customSubmit(form) {
  removeElement(submitOkId);
  AJAXSubmit(form, saveSuccess, saveError);
}

function saveSuccess() {
  if (this.status>=400) {
    storeForLater(this);
  } else {
    resetForm();

    //showing a submit message
    removeElement(submitOkId);
    var markerElement = document.getElementById('aftertheform');
    var resubmit= document.createElement("span");
    resubmit.id=submitOkId;
    resubmit.innerHTML='invoice saved';
    markerElement.insertBefore(resubmit, markerElement.firstChild);
    setInterval("removeSuccess()", 2000);
  }
}

function removeSuccess() {
    removeElement(submitOkId);
}

function saveError() {
  storeForLater(this);
}

function storeForLater(ajax) {

  console.error('saving hours '+document.getElementById('uuid').value+' for later');
  localStorage.setItem(storageHeader+document.getElementById('uuid').value, JSON.stringify(ajax.submittedData));
  resetForm();
}

function resetForm() {
  document.getElementById('therealform').reset();
  document.getElementById('uuid').value = uuid();
  var myNode = document.getElementById("furnitureList");
  while (myNode.firstChild) {
      myNode.removeChild(myNode.firstChild);
  }
  addFurniture({initial:true});
}

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });
}

/***************************
* resubmitting data
***************************/

var nbResubmitting = 0; 

function resubmitting() {
  removeElement('resubmitButton');
  nbResubmitting = countRdpcliEntries();
  if (nbResubmitting>0) {
    showResubmitting();
  }

  for (var i = 0; i < localStorage.length; i++){
    var key = localStorage.key(i);
    if (key.startsWith(storageHeader)) {
      console.log('resubmitting '+key);
      var data = JSON.parse(localStorage.getItem(key));
      data.uuid = key;
      submitData(data, 
          function() {resubmitSuccess(this);}, 
          function() {resubmitError(this)});
    }
  }

}

function resubmitSuccess(ajax){

  if (ajax.status>=400) {
    resubmitError(ajax );
  } else {
    nbResubmitting--;
    var key = ajax.submittedData.uuid;
    console.log('resubmit of '+key+' ok');
    localStorage.removeItem(key);
  }
}

function resubmitError(ajax) {
  console.error('resubmit of '+ajax.submittedData.uuid+' failed');
  nbResubmitting--;
}

