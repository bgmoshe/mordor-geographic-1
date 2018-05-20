KM_TO_NM = 0.539956803;
var computeDistance = function computeDistance(entity1, entity2){

 var entity1_latitude = 1.0*entity1['latitude'];
 var entity1_longitude = 1.0*entity1['longitude'];
 
 var entity2_latitude = 1.0*entity2['latitude'];
 var entity2_longitude = 1.0*entity2['longitude'];
 
 var R = 6371e3; // meters
 var delta_latitude = entity2_latitude-entity1_latitude;
 var delta_longitude = entity2_longitude-entity1_longitude;
 
 var a = Math.sin(delta_latitude/2) * Math.sin(delta_latitude/2) +
     Math.cos(entity1_latitude) * Math.cos(entity2_latitude) *
     Math.sin(delta_longitude/2) * Math.sin(delta_longitude/2);
 var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
 
 var d = (R * c /1000.0)*KM_TO_NM;
 return d;

};

var getEntitiesInRange = function getEntitiesInRange(obj, entities, page_size){

    var counter = 0;
    var entities_in_range = {};
    for (var key in entities){
        if(counter == page_size){
            break;
        }
        if(computeDistance(obj, entities[key])<=obj['radius']*1.0){
            counter++;
            entities_in_range[key] = entities[key];
        }
    }
    return entities_in_range;
};

var computeBearing = function computeBearing(entity1, entity2){

    var entity1_latitude = 1.0*entity1['latitude'];
    var entity1_longitude = 1.0*entity1['longitude'];

    var entity2_latitude = 1.0*entity2['latitude'];
    var entity2_longitude = 1.0*entity2['longitude'];
    
    var y = Math.sin(entity2_longitude-entity1_longitude) * Math.cos(entity2_latitude);
    var x = Math.cos(entity1_latitude)*Math.sin(entity2_latitude) -
            Math.sin(entity1_latitude)*Math.cos(entity2_latitude)*Math.cos(entity2_longitude-entity1_longitude);
    var brng = Math.atan2(y, x);
    return brng;

};

var BearingBetweenMinToMax = function BearingBetweenMinToMax(brng, min, max){
    return (min <= max && (brng >= min && brng <= max))||
           (min >= max && (brng <= min || brng <= max));
};

var findClosestID = function findClosestID(entity, dict){
    
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
};

var findClosestIDToID = function findClosestIDToID (entities, id){
    var input_entity = entities[id];
    delete(entity_dict[id]);
    var closest_entity_id = geographicFunctions.findClosestID(input_entity,entities);
    entity_dict[id] = input_entity;
    return closest_entity_id;
};

var geographicFunctions = {
    computeDistance : computeDistance,
    getEntitiesInRange : getEntitiesInRange,
    computeBearing : computeBearing,
    BearingBetweenMinToMax : BearingBetweenMinToMax,
    findClosestID : findClosestID,
    findClosestIDToID : findClosestIDToID
};

module.exports = geographicFunctions;