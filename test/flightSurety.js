
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');
const Web3 = require('web3')

contract('Flight Surety Tests', async (accounts) => {

  let config;
  let firstAirline;
  before('setup contract', async () => {
    config = await Test.Config(accounts);
    
    firstAirline = config.firstAirline;
  });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

  it(`(multiparty) has correct initial isOperational() value`, async function () {

    // Get operating status
    let status = await config.flightSuretyData.isOperational.call();
    assert.equal(status, true, "Incorrect initial operating status value");

  });

  it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {

      // Ensure that access is denied for non-Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, true, "Access not restricted to Contract Owner");
            
  });

  it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {

      // Ensure that access is allowed for Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false);
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, false, "Access not restricted to Contract Owner");
      
  });

  it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {

      await config.flightSuretyData.setOperatingStatus(false);

      let reverted = false;
      try 
      {
          await config.flightSurety.setTestingMode(true);
      }
      catch(e) {
          reverted = true;
      }
      assert.equal(reverted, true, "Access not blocked for requireIsOperational");      

      // Set it back for other tests to work
      await config.flightSuretyData.setOperatingStatus(true);

  });

  it(`First airline is registered when contract is deployed`, async function () {
    let Registered = (
      await config.flightSuretyData.IsAirlineRegistered.call(config.firstAirline));
    assert.equal( Registered, true, "First airline not registered on deploy");

    let Funded = (
      await config.flightSuretyData.hasAirlineSubmittedFunds.call(
        firstAirline));
    assert.equal(
      Funded, true, "First airline should be funded on deploy");
  });

  it(`Only existing airline may register a new airline until there are at least four airlines registered`, async function () {
    let airlineToRegister = accounts[3];
    let errorThrown=false;

    // Add and fund airline
    await config.flightSuretyData.addAirline(
      accounts[2], "Test Airlines #1");
    await config.flightSuretyApp.submitAirlineRegistrationFund(
      {from: accounts[2],
       value: Web3.utils.toWei('10', "ether"), gasPrice: 0});
    // Attempt to add and register airline from Test Airlines #1
    await config.flightSuretyData.addAirline(
      airlineToRegister, "Test Airlines #2");

    try {
      await config.flightSuretyApp.registerAirline(
        airlineToRegister, {from: accounts[2]});
    } catch (error) {
      errorThrown = true;
    }
   assert.equal(errorThrown,true,"The airline is  authorised to register")
 
    await config.flightSuretyApp.registerAirline(
      airlineToRegister, {from: firstAirline});
    let Registered = (
      await config.flightSuretyData.IsAirlineRegistered.call(
        airlineToRegister));
    assert.equal(
    Registered, true, "Airline not registered");
  });

  it(`Registration of fifth and subsequent airlines requires multi-party consensus of 50% of registered airlines`, async function () {
    await config.flightSuretyData.addAirline(
      accounts[2], "Test Airlines #1");
    await config.flightSuretyApp.registerAirline(
      accounts[2], {from: firstAirline});

    await config.flightSuretyData.addAirline(
      accounts[3], "Test Airlines #2");
    await config.flightSuretyApp.registerAirline(
      accounts[3], {from: firstAirline});

    await config.flightSuretyData.addAirline(
      accounts[4], "Test Airlines #3");
    await config.flightSuretyApp.registerAirline(
      accounts[4], {from: firstAirline});

    unregisteredAirline = accounts[5];
    await config.flightSuretyData.addAirline(
      accounts[5], "Test Airlines #4");

    await config.flightSuretyApp.submitAirlineRegistrationFund(
      {from: unregisteredAirline,
       value: Web3.utils.toWei('10', "ether"), gasPrice: 0});
    let errorThrown=false;
    try {
      await config.flightSuretyApp.registerAirline(
        accounts[5], {from: unregisteredAirline});
    } catch (error) {
      errorThrown = true;
    }
    assert.equal(errorThrown,true,"The fifth airline requires consensus")

    await config.flightSuretyApp.registerAirline(
      accounts[5], {from: firstAirline});

    // Test voting multiple times fails
    errorThrown = false;
    try {
      await config.flightSuretyApp.registerAirline(
        accounts[5], {from: firstAirline});
    } catch (error) {
      errorThrown = true;
    }
    assert.equal(errorThrown,true,"The fifth airline requires consensus")

    await config.flightSuretyApp.submitAirlineRegistrationFund(
      {from: accounts[2],
       value: Web3.utils.toWei('10', "ether"), gasPrice: 0});
    await config.flightSuretyApp.registerAirline(
      accounts[5], {from: accounts[2]});
    await config.flightSuretyApp.submitAirlineRegistrationFund(
      {from: accounts[3],
       value: Web3.utils.toWei('10', "ether"), gasPrice: 0});
    await config.flightSuretyApp.registerAirline(
      accounts[5], {from: accounts[3]});

    // 3/5, 60% of the votes to register the airline have been cast
    let Registered = (
      await config.flightSuretyData.IsAirlineRegistered.call(
        accounts[5]));
    assert.equal(
      Registered, true, "Airline not registered by consensus");
  });

  it(`Airline can be registered, but does not participate in contract until it submits funding of 10 ether`, async function () {
    let errorthrown=false;
    try {
      await config.flightSuretyApp.submitAirlineRegistrationFund(
        {from: accounts[6], value: 9, gasPrice: 0});
    } catch (error) {
      errorthrown = true;
    }
    assert.equal(errorthrown,true,"Funds are greater than 10 something is wrong");
    const balanceBeforeTransaction = await web3.eth.getBalance(firstAirline);
    await config.flightSuretyApp.submitAirlineRegistrationFund(
      {from: accounts[6],
       value: Web3.utils.toWei('10', "ether"), gasPrice: 0});
    const balanceAfterTransaction = await web3.eth.getBalance(firstAirline);
    assert.equal(
      balanceBeforeTransaction - balanceAfterTransaction, 0,
      "Balance before should be 10 ether greater than balance after"
    );

    wasFunded = (
      await config.flightSuretyData.hasAirlineSubmittedFunds.call(
        accounts[6]));
    assert.equal(
      wasFunded, true, "First airline should funded after funding");

   
  });

  it(`Can register and retrieve a flight`, async function () {
    const timestamp = Math.floor(Date.now() / 1000);

    await config.flightSuretyApp.registerFlight(
      firstAirline, 'ABC-DEF-GHI', timestamp);

    let tx = await config.flightSuretyApp.fetchFlightStatus(
      firstAirline, 'ABC-DEF-GHI', timestamp);
    let event = tx.logs[0].event;
    assert.equal(event, 'OracleRequest', 'Invalid event emitted');
  });

  it(`Passengers may pay up to 1 ether for purchasing flight insurance`, async function () {
    const amountToInsure = Web3.utils.toWei('1', "ether");
    const CREDIT_MULTIPLIER = 15;

    const balanceBeforeTransaction = await web3.eth.getBalance(accounts[7]);
    await config.flightSuretyApp.buyInsurance(
      firstAirline, 'ABC-DEF-GHI',
      {from: accounts[7], value: amountToInsure, gasPrice: 0});
    const balanceAfterTransaction = await web3.eth.getBalance(accounts[7]);
    assert.equal(balanceBeforeTransaction - balanceAfterTransaction, Web3.utils.toWei('1', "ether"));

    const timestamp = Math.floor(Date.now() / 1000);
    await config.flightSuretyData.creditInsurees(
      firstAirline, 'ABC-DEF-GHI', CREDIT_MULTIPLIER);
  });

  it(`Passenger can withdraw any funds owed to them as a result of receiving credit for insurance payout`, async function () {
    const amount = Web3.utils.toWei('1.5', "ether");
    const balanceBeforeTransaction = await web3.eth.getBalance(accounts[7]);
    await config.flightSuretyApp.withdrawFunds(
      {from: accounts[7], gasPrice: 0});

    const balanceAfterTransaction = await web3.eth.getBalance(accounts[7]);
    assert.equal(
      balanceAfterTransaction - balanceBeforeTransaction, amount);
  });
});

 











  
  
  