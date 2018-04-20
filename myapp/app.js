var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var fs = require('fs');
var app = express();

entity_dict = {'1':{lat:1,lon:2}};
KM_TO_NM = 0.539956803;

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


function computeDistance(obj1, obj2){
   var obj1_lat = 1.0*obj1['lat'];
   var obj1_lon = 1.0*obj1['lon'];

   var obj2_lat = 1.0*obj2['lat'];
   var obj2_lon = 1.0*obj2['lon'];
   
   var R = 6371e3; // metres
   var delta_lat = obj2_lat-obj1_lat;
   var delta_lon = obj2_lon-obj1_lon;

   var a = Math.sin(delta_lat/2) * Math.sin(delta_lat/2) +
      Math.cos(obj1_lat) * Math.cos(obj2_lat) *
      Math.sin(delta_lon/2) * Math.sin(delta_lon/2);
   var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

   var d = (R * c /1000.0)*KM_TO_NM;
   return d;
}

function computeBearing(obj1, obj2){
   var obj1_lat = 1.0*obj1['lat'];
   var obj1_lon = 1.0*obj1['lon'];
	
   var obj2_lat = 1.0*obj2['lat'];
   var obj2_lon = 1.0*obj2['lon'];
   
   var y = Math.sin(obj1_lat-obj2_lat) * Math.cos(obj1_lon);
   var x = Math.cos(obj2_lon)*Math.sin(obj1_lon) -
           Math.sin(obj1_lat)*Math.cos(obj1_lon)*Math.cos(obj1_lat-obj2_lat);
   var brng = Math.atan2(y, x);
   return brng;
}

function findClosestID(entity, dict){
   
   var min_dist = Infinity;
   var closest_entity_id = null;
   
   for (var key in dict){
      var dist = computeDistance(dict[key], entity);
	  if(dist < min_dist){
         console.log('ID:'+key +", dist "+dist.toString()+", Closest_ID = " +closest_entity_id+" ,min_dist"+min_dist.toString()); 		 
         closest_entity_id = key;
         min_dist = dist;
      }
   }
   return closest_entity_id;
}

app.get('/entities', function (req, res) {
       res.end( JSON.stringify(entity_dict)) ;
});

app.get('/entity/:id', function (req, res) {
   if(req.params.id in entity_dict){
      res.status(201).end(JSON.stringify(entity_dict[req.params.id]));
   }
   else{
      res.status(404).end("No such ID exists. Try another one!");
   }
});


app.post('/entity', function (req, res) {
   var id = req.body.id;
   if(id in entity_dict ){
      res.status(400).end("Invalid request. ID already exitsts");
   }
   else{
      if(!('lat' in req.body && 'lon' in req.body && 'alt' in req.body)){
         res.status(400).end("Invalid request. Must contain at least a longitude, latitude and altitude fields!");
     }
      else{
		 if(isNaN(req.body.lat) || isNaN(req.body.lon)){
            res.status(400).end("Invalid request. Lat/Lon/Alt parameters must be integers!");
		 }
		 else{
            delete(req.body.id);
            entity_dict[id] = (req.body);
			res.location("/entity/"+id)
            res.status(201).end("Finished");
         }
      }
   }
});

app.get('/entities-around', function (req, res) {
	
   var params = req.body;
   var counter = 0;
   var MAX_PER_PAGE = 50;
   var list = [];

   if(!('lat' in params && 'lon' in params && 'radius' in params) || isNaN(params['lat'])||isNaN(params['lon'])||isNaN(params['radius'])){
	   res.status(400).end("Invalid input. Needs integer lat,lon and radius");
   }
   else{
      for (var key in entity_dict){
         if(counter == MAX_PER_PAGE){
	        break;
         }
         if(computeDistance(params, entity_dict[key])<=params['radius']*1.0){
		     counter++;
		     list.push(key);
         }
		 else{
		    console.log("Radius:"+params['radius']+" but distance is "+computeDistance(params, entity_dict[key]).toString());
		 }
      }
   }
   res.end(JSON.stringify(list))
});

app.get('/entities-in-bearing', function (req, res) {
	
   var params = req.body;
   var counter = 0;
   var MAX_PER_PAGE = 50;
   var list = [];

   if(!('lat' in params && 'lon' in params && 'radius' in params && 'minBearing' in params && 'maxBearing' in params)
	   || isNaN(params['lat'])||isNaN(params['lon'])||isNaN(params['radius'])||isNaN(params['minBearing'])||isNaN(params['maxBearing'])){
	   res.status(400).end("Invalid input. Needs integer lat,lon, radius min and max bearing");
   }
   else{
      for (var key in entity_dict){
         if(counter == MAX_PER_PAGE){
	        break;
         }
         if(computeDistance(params, entity_dict[key])<params['radius']*1.0){
		    var brng = computeBearing(params ,entity_dict[key])
			if(brng >= params['minBearing'] && brng <= params['maxBearing']){
		       counter++;
		       list.push(key);
		    }
         }
		 else{
		    console.log("Radius:"+params['radius']+" but distance is "+computeDistance(params, entity_dict[key]).toString());
		 }
      }
   }
   res.end(JSON.stringify(list))
});

app.get('/closest-entity', function (req, res) {
	
   var params = req.body;
   var counter = 0;
   
   if(!(('lat' in params && 'lon' in params) || 'id' in params)){
      res.status(400).end("Invalid input. Needs integer lat,lon or entity id");
   }
   else{
      if('lat' in params && 'lon' in params){
	     if( isNaN(params['lat'])||isNaN(params['lon'])){
	        res.status(400).end("Invalid. Lat and Lon should be integers");
		 }
		 else{
            var closest_entity_id = findClosestID(params,entity_dict);
            console.log("Parms = "+JSON.stringify(params)+" \n Closest Entity id:"+closest_entity_id.toString()+
			            "\nEntity="+JSON.stringify(entity_dict[closest_entity_id]));
            res.end(JSON.stringify(entity_dict[closest_entity_id]));
		 }
      }
	  else{
	     if(params['id'] in entity_dict){
		    var entity = entity_dict[params['id']];
            delete(entity_dict[params['id']]);
			var closest_entity_id = findClosestID(entity,entity_dict);
			entity[params['id']] = entity;
			entity_dict[params['id']] = entity;
            console.log("Parms = "+JSON.stringify(params)+" \n Closest Entity id:"+closest_entity_id.toString()+
			"\nEntity="+JSON.stringify(entity_dict[closest_entity_id]));
            res.end(JSON.stringify(entity_dict[closest_entity_id]));			
		 }
		 else{
		    res.status(400).end("Invalid. No entity has id "+params['id']);
		 }
	  }
   }
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
   console.log(req);
   next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
