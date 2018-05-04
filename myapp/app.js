var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var fs = require('fs');
var app = express();

entity_dict = {};
KM_TO_NM = 0.539956803;

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


function computeDistance(entity1, entity2){
   var entity1_latitude = 1.0*entity1['latitude'];
   var entity1_longitude = 1.0*entity1['longitude'];

   var entity2_latitude = 1.0*entity2['latitude'];
   var entity2_longitude = 1.0*entity2['longitude'];
   
   var R = 6371e3; // metres
   var delta_latitude = entity2_latitude-entity1_latitude;
   var delta_longitude = entity2_longitude-entity1_longitude;

   var a = Math.sin(delta_latitude/2) * Math.sin(delta_latitude/2) +
      Math.cos(entity1_latitude) * Math.cos(entity2_latitude) *
      Math.sin(delta_longitude/2) * Math.sin(delta_longitude/2);
   var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

   var d = (R * c /1000.0)*KM_TO_NM;
   return d;
}

function getEntitiesInRange(obj, entities, page_size){
   var counter = 0;
   var entities_in_range = {};
   for (var key in entities){
      if(counter == page_size){
	     break;
      }
      if(computeDistance(obj, entity_dict[key])<=obj['radius']*1.0){
         counter++;
         entities_in_range[key] = entity_dict[key];
      }
   }
   return entities_in_range;
}

function computeBearing(entity1, entity2){
   var entity1_latitude = 1.0*entity1['latitude'];
   var entity1_longitude = 1.0*entity1['longitude'];
	
   var entity2_latitude = 1.0*entity2['latitude'];
   var entity2_longitude = 1.0*entity2['longitude'];
   
   var y = Math.sin(entity2_longitude-entity1_longitude) * Math.cos(entity2_latitude);
   var x = Math.cos(entity1_latitude)*Math.sin(entity2_latitude) -
           Math.sin(entity1_latitude)*Math.cos(entity2_latitude)*Math.cos(entity2_longitude-entity1_longitude);
   var brng = Math.atan2(y, x);
   return brng;
}

function findClosestID(entity, dict){
   
   var min_dist = Infinity;
   var closest_entity_id = null;
   
   for (var key in dict){
      var dist = computeDistance(dict[key], entity);
	  if(dist < min_dist){
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
	  var entity = {}
	  entity[req.params.id] = entity_dict[req.params.id];
      res.status(201).end(JSON.stringify(entity));
   }
   else{
      res.status(404).end("No such ID exists. Try another one!");
   }
});


app.post('/entity', function (req, res) {
   var id = req.body.id;
   if(id in entity_dict ){
      res.status(400).end("Invalid request. ID already exists");
   }
   else{
      if(!('latitude' in req.body && 'longitude' in req.body && 'altitude' in req.body)){
         res.status(400).end("Invalid request. Must contain at least a longitude, latitude and altitude fields!");
     }
      else{
		 if(isNaN(req.body.latitude) || isNaN(req.body.longitude) || isNaN(req.body.altitude)){
            res.status(400).end("Invalid request. latitude/longitude/altitude parameters must be numbers!");
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
   var MAX_PER_PAGE = 50;
   var entities_in_range_dict = {};

   if(!('latitude' in params && 'longitude' in params && 'radius' in params) || isNaN(params['latitude'])||isNaN(params['longitude'])||(isNaN(params['radius'])||parseFloat(params['radius'])<0)){
	   res.status(400).end("Invalid input. Latitude and longitude must be number, while radius should be a non-negative number");
   }
   else{
	  entities_in_range_dict = getEntitiesInRange(params, entity_dict, MAX_PER_PAGE);  
   }
   res.end(JSON.stringify(entities_in_range_dict))
});

app.get('/entities-in-bearing', function (req, res) {
	
   var params = req.body;
   var counter = 0;
   var MAX_PER_PAGE = 50;
   var entities_in_range_dict ={};

   if(!('latitude' in params && 'longitude' in params && 'radius' in params && 'minBearing' in params && 'maxBearing' in params)
	   || isNaN(params['latitude'])||isNaN(params['longitude'])||isNaN(params['radius'])||isNaN(params['minBearing'])||isNaN(params['maxBearing'])){
	   res.status(400).end("Invalid input. Latitude,longitude, radius min and max bearing must be numbers");
   }
   else{
	  if(Math.abs(params['minBearing']*1.0 - params['maxBearing']*1.0) >= 2*Math.PI){
         entities_in_range_dict = getEntitiesInRange(params, entity_dict, MAX_PER_PAGE);
      }
      else{
		 var min_bearing = params['minBearing'] * 1.0;
		 var max_bearing = params['maxBearing'] * 1.0;
		 
         for (var key in entity_dict){
            if(counter == MAX_PER_PAGE){
	           break;
            }
            if(computeDistance(params, entity_dict[key])<params['radius']*1.0){
		       var brng = computeBearing(params ,entity_dict[key])
			   if(min_bearing <= max_bearing){
			      if(brng >= min_bearing  && brng <= max_bearing){
		             counter++;
		             entities_in_range_dict[key] = entity_dict[key];
		          }
               }
			   else{
			      if(brng <= min_bearing  || brng <= max_bearing){
		             counter++;
		             entities_in_range_dict[key] = entity_dict[key];
                  }				  
			   }
			}
         }
      }
   }
   res.end(JSON.stringify(entities_in_range_dict));
});

app.get('/closest-entity', function (req, res) {
	
   var params = req.body;
   var counter = 0;
   
   if(!(('latitude' in params && 'longitude' in params) || 'id' in params)){
      res.status(400).end("Invalid input. Must have latitude and longitude fields or id field");
   }
   else{
      if('latitude' in params && 'longitude' in params){
         if('id' in params){
		     res.status(400).end("Ambiguous input. Must have latitude and longitude fields or id field, not both");
		 }
	     else{
	        if( isNaN(params['latitude'])||isNaN(params['longitude'])){
	           res.status(400).end("Invalid. latitude and longitude should be numbers");
			}
		 
		    else{
               var closest_entity_id = findClosestID(params,entity_dict);
			   var entity={};
			   entity[closest_entity_id] = entity_dict[closest_entity_id]
               res.end(JSON.stringify(entity));
			}
		 }
      }
	  else{
	     if(params['id'] in entity_dict){
		    var input_entity = entity_dict[params['id']];
            delete(entity_dict[params['id']]);
			var closest_entity_id = findClosestID(input_entity,entity_dict);
			var closest_entity = {};
			closest_entity[closest_entity_id] = entity_dict[closest_entity_id];
			entity_dict[params['id']] = input_entity;
            res.end(JSON.stringify(closest_entity));			
		 }
		 else{
		    res.status(400).end("Invalid. No entity has id "+params['id']);
		 }
	  }
   }
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
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
