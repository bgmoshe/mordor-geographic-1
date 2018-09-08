'use strict';

//Environment variables
process.env.NODE_ENV = 'test';

//Imports
const app  = require('../app');
const chai = require('chai');
const httpStatus = require('http-status-codes');
const http = require( 'http' );

//Renames
const should = chai.should();
const expect = chai.expect;

//Chai uses
chai.use(require('chai-http'));
chai.use(require('chai-like'));

//Constants
const PORT = 3000; //Testing port
const SERVER = "http://localhost:"+PORT;
const entities =[
{id: "1", latitude: "0.00", longitude: "0.00", altitude: "0"},
{id: "2", latitude: "1.00", longitude: "0.00", altitude: "0"},
{id: "3", latitude: "2.00", longitude: "0.00", altitude: "0"},
{id: "4", latitude: "3.00", longitude: "0.00", altitude: "0"},
{id: "5", latitude: "1.00", longitude: "1.00", altitude: "0"},
{id: "Mordor", latitude: "2.00", longitude: "2.00", altitude: "0"},
{id: "MaaV11!", latitude: "3.00", longitude: "3.00", altitude: "0"}
];
const new_field = {"BBBBB":"F15I"}
const not_existent_entity_id = 0;

//Functions
const postEntityRouteSuccessCheck = function(res, entity){
    res.should.have.status(httpStatus.CREATED);
    const http_response_location = res.headers.location;
    expect(http_response_location).to.equal("/entity/"+entity.id);
}

const getEntityRouteSuccessCheck = function(res, entity){
    res.should.have.status(httpStatus.OK);
    expect(res.header['content-type']).to.equal("application/json; charset=utf-8");
    expect(res.body).to.deep.equal(entity);
}

const updateEntitySuccessCheck = function(res, entity){
    let http_response_location = res.headers.location;
    let id = entity.id;
    res.should.have.status(httpStatus.OK);
    expect(http_response_location).to.equal("/entity/"+id);
    chai.request(SERVER)
    .get("/entity/"+id)
    .end(function(err, res){
        for (let key in new_field){
            expect(res.body[key]).to.equal(new_field[key]);
            entity[key] = new_field[key];
        }
    });
}

const checkSuccessfullDelete = function (res, id){
    res.should.have.status(httpStatus.NO_CONTENT);
    expect(chai.request(SERVER).get("/entities").body)
    .should.not.have.property(id);
}

const postBadEntityRouteCheck = function(res, http_status){
    res.should.have.status(http_status);
}



// Tests
describe("First suite - testing initializations", function(){
   it("Testing entity dictionary intialization - should be empty", function (done) {
       chai.request(SERVER)
       .get("/entities")
       .end(function(err, res) {
           res.should.have.status(httpStatus.OK);
           res.body.should.be.a('object');
           res.body.should.eql({});
           done();
       })
   });
}); 

describe("Testing posting entities", function(){
    for (let index = 0; index<entities.length; index++){
        let current_entity = entities[index];
        it("Posting new entity with id = "+entities[index].id+". Should return CREATED http status.", function (done) {
            chai.request(SERVER)
            .post("/entity")
            .set('content-type', 'application/json')
            .send(current_entity)
            .end(function(err, res) {
                postEntityRouteSuccessCheck(res, current_entity);
                done();
            })
        });
    }

    it("Updating first entity", function (done) {
        let entity = entities[0];
        chai.request(SERVER)
        .post("/entity/"+entity.id)
        .set('content-type', 'application/json')
        .send(new_field)
        .end(function(err, res) {
            updateEntitySuccessCheck(res, entity);
            done();
        })
    });

});

describe("Testing getting entities", function(){
    for (let index = 0; index<entities.length; index++){
        let current_entity = entities[index];
        it("Getting entity with id = "+entities[index].id+". Should return OK http status.", function (done) {
            chai.request(SERVER)
            .get("/entity/"+current_entity.id)
            .end(function(err, res) {
                let entity_without_id = JSON.parse(JSON.stringify(current_entity));
                delete(entity_without_id.id);
                getEntityRouteSuccessCheck(res, entity_without_id);
                done();
            })
        });
    }
});

//describe("Geographical utilities", function(){
//}

describe("Testing inavlid inputs for /entity POST route", function(){
    it("Posting new entity with already existent id. Should return CONFLICT http status.", function (done) {
        chai.request(SERVER)
        .post("/entity")
        .set('content-type', 'application/json')
        .send({id:"1", latitude: "0.00", longitude: "0.00", altitude: "0"})
        .end(function(err, res) {
            postBadEntityRouteCheck(res, httpStatus.CONFLICT);
            done();
        })
    });
    
    it("Posting new entity with no id. Should return BAD http status.", function (done) {
        chai.request(SERVER)
        .post("/entity")
        .set('content-type', 'application/json')
        .send({latitude: "0.00", longitude: "0.00", altitude: "0"})
        .end(function(err, res) {
            postBadEntityRouteCheck(res, httpStatus.BAD_REQUEST);
            done();
        })
    });
    
    it("Posting new entity with no latitude. Should return BAD http status.", function (done) {
        chai.request(SERVER)
        .post("/entity")
        .set('content-type', 'application/json')
        .send({id:"A", longitude: "0.00", altitude: "0"})
        .end(function(err, res) {
            postBadEntityRouteCheck(res, httpStatus.BAD_REQUEST);
            done();
        })
    });
   
    it("Posting new entity with no longitude. Should return BAD http status.", function (done) {
        chai.request(SERVER)
        .post("/entity")
        .set('content-type', 'application/json')
        .send({id:"A", latitude: "0.00", altitude: "0"})
        .end(function(err, res) {
            postBadEntityRouteCheck(res, httpStatus.BAD_REQUEST);
            done();
        })
    });
    
    it("Posting new entity with no altitude. Should return BAD http status.", function (done) {
        chai.request(SERVER)
        .post("/entity")
        .set('content-type', 'application/json')
        .send({id:"A", latitude: "0.00", longitude: "0.00"})
        .end(function(err, res) {
            postBadEntityRouteCheck(res, httpStatus.BAD_REQUEST);
            done();
        })
    });
});

describe("Testing inavlid inputs for /entity/:id GET route", function(){    
    it("Getting unexistent entity.", function (done) {
        chai.request(SERVER)
        .get("/entity/"+not_existent_entity_id)
        .end(function(err, res) {
            res.should.have.status(httpStatus.NOT_FOUND);
            done();
        })
    });
});

describe("Testing inavlid inputs for /entity/:id POST route", function(){    
    it("Updating unexistent entity.", function (done) {
        chai.request(SERVER)
        .post("/entity/"+not_existent_entity_id)
        .set('content-type', 'application/json')
        .send({})
        .end(function(err, res) {
            res.should.have.status(httpStatus.NOT_FOUND);
            done();
        })
    });
});

describe("Testing inavlid inputs for /entity/:id DELETE route", function(){    
    it("Deleting unexistent entity.", function (done) {
        chai.request(SERVER)
        .delete("/entity/"+not_existent_entity_id)
        .end(function(err, res) {
            res.should.have.status(httpStatus.NOT_FOUND);
            done();
        })
    });
});

describe("Testing inavlid inputs for /entities-around GET route", function(){

    it("Sending entities-around an entity with invalid latitude. Should return BAD http request.", function (done) {
        chai.request(SERVER)
        .get("/entities-around")
        .query({latitude:'BBB', longitude:'0.00', radius:'0'})
        .end(function(err, res) {
            res.should.have.status(httpStatus.BAD_REQUEST);
            done();
        })
    });
    
    it("Sending entities-around an entity with invalid longitude. Should return BAD http request.", function (done) {
        chai.request(SERVER)
        .get("/entities-around")
        .query({latitude:'0.00', longitude:'BBB', radius:'0.00'})
        .end(function(err, res) {
            res.should.have.status(httpStatus.BAD_REQUEST);
            done();
        })
    });
    
    it("Sending entities-around an entity with invalid radius. Should return BAD http request.", function (done) {
        chai.request(SERVER)
        .get("/entities-around")
        .query({latitude:'0.00', longitude:'0.00', radius:'BBB'})
        .end(function(err, res) {
            res.should.have.status(httpStatus.BAD_REQUEST);
            done();
        })
    });
    
    it("Sending entities-around an entity with negative radius. Should return BAD http request.", function (done) {
        chai.request(SERVER)
        .get("/entities-around")
        .query({latitude:'0.00', longitude:'0.00', radius:'-5'})
        .end(function(err, res) {
            res.should.have.status(httpStatus.BAD_REQUEST);
            done();
        })
    });
        it("Sending entities-around an entity with without latitude. Should return BAD http request.", function (done) {
        chai.request(SERVER)
        .get("/entities-around")
        .query({latitude:'0.00', radius:'0.00'})
        .end(function(err, res) {
            res.should.have.status(httpStatus.BAD_REQUEST);
            done();
        })
    });
    
    it("Sending entities-around around an entity with without longitude. Should return BAD http request.", function (done) {
        chai.request(SERVER)
        .get("/entities-around")
        .query({latitude:'0.00', radius:'0'})
        .end(function(err, res) {
            res.should.have.status(httpStatus.BAD_REQUEST);
            done();
        })
    });
    
    it("Sending entities-around an entity without radius. Should return BAD http request.", function (done) {
        chai.request(SERVER)
        .get("/entities-around")
        .query({latitude:'0.00', longitude:'0.00'})
        .end(function(err, res) {
            res.should.have.status(httpStatus.BAD_REQUEST);
            done();
        })
    });
});

describe("Testing inavlid inputs for /entities-in_bearing GET route", function(){
    
    it("Sending entities-in-bearing an entity with invalid latitude. Should return BAD http request.", function (done) {
        chai.request(SERVER)
        .get("/entities-in-bearing")
        .query({latitude:'BBB', longitude:'0.00', radius:'0.00', minBearing:'0.00', maxBearing:'0.00'})
        .end(function(err, res) {
            res.should.have.status(httpStatus.BAD_REQUEST);
            done();
        })
    });

    it("Sending entities-in-bearing an entity with invalid longitude. Should return BAD http request.", function (done) {
        chai.request(SERVER)
        .get("/entities-in-bearing")
        .query({latitude:'0.00', longitude:'BBB', radius:'0.00', minBearing:'0.00', maxBearing:'0.00'})
        .end(function(err, res) {
            res.should.have.status(httpStatus.BAD_REQUEST);
            done();
        })
    });

    it("Getting entity around an entity with invalid radius. Should return BAD http request.", function (done) {
        chai.request(SERVER)
        .get("/entities-in-bearing")
        .query({latitude:'0.00', longitude:'0.00', radius:'BBB', minBearing:'0.00', maxBearing:'0.00'})
        .end(function(err, res) {
            res.should.have.status(httpStatus.BAD_REQUEST);
            done();
        })
    });

    it("Getting entity around an entity with negative radius. Should return BAD http request.", function (done) {
        chai.request(SERVER)
        .get("/entities-in-bearing")
        .query({latitude:'0.00', longitude:'0.00', radius:'-5', minBearing:'0.00', maxBearing:'0.00'})
        .end(function(err, res) {
            res.should.have.status(httpStatus.BAD_REQUEST);
            done();
        })
    });

    it("Sending entities-in-bearing an entity with invalid minimum bearing. Should return BAD http request.", function (done) {
        chai.request(SERVER)
        .get("/entities-in-bearing")
        .query({latitude:'0.00', longitude:'0.00', radius:'0.00', minBearing:'BBB', maxBearing: '0.00'})
        .end(function(err, res) {
            res.should.have.status(httpStatus.BAD_REQUEST);
            done();
        })
    });

    it("Sending entities-in-bearing an entity with invalid maximum bearing. Should return BAD http request.", function (done) {
        chai.request(SERVER)
        .get("/entities-in-bearing")
        .query({latitude:'0.00', longitude:'0.00', radius:'0.00', minBearing:'0.00', maxBearing:'BBB'})
        .end(function(err, res) {
            res.should.have.status(httpStatus.BAD_REQUEST);
            done();
        })
    });

    it("Sending entities-in-bearing an entity without latitude. Should return BAD http request.", function (done) {
        chai.request(SERVER)
        .get("/entities-in-bearing")
        .query({longitude:'0.00', radius:'0.00', minBearing:'0.00', maxBearing:'0.00'})
        .end(function(err, res) {
            res.should.have.status(httpStatus.BAD_REQUEST);
            done();
        })
    });
    
    it("Sending entities-in-bearing an entity without longitude. Should return BAD http request.", function (done) {
        chai.request(SERVER)
        .get("/entities-in-bearing")
        .query({latitude:'0.00', radius:'0.00', minBearing:'0.00', maxBearing:'0.00'})
        .end(function(err, res) {
            res.should.have.status(httpStatus.BAD_REQUEST);
            done();
        })
    });

    it("Getting entity around an entity without radius. Should return BAD http request.", function (done) {
        chai.request(SERVER)
        .get("/entities-in-bearing")
        .query({latitude:'0.00', longitude:'0.00', minBearing:'0.00', maxBearing:'0.00'})
        .end(function(err, res) {
            res.should.have.status(httpStatus.BAD_REQUEST);
            done();
        })
    });
    
    it("Sending entities-in-bearing an entity without minimum bearing. Should return BAD http request.", function (done) {
        chai.request(SERVER)
        .get("/entities-in-bearing")
        .query({latitude:'0.00', longitude:'0.00', radius:'0.00', maxBearing: '0.00'})
        .end(function(err, res) {
            res.should.have.status(httpStatus.BAD_REQUEST);
            done();
        })
    });
    
    it("Sending entities-in-bearing an entity without maximum bearing. Should return BAD http request.", function (done) {
        chai.request(SERVER)
        .get("/entities-in-bearing")
        .query({latitude:'0.00', longitude:'0.00', radius:'0.00', minBearing:'0.00'})
        .end(function(err, res) {
            res.should.have.status(httpStatus.BAD_REQUEST);
            done();
        })
    });
});

describe("Testing inavlid inputs for /closest-entity GET route", function(){
    it("Getting closest entity with inavlid latitude.", function (done) {
        chai.request(SERVER)
        .get("/closest-entity")
        .query({latitude: 'BBB', longitude: '0.00'})
        .end(function(err, res) {
            res.should.have.status(httpStatus.BAD_REQUEST);
            done();
        })
    });

    it("Getting closest entity with inavlid latitude.", function (done) {
        chai.request(SERVER)
        .get("/closest-entity")
        .query({latitude: '0.00', longitude: 'BBB'})
        .end(function(err, res) {
            res.should.have.status(httpStatus.BAD_REQUEST);
            done();
        })
    });
        
    it("Getting closest entity without specifing longitude.", function (done) {
        chai.request(SERVER)
        .get("/closest-entity")
        .query({latitude: '0.00'})
        .end(function(err, res) {
            res.should.have.status(httpStatus.BAD_REQUEST);
            res.body.should.eql({});
            done();
        })
    });
        
    it("Getting closest entity without specifing latitude.", function (done) {
        chai.request(SERVER)
        .get("/closest-entity")
        .query({longitude: '0.00'})
        .end(function(err, res) {
            res.should.have.status(httpStatus.BAD_REQUEST);
            res.body.should.eql({});
            done();
        })
    });
        
    it("Getting entity closest entity with invalid id.", function (done) {
        chai.request(SERVER)
        .get("/closest-entity")
        .query({id: 'Hogwarts'})
        .end(function(err, res) {
            res.should.have.status(httpStatus.NOT_FOUND);
            res.body.should.eql({});
            done();
        })
    });
    
    it("Getting entity closest entity - entering id and geographical location.", function (done) {
        chai.request(SERVER)
        .get("/closest-entity")
        .query({id: 'Hogwarts', longitude: '0.00', latitude: '0.00'})
        .end(function(err, res) {
            res.should.have.status(httpStatus.BAD_REQUEST);
            res.body.should.eql({});
            done();
        })
    });
});

describe("Deletion suite - we delete all the entites",function(){
    
    it("Deleting entity with id=1", function (done) {
        chai.request(SERVER)
        .delete("/entity/1")
        .end(function(err, res) {
            checkSuccessfullDelete(res, "1");
            done();
        })
    });
   
    it("Deleting entity with id=2", function (done) {
        chai.request(SERVER)
        .delete("/entity/2")
        .end(function(err, res) {
            checkSuccessfullDelete(res, "2");
            done();
        })
    });
    
    it("Deleting entity with id=3", function (done) {
        chai.request(SERVER)
        .delete("/entity/3")
        .end(function(err, res) {
            checkSuccessfullDelete(res, "3");
            done();
        })
    });

    it("Deleting entity with id=4", function (done) {
        chai.request(SERVER)
        .delete("/entity/4")
        .end(function(err, res) {
            checkSuccessfullDelete(res, "4");
            done();
        })
        
    });    it("Deleting entity with id=5", function (done) {
        chai.request(SERVER)
        .delete("/entity/5")
        .end(function(err, res) {
            checkSuccessfullDelete(res, "5");
            done();
        })
    });

    it("Deleting entity with id=Mordor", function (done) {
        chai.request(SERVER)
        .delete("/entity/Mordor")
        .end(function(err, res) {
            checkSuccessfullDelete(res, "Mordor");
            done();
        })
    });

    it("Deleting entity with id=MaaV11!", function (done) {
        chai.request(SERVER)
        .delete("/entity/MaaV11!")
        .end(function(err, res) {
            checkSuccessfullDelete(res, "MaaV11!");
            done();
        })
    });
});