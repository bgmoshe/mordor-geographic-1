var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var basicFunctions = require('./basic-functions');
var geographicFunctions = require('./geographic-functions');
var app = express();

entity_dict = {};

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/entities', function (req, res) {
    res.end( JSON.stringify(entity_dict)) ;
});

app.get('/entity/:id', function (req, res) {

    if(!(req.params.id in entity_dict)){
        res.status(404).end("No such ID exists. Try another one!");
        return;
    }
    res.status(201).end(JSON.stringify(entity_dict[req.params.id]));

});


app.post('/entity', function (req, res) {

    var id = req.body.id;
    if(id in entity_dict ){
        res.status(400).end("Invalid request. ID already exists");
        return;
    }
    else if(!(basicFunctions.containsFieldAsNumber(req.body,'latitude'))){
       res.status(400).end("Invalid request. Must contain latitude field as a number");
       return;
    }
    else if(!(basicFunctions.containsFieldAsNumber(req.body,'longitude'))){
       res.status(400).end("Invalid request. Must contain longitude field as a number");
       return;
    }
    else if (!(basicFunctions.containsFieldAsNumber(req.body,'altitude'))){
       res.status(400).end("Invalid request. Must contain altitude field as a number");
       return;
    }
    delete(req.body.id);
    entity_dict[id] = (req.body);
    res.location("/entity/"+id)
    res.status(201).end("Finished");

});

app.get('/entities-around', function (req, res) {

    var input = req.query;
    var MAX_PER_PAGE = 50;
    var entities_in_range_dict = {};
    if (!(basicFunctions.containsFieldAsNumber(input,'latitude'))){
        res.status(400).end("Invalid input. Input must contain latitude as a number.");
        return;
    }
    else if (!(basicFunctions.containsFieldAsNumber(input,'longitude'))){
        res.status(400).end("Invalid input. Input must contain longitude as a number.");
        return;
    }
    else if (!(basicFunctions.containsFieldAsNumber(input,'radius') || parseFloat(input.radius)<0)){
        res.status(400).end("Invalid input. Input must contain non-negtive radius.");
        return;
    }
    entities_in_range_dict = geographicFunctions.getEntitiesInRange(input, entity_dict, MAX_PER_PAGE);  
    res.end(JSON.stringify(entities_in_range_dict))

});

app.get('/entities-in-bearing', function (req, res) {

    var input = req.query;
    var counter = 0;
    var MAX_PER_PAGE = 50;
    var entities_in_range_dict ={};

    if(!(basicFunctions.containsFieldAsNumber(input,'latitude'))){
        res.status(400).end("Invalid input. Input must include latitude as a number.");
        return;
    }
    else if(!(basicFunctions.containsFieldAsNumber(input,'longitude'))){
        res.status(400).end("Invalid input. Input must include longitude as a number.");
        return;
    }
    else if(!(basicFunctions.containsFieldAsNumber(input,'radius')) || parseFloat(input.radius)<0){
        res.status(400).end("Invalid input. Input must include radius as a non-negative number.");
        return;
    }
    else if(!(basicFunctions.containsFieldAsNumber(input,'minBearing'))){
        res.status(400).end("Invalid input. Input must include minBearing as a number.");
        return;
    }
    else if(!(basicFunctions.containsFieldAsNumber(input,'maxBearing'))){
        res.status(400).end("Invalid input. Input must include maxBearing as a number.");
        return;
    }
    if(Math.abs(input.minBearing*1.0 - input.maxBearing*1.0) >= 2*Math.PI){
        entities_in_range_dict = geographicFunctions.getEntitiesInRange(input, entity_dict, MAX_PER_PAGE);
    }
    else{
        var min_bearing = input.minBearing * 1.0;
        var max_bearing = input.maxBearing * 1.0;

        for (var key in entity_dict){
            if(counter == MAX_PER_PAGE){
                break;
            }
            if(geographicFunctions.computeDistance(input, entity_dict[key])<input['radius']*1.0){
                var brng = geographicFunctions.computeBearing(input ,entity_dict[key]);
                if(geographicFunctions.BearingBetweenMinToMax(brng, min_bearing, max_bearing)){
                    counter++;
                    entities_in_range_dict[key] = entity_dict[key];
                }
            }
        }
    }
    res.end(JSON.stringify(entities_in_range_dict));

});

app.get('/closest-entity', function (req, res) {

    var input = req.query;
    var counter = 0;
    var closest_entity_id = undefined;
    
    if(!(('latitude' in input && 'longitude' in input) || 'id' in input)){
        res.status(400).end("Invalid input. Must have latitude and longitude fields or id field.");
        return;
    }
    if(basicFunctions.containsFieldAsNumber(input,'latitude')&& basicFunctions.containsFieldAsNumber(input,'longitude')){
        if('id' in input){
            res.status(400).end("Ambiguous input. Must have latitude and longitude fields or id field, not both.");
            return;
        }
        var closest_entity_id = geographicFunctions.findClosestID(input,entity_dict);
    }
    else if('latitude' in input || "longitude" in input){
        res.status(400).end("Invalid input. Must have both latitude and longitude as numbers.");
        return;
    }

    else if(!(input['id'] in entity_dict)){
        res.status(400).end("Invalid. No entity has id "+input['id']);
        return;
    }
    else{
        closest_entity_id = geographicFunctions.findClosestIDToID(entity_dict, input['id']);
    }
    
    var closest_entity = {};
    closest_entity[closest_entity_id] = entity_dict[closest_entity_id];
    res.end(JSON.stringify(closest_entity));

});

// catch 404 and forward to error handler
app.use(function(req, res, next) {

    next(createError(404));

});

// error handler
app.use(function(err, req, res, next) {

    //set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    //render the error page
    res.status(err.status || 500);
    res.render('error');

});

module.exports = app;
