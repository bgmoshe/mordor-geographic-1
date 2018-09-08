const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const basicFunctions = require('./basic-functions');
const geographicFunctions = require('./geographic-functions');
const httpStatus = require('http-status-codes');
const app = express();

//entities db
var entity_dict = {}; 

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

//This route returns JSON of all the entities
app.get('/entities', function (req, res) {
    res.status(httpStatus.OK);
    res.json(entity_dict);
});

//This route returns JSON of an entity with the id :id.
app.get('/entity/:id', function (req, res) {

    if(!(req.params.id in entity_dict)){
        res.status(httpStatus.NOT_FOUND).send("No such ID exists. Try another one!");
        return;
    }
    res.status(httpStatus.OK);
    res.json(entity_dict[req.params.id]);

});

//This route gets an entity to be entered into the entities db.
//The entity must follow the following rules:
//   *The given entity must have latitude, longitude and altitude.
//   *The new entity's id must not already exist.
//If it does we return text response "Finished" with status of httpStatus.CREATED. Otherwise we return status httpStatus.BAD_REQUEST and failure text.
app.post('/entity', function (req, res) {

    let id = req.body.id;
    
    if(id in entity_dict ){
        res.status(httpStatus.CONFLICT).send("Invalid request. ID already exists");
        return;
    }
    else if(!('id' in req.body)){
       res.status(httpStatus.BAD_REQUEST).send("Invalid request. Must contain id field");
       return;
    }
    
    else if(!(basicFunctions.containsFieldAsNumber(req.body,'latitude'))){
       res.status(httpStatus.BAD_REQUEST).send("Invalid request. Must contain latitude field as a number");
       return;
    }
    else if(!(basicFunctions.containsFieldAsNumber(req.body,'longitude'))){
       res.status(httpStatus.BAD_REQUEST).send("Invalid request. Must contain longitude field as a number");
       return;
    }
    else if (!(basicFunctions.containsFieldAsNumber(req.body,'altitude'))){
       res.status(httpStatus.BAD_REQUEST).send("Invalid request. Must contain altitude field as a number");
       return;
    }
    
    delete(req.body.id);
    entity_dict[id] = req.body;
    res.location("/entity/"+id);
    res.status(httpStatus.CREATED).send("Finished");

});

//This route gets fields to update.
//If there exists entity s.t. entity.id=id, then we updates its field according to the body of the request.
app.post('/entity/:id', function (req,res){
    
    let id = req.params.id;
    let modified_fields = req.body;

    if(!(id in entity_dict)){
        res.status(httpStatus.NOT_FOUND).send("Cannot modify since ID does not exist");
    }

    for (let field in modified_fields){
        let updated_field_value = modified_fields[field];
        entity_dict[id][field] = updated_field_value;
    }
    
    res.location("/entity/"+id);
    res.status(httpStatus.OK).send("Finished");

});

//This route delete an entity s.t. entity.id=id, if it exists.
app.delete('/entity/:id', function (req,res){
    
    let id = req.params.id;
    
    if(!(id in entity_dict)){
        res.status(httpStatus.NOT_FOUND);
        res.send("Cannot delete since ID does not exist");
    }
    delete(entity_dict[id]);
    res.status(httpStatus.NO_CONTENT);
    res.send("Removed id="+id+" successfully");
});

//This route gets latitude, longitude and radius.
//It returns JSON of all the entities that are in the given radius from the geographic coordinates.
//Also, we limit the page size (i.e. the number of entities we return) to be 50.
app.get('/entities-around', function (req, res) {

    let input = req.query;
    const MAX_PER_PAGE = 50;
    let entities_in_range_dict = {};

    if (!(basicFunctions.containsFieldAsNumber(input,'latitude'))){
        res.status(httpStatus.BAD_REQUEST).send("Invalid input. Input must contain latitude as a number.");
        return;
    }
    else if (!(basicFunctions.containsFieldAsNumber(input,'longitude'))){
        res.status(httpStatus.BAD_REQUEST).send("Invalid input. Input must contain longitude as a number.");
        return;
    }
    else if (!(basicFunctions.containsFieldAsNumber(input,'radius') && parseFloat(input.radius)>=0)){
        res.status(httpStatus.BAD_REQUEST).send("Invalid input. Input must contain non-negtive radius.");
        return;
    }
    
    entities_in_range_dict = geographicFunctions.getEntitiesInRange(input, input.radius*1.0, entity_dict, MAX_PER_PAGE);
    
    res.json(entities_in_range_dict);

});

//This route gets latitude, longitude, radius, minimum bearing and maximum bearing.
//It returns JSON of all the entities that are in the given radius from the geographic coordinates,
// such that their bearing from the coordinates are between the given minimum and maximum.
//Also, we limit the page size (i.e. the number of entities we return) to be 50.
app.get('/entities-in-bearing', function (req, res) {

    let input = req.query;
    let counter = 0;
    const MAX_PER_PAGE = 50;
    let entities_in_range_dict ={};

    if(!(basicFunctions.containsFieldAsNumber(input,'latitude'))){
        res.status(httpStatus.BAD_REQUEST).send("Invalid input. Input must include latitude as a number.");
        return;
    }
    else if(!(basicFunctions.containsFieldAsNumber(input,'longitude'))){
        res.status(httpStatus.BAD_REQUEST).send("Invalid input. Input must include longitude as a number.");
        return;
    }
    else if(!(basicFunctions.containsFieldAsNumber(input,'radius')) || parseFloat(input.radius)<0){
        res.status(httpStatus.BAD_REQUEST).send("Invalid input. Input must include radius as a non-negative number.");
        return;
    }
    else if(!(basicFunctions.containsFieldAsNumber(input,'minBearing'))){
        res.status(httpStatus.BAD_REQUEST).send("Invalid input. Input must include minBearing as a number.");
        return;
    }
    else if(!(basicFunctions.containsFieldAsNumber(input,'maxBearing'))){
        res.status(httpStatus.BAD_REQUEST).send("Invalid input. Input must include maxBearing as a number.");
        return;
    }
    // If the difference minBearing and maxBearing is at least 2*pi,
    // it is equivalent to get all the entities in range.
    if(Math.abs(input.minBearing*1.0 - input.maxBearing*1.0) >= 2*Math.PI){
        entities_in_range_dict = geographicFunctions.getEntitiesInRange(input, input.radius, entity_dict, MAX_PER_PAGE);
    }
    else{
        for (let key in entity_dict){
            if(counter >= MAX_PER_PAGE) {break;}
            if(geographicFunctions.computeDistance(input, entity_dict[key])<input.radius*1.0){
                let bearing = geographicFunctions.computeBearing(input ,entity_dict[key]);
                if(geographicFunctions.BearingBetweenMinToMax(bearing, input.minBearing * 1.0, input.maxBearing * 1.0)){
                    counter++;
                    entities_in_range_dict[key] = entity_dict[key];
                }
            }
        }
    }
    res.json(entities_in_range_dict);

});

//This route can get either latitude and longitude or an id.
//It returns JSON of the entity that is the most close to the input.
//If the input is id, the result will be entity with a different id (if such entity exists).
app.get('/closest-entity', function (req, res) {

    let input = req.query;
    let counter = 0;
    let closest_entity_id = undefined;
    let closest_entity = {};
    
    if(!(('latitude' in input && 'longitude' in input) || 'id' in input)){
        res.status(httpStatus.BAD_REQUEST).send("Invalid input. Must have latitude and longitude fields or id field.");
        return;
    }
    
    if(basicFunctions.containsFieldAsNumber(input,'latitude')&& basicFunctions.containsFieldAsNumber(input,'longitude')){
        if('id' in input){
            res.status(httpStatus.BAD_REQUEST).send("Ambiguous input. Must have latitude and longitude fields or id field, not both.");
            return;
        }
        closest_entity_id = geographicFunctions.findClosestID(input, entity_dict, []);
    }
    else if('latitude' in input || "longitude" in input){
        res.status(httpStatus.BAD_REQUEST).send("Invalid input. Must have both latitude and longitude as numbers.");
        return;
    }
    else if(!(input.id in entity_dict)){
        res.status(httpStatus.NOT_FOUND).send("Invalid. No entity has id "+input.id);
        return;
    }
    else{
        closest_entity_id = geographicFunctions.findClosestID(entity_dict[input.id], entity_dict, [input.id]);
    }
    
    closest_entity[closest_entity_id] = entity_dict[closest_entity_id];
    res.json(closest_entity);

});

// catch 404 and forward to error handler
app.use(function(req, res, next) {

    next(createError(httpStatus.NOT_FOUND));

});

// error handler
app.use(function(err, req, res, next) {

    res.locals.message = err.message;
    res.locals.error = err;
    console.error(err.stack);
    res.status(err.status || 500);
});

module.exports = app;
