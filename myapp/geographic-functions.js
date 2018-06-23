
/** @constant
    @type {float}
    @description This constant is a conversion from KM to NM
*/
const KM_TO_NM = 0.539956803;

/** @constant
    @type {number}
    @description This is the radius of earth in meters
*/
const R = 6371e3;

/**
   @param {Object.<string>} entity1 - An entity that has latitude and longitude.
   @param {Object.<string>} entity2 - Another entity that has latitude and longitude.
   @returns {float}
   @description This function gets two entities and computes the distance between them
   using the haversine formula.
*/
var computeDistance = function computeDistance(entity1, entity2){

 //Get the entites latitude and longitudes
 let entity1_latitude = 1.0*entity1['latitude'];
 let entity1_longitude = 1.0*entity1['longitude'];

 let entity2_latitude = 1.0*entity2['latitude'];
 let entity2_longitude = 1.0*entity2['longitude'];

 //We get the difference between the entites latitude and longitude
 let delta_latitude = entity2_latitude-entity1_latitude;
 let delta_longitude = entity2_longitude-entity1_longitude;

 //Now we use the haversine formula to compute the distance
 let a = Math.sin(delta_latitude/2) * Math.sin(delta_latitude/2) +
         Math.cos(entity1_latitude) * Math.cos(entity2_latitude) *
         Math.sin(delta_longitude/2) * Math.sin(delta_longitude/2);
 let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
 let d = (R * c /1000.0)*KM_TO_NM;
 
 return d;

};

/**
   @param {Object.<string>} entity - An entity that has latitude and longitude.
   @param {float} radius - The maximum distance from entity.
   @param {Object.Object.<string>} entities_dict - Dictionary of entities.
   @param {number} page_size - The maximum size of list that we will return
   @returns {Object.Object.<string>} 
   @description This function returns dictionary entities that appear in the entities dictionary.
   The dictionary contains all entities with distance of at most radius from the input Entity.
   If there are more than page_size such entities, we will return a dictionary with page_size entites,
   i.e. it won't contain all the entites that are close to the input entity.
*/
var getEntitiesInRange = function getEntitiesInRange(entity, radius, entities_dict, page_size){

    let counter = 0;
    let entities_in_range = {};
    for (var key in entities_dict){
        if(counter == page_size){
            break;
        }
        if(computeDistance(entity, entities_dict[key])<=radius){
            counter++;
            entities_in_range[key] = entities_dict[key];
        }
    }
    return entities_in_range;
};

/**
   @param {Object.<string>} entity1 - An entity that has latitude and longitude.
   @param {Object.<string>} entity2 - Another entity that has latitude and longitude.
   @returns {float}
   @description This function gets two entities and computes the bearing between them.
*/
var computeBearing = function computeBearing(entity1, entity2){

    //Get the entites latitude and longitudes
    let entity1_latitude = 1.0*entity1['latitude'];
    let entity1_longitude = 1.0*entity1['longitude'];

    let entity2_latitude = 1.0*entity2['latitude'];
    let entity2_longitude = 1.0*entity2['longitude'];
    
    let y = Math.sin(entity2_longitude-entity1_longitude) * Math.cos(entity2_latitude);
    let x = Math.cos(entity1_latitude)*Math.sin(entity2_latitude) -
            Math.sin(entity1_latitude)*Math.cos(entity2_latitude)*Math.cos(entity2_longitude-entity1_longitude);
    
    return Math.atan2(y, x);

};

/**
   @param {float} brng - Bearing.
   @param {float} min - Minimum degree in radian.
   @param {float} max - Maxmimum degree in radians.
   @returns {boolean} 
   @description This function returns whether thr brng is between min and max.
*/
var BearingBetweenMinToMax = function BearingBetweenMinToMax(brng, min, max){
    return (min <= max && (brng >= min && brng <= max))||
           (min >= max && (brng <= min || brng <= max));
};

/**
   @param {Object.<string>} entity - An entity.
   @param {Object.Object.<string>} entity_dict - Dictionary of entities.
   @returns {string} 
   @description This function returns the id of the closest entity from the dict to the given entity.
*/
var findClosestID = function findClosestID(entity, entity_dict){
    
    let min_dist = Infinity;
    let closest_entity_id = null;

    for (let key in entity_dict){
        let dist = computeDistance(entity_dict[key], entity);
        if(dist < min_dist){
            closest_entity_id = key;
            min_dist = dist;
        }
    }
    return closest_entity_id;
};

/**
   @param {string} id - Identification string
   @param {Object.Object.<string>} entities - Dictionary of entities.
   @returns {string} 
   @description This function returns the id of the closest entity from the dict to the entity with the given id.
*/
var findClosestIDToID = function findClosestIDToID (entities, id){
    let input_entity = entities_list[id];
    
    //We delete the entity, since otherwise the closest entity will be the input
    delete(entities[id]);
    
    let closest_entity_id = geographicFunctions.findClosestID(input_entity,entities);
    entities[id] = input_entity; //We put the entity back inside
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