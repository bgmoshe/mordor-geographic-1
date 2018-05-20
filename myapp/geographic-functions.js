const KM_TO_NM = 0.539956803;
var computeDistance = function computeDistance(entity1, entity2){

 let entity1_latitude = 1.0*entity1['latitude'];
 let entity1_longitude = 1.0*entity1['longitude'];

 let entity2_latitude = 1.0*entity2['latitude'];
 let entity2_longitude = 1.0*entity2['longitude'];

 let R = 6371e3; // meters
 let delta_latitude = entity2_latitude-entity1_latitude;
 let delta_longitude = entity2_longitude-entity1_longitude;

 let a = Math.sin(delta_latitude/2) * Math.sin(delta_latitude/2) +
        Math.cos(entity1_latitude) * Math.cos(entity2_latitude) *
        Math.sin(delta_longitude/2) * Math.sin(delta_longitude/2);
 let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
 
 let d = (R * c /1000.0)*KM_TO_NM;
 return d;

};

var getEntitiesInRange = function getEntitiesInRange(obj, entities, page_size){

    let counter = 0;
    let entities_in_range = {};
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

    let entity1_latitude = 1.0*entity1['latitude'];
    let entity1_longitude = 1.0*entity1['longitude'];

    let entity2_latitude = 1.0*entity2['latitude'];
    let entity2_longitude = 1.0*entity2['longitude'];
    
    let y = Math.sin(entity2_longitude-entity1_longitude) * Math.cos(entity2_latitude);
    let x = Math.cos(entity1_latitude)*Math.sin(entity2_latitude) -
            Math.sin(entity1_latitude)*Math.cos(entity2_latitude)*Math.cos(entity2_longitude-entity1_longitude);
    
    return Math.atan2(y, x);

};

var BearingBetweenMinToMax = function BearingBetweenMinToMax(brng, min, max){
    return (min <= max && (brng >= min && brng <= max))||
           (min >= max && (brng <= min || brng <= max));
};

var findClosestID = function findClosestID(entity, dict){
    
    let min_dist = Infinity;
    let closest_entity_id = null;

    for (let key in dict){
        let dist = computeDistance(dict[key], entity);
        if(dist < min_dist){
            closest_entity_id = key;
            min_dist = dist;
        }
    }
    return closest_entity_id;
};

var findClosestIDToID = function findClosestIDToID (entities, id){
    let input_entity = entities[id];
    delete(entity_dict[id]);
    let closest_entity_id = geographicFunctions.findClosestID(input_entity,entities);
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