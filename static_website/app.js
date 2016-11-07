
const storageHeader = "rdpcli_";
function preloadLists() {
  preloadClients();
  preloadFurnitures();
  var url = 'https://fonts.googleapis.com/css?family=PT+Sans:400,700';
  loadFont(url);  // hold tight, i tell you below.
  document.getElementById('uuid').value = uuid();
  showResubmit();
};

function preloadClients() {

  var ajax = new XMLHttpRequest();
  ajax.open("GET", "rest/clients", true);
  ajax.onload = function(e) {
    if (ajax.status>=400) {
      noBackend();
    } else {
      var list = JSON.parse(ajax.responseText).map(function(i) { return i.name; });
      new Awesomplete(document.querySelector("#dyn_client_name"),{ list: list });
    }
  };
  ajax.onerror = function() {
    noBackend();

  }
  ajax.send();
}

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

function noBackend() {
/*
  var markerElement = document.getElementById('error');
  markerElement.appendChild(document.createTextNode('Backend server unreachable'));
*/
}


function showResubmit() {
  showResubmitbutton();
  setInterval("showResubmitbutton()", 1000);
}

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
function showResubmitbutton() {
  if (nbResubmitting === 0) {
    //remove resubmitting button
    removeElement('resubmittingText');
    var nbEntries = countRdpcliEntries();
    if( nbEntries>0) {

      var resubmitButton = document.getElementById('resubmitButton');
      if (!resubmitButton) {
        var markerElement = document.getElementById('theform');
        var resubmit= document.createElement("button");
        resubmit.type='button';
        resubmit.id='resubmitButton';
        resubmit.onclick = function() {
          resubmitting();
        };
        resubmit.innerHTML='resubmit '+nbEntries+' records';
        //resubmit.value='resubmit';
//        markerElement.appendChild(resubmit);

        markerElement.insertBefore(resubmit, markerElement.firstChild);
      } else {
        resubmitButton.innerHTML='resubmit '+nbEntries+' records';
      } 
    } else {
      //remove resubmit button
      removeElement('resubmitButton');
    } 
  } else {
    //show resubmitting button
    removeElement('resubmittingText');
  }
}

function removeElement(id) {
  var element= document.getElementById(id);
  if (element) {
    element.parentNode.removeChild(element);
  }
}

function showResubmitting() {
  var id = 'resubmittingText';
  removeElement(id);
  var markerElement = document.getElementById('theform');
  var resubmit= document.createElement("span");
  resubmit.id=id;
  resubmit.innerHTML='resubmitting '+nbResubmitting+' records...';
  
  //resubmit.value='resubmit';
  markerElement.insertBefore(resubmit, markerElement.firstChild);
}

function loadFont(url) {
  var link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = url;
  document.head.appendChild(link);
}


/***********************************
// respond to user actions 
***********************************/


var nbFurnitures =1 ;


function addFurniture(options) {

  var initial = typeof(options) === "undefined" ? false : options.initial || false;

  var markerElement = document.getElementById('furnitureList');
  var line = document.createElement("li");
  var furniture= document.createElement("input");
  furniture.type = "text";
  //furniture.placeholder = 'used';
  //furniture.name = "furniture" + (++nbFurnitures);
  furniture.name = "furniture";
  furniture.className= 'furniture';

  var quantity= document.createElement("input");
  quantity.type = "number";
  //quantity.name = "quantity" + (nbFurnitures);
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


function customSubmit(form) {
  AJAXSubmit(form, ajaxSuccess2, ajaxError2);
}

function ajaxSuccess2 () {
  /* console.log("AJAXSubmit - Success!"); */
  //console.log(this.responseText);
  /* you can get the serialized data through the "submittedData" custom property: */
  /* console.log(JSON.stringify(this.submittedData)); */
  if (this.status>=400) {
    storeForLater(this);
  } else {
    //reloading from cache, but without the form data
    //  window.location = window.location;
    resetForm();
  }
}

function ajaxError2() {
  storeForLater(this);
}

function storeForLater(ajax) {

  /* console.log("AJAXSubmit - Success!"); */
  console.error('saving hours '+document.getElementById('uuid').value+' for later');
  /* you can get the serialized data through the "submittedData" custom property: */
  //console.error(ajax.submittedData); 
  localStorage.setItem(storageHeader+document.getElementById('uuid').value, JSON.stringify(ajax.submittedData));
  //TODO : if not connection this will fail, should reset the form otherwise

  //window.location = window.location;
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
  /* console.log("AJAXSubmit - Success!"); */
  //console.log(this.responseText);
  /* you can get the serialized data through the "submittedData" custom property: */
  /* console.log(JSON.stringify(this.submittedData)); */

  if (ajax.status>=400) {
    resubmitError(ajax );
  } else {
    nbResubmitting--;
    //reloading from cache, but without the form data
    var key = ajax.submittedData.uuid;
    console.log('resubmit of '+key+' ok');
    localStorage.removeItem(key);
  }
}

function resubmitError(ajax) {
  console.error('resubmit of '+ajax.submittedData.uuid+' failed');
  //console.log(ajax);
  nbResubmitting--;
}

var nbResubmitting = 0; 
