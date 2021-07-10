
var FlightSuretyApp = artifacts.require("FlightSuretyApp");
var FlightSuretyData = artifacts.require("FlightSuretyData");
var BigNumber = require('bignumber.js');

var Config = async function(accounts) {
    
    // These test addresses are useful when you need to add
    // multiple users in test scripts
    let testAddresses = [
        "0x2779bc82a1af3658f1827adfb163bfc8c5d5205f",
"0x346bda9ebe729d4f7b7df12f501167a929312e79",
"0x4498062614ffc2bfd396c1c6c8d60146986ee779",
 "0x3b065ebb1460d0fe932c261e87b50bbe351b143c",
"0x1bcdc6668f77e8308cabebe11ae52f7b7371ae7f",
"0x96636ec0a0c347c84640d50d49ea91b6c40d0e18",
 "0x38d23813e6a973482d17db1d3f6ea4a24bfc414f", 
"0x2b179d77a69555c07d73e8dbd375ea75ea90e9b4",
"0x65ba2132af984e83134d7f358b47309fccc5093b",
"0x5a2ecb2feb7722a0c89519910a18410fbe2a1ab4"
    ];


    let owner = accounts[0];
    let firstAirline = accounts[1];

    let flightSuretyData = await FlightSuretyData.deployed();
    let flightSuretyApp = await FlightSuretyApp.deployed();


    
    return {
        owner: owner,
        firstAirline: firstAirline,
        weiMultiple: (new BigNumber(10)).pow(18),
        testAddresses: testAddresses,
        flightSuretyData: flightSuretyData,
        flightSuretyApp: flightSuretyApp
    }
}

module.exports = {
    Config: Config
};