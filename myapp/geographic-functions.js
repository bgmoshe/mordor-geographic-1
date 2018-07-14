
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
function computeDistance(entity1, entity2){

   let delta_latitude = entity2.latitude-entity1.latitude;
   let delta_longitude = entity2.longitude-entity1.longitude;
   
   //Now we use the haversine formula to compute the distance
   let a = Math.sin(delta_latitude/2) * Math.sin(delta_latitude/2) +
           Math.cos(entity1.latitude) * Math.cos(entity2.latitude) *
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
function getEntitiesInRange(entity, radius, entities_dict, page_size){

    let counter = 0;
    let entities_in_range = {};
    for (let key in entities_dict){
        if(counter == page_size) {break;}
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
function computeBearing(entity1, entity2){

    let y = Math.sin(entity2.longitude-entity1.longitude) * Math.cos(entity2.latitude);
    let x = Math.cos(entity1.latitude)*Math.sin(entity2.latitude) -
            Math.sin(entity1.latitude)*Math.cos(entity2.latitude)*Math.cos(entity2.longitude-entity1.longitude);
    
    return Math.atan2(y, x);

};

/**
   @param {float} bearing - Bearing.
   @param {float} min - Minimum degree in radian.
   @param {float} max - Maxmimum degree in radians.
   @returns {boolean} 
   @description This function returns whether thr bearing is between min and max.
*/
function BearingBetweenMinToMax(bearing, min, max){
    return (min <= max && (bearing >= min && bearing <= max))||
           (min >= max && (bearing <= min || bearing <= max));
};

/**
   @param {Object.<string>} entity - An entity.
   @param {Object.Object.<string>} entity_dict - Dictionary of entities.
   @param {string[]} exclude_list - List of ids not allowed to return.
   @returns {string} 
   @description This function returns the id of the closest entity
                from the dict - that is not on the exclude_list.
*/
function findClosestID(entity, entity_dict, exclude_list){
    
    let min_dist = Infinity;
    let closest_entity_id = null;
     
    for (let id in entity_dict){
        if(exclude_list.indexOf(id) >= 0){continue;}
        let dist = computeDistance(entity_dict[id], entity);
        if(dist < min_dist){
           closest_entity_id = id;
           min_dist = dist;
        }
    }
    return closest_entity_id;
};

var geographicFunctions = {
    computeDistance : computeDistance,
    getEntitiesInRange : getEntitiesInRange,
    computeBearing : computeBearing,
    BearingBetweenMinToMax : BearingBetweenMinToMax,
    findClosestID : findClosestID,
};

module.exports = geographicFunctions;