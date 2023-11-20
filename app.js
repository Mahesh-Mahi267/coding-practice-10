const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const app = express();
app.use(express.json());
const databasePath = path.join(__dirname, "covid19IndiaPortal.db");
let database = null;

const initializeDbAndServer = async () => {
try {
database = await open ({
filename:databasePath,
driver:sqlite3.Database,
});

app.listen(3000, () =>
console.log("Server Running at http://localhost:3000/");
);
} catch (error) {
console.log(`DB Error:${error.message}`);
process.exit(1);
}
};

initializeDbAndServer();

const convertStateDbObjectToResponseObject = (dbObject) => {
return {
stateId:dbObject.state_id,
stateName:dbObject.state_name,
population:dbObject.population,
};
};

const convertDistrictDbObjectToResponseObject = (dbObject) => {
return {
districtId:dbObject.district_id,
districtName:dbObject.district_name,
stateId:dbObject.state_id,
cases:dbObject.cases,
cured:dbObject.cured,
active:dbObject.active,
deaths:dbObject.deaths,

};
};

function authenticateToken(request, response, next) {
    let jwtToken;

    let authHeader = request.headers["authorization"];

    if (authHeader !== undefined) {
        jwtToken = authHeader.split(" ")[1];

    }

    if (jwtToken === undefined) {
        response.status(401);
        response.send("Invalid Jwt Token");
    } else {
        jwt.verify(jwtToken, "MY_SECRETE_TOKEN", async (error, payload) =>{
            if(error) {
                response.status(401);
                response.send("Invalid Jwt Token");
            } else {
                next();
            }
        });
    }
}

app.post("/login/", async (request, response) => {
    const {username, password} = request.body;
    const postLoginQuery = `
    SELECT 
    * 
   FROM 
   user 
   WHERE 
   username = '${username}';`;
   const databaseUser = await database.get(postLoginQuery);
   if (databaseUser === undefined) {
       response.status(400);
       response.send("Invalid user");

   } else {
       const isPasswordMatched = await bcrypt.compare(
           password, 
           databaseUser.password
       );

       if (isPasswordMatched) ===true) {
           const payload = {
               username:username,
           };

           const jwtToken = jwt.sign(payload, "MY_SECRETE_TOKEN");
           response.send({jwtToken});
       } else {
           response.status(400);
           response.send("Invalid password");
       }
   }
});


app.get("/states/", authenticateToken,  async (request, response) => {
    const getStatesQuery = `
    SELECT 
    * 
    FROM 
    state;`;
    const statesArray = await database.all(getStatesQuery);
    response.send(statesArray.map((eachState)=>
    convertStateDbObjectToResponseObject(eachState)
    )
    );

});


app.get("/states/:stateId/", authenticateToken, async (request, response) => {
    const {stateId} = request.params;
    const getStatesQuery = `
    SELECT 
    *
    FROM 
    state
    WHERE 
    state_id = ${stateId};`;
    const stateArray = await database.get(getStatesQuery);
    response.send(convertStateDbObjectToResponseObject(state));
});

app.post("/districts/", authenticateToken, async (request, response) => {
    const {districtName, stateId, cases, cured, active, deaths} = request.body;
    const postDistrictsQuery = `
    INSERT INTO 
    district (district_name, state_id, cases, cured, active, deaths)
    VALUES 
    ('${districtName}', ${stateId}, ${cases}, ${cured}, ${active}, ${deaths});`;
    await database.run(postDistrictsQuery);
    response.send("District Successfully Added");
});



app.get("/districts/:districtId/", authenticateToken, async (request, response) => {
    const {districtId} = request.params;
    const getDistrictsQuery = `
    SELECT 
    * 
    FROM 
    district 
    WHERE
    district_id = ${districtId};`;

    const districtsArray = await database.get(getDistrictsQuery);
    response.send(convertDistrictDbObjectToResponseObject(district));

});


app.delete("/districts/:districtId/", authenticateToken, async (request, response) => {
    const {districtId} = request.params;
    const deleteDistrictsQuery = `
    DELETE FROM 
    district 
    WHERE 
    district_id = ${districtId}`;
    await database.run(deleteDistrictsQuery);
    response.send("District Removed");
});



app.put("/districts/:districtId/", authenticateToken, async (request, response ) => {
    const {districtId} = request.params;
    const {districtName, stateId, cases, cured, active, deaths} = request.body;
    const putDistrictsQuery = `
    UPDATE 
    district
    SET 
    district_name = '${districtName}',
    state_id = ${stateId},
    cases = ${cases},
    cured = ${cured},
    active = ${active},
    deaths = ${deaths}
    WHERE 
    district_id = ${districtId};`;
    const DistrictsArray = await database.all(putDistrictsQuery);
    response.send("Districts Details Updated");
});

app.get("/states/:stateId/stats/", authenticateToken, async (request, response)=> {
    const {stateId} = request.params;
    const getStatsQuery = `
    SELECT
    SUM(cases),
    SUM(cured),
    SUM(active),
    SUM(deaths)
    FROM 
    district
    WHERE 
    state_id = ${stateId};`;

    const stats = await database.get(getStatsQuery);
    response.send({
        totalCases: stats["SUM(cases)"],
        totalCured: stats["SUM(cured)"],
        totalActive: stats["SUM(active)"],
        totalDeaths: stats["SUM(deaths)"],
    });

});

module.exports=app;

