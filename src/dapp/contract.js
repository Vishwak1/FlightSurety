import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';

export default class Contract {
    constructor(network, callback) {

        let config = Config[network];
        this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
        this.initialize(callback);
        this.owner = null;
        this.airlines = [];
        this.passengers = [];
        console.log(this.flightSuretyApp)
    }

    /*initialize() {

        this.web3.eth.getAccounts().then((acc)=>{ 
            console.log(acc);
         
           
            this.owner = acc[0];
           
            let counter = 1;
            
            while(this.airlines.length < 5) {
                this.airlines.push(acc[counter++]);
            }

            while(this.passengers.length < 5) {
                this.passengers.push(acc[counter++]);
            }

            
        });
    }*/
    initialize(callback) {
        this.web3.eth.getAccounts((error, accts) => {
           console.log(accts)
            this.owner = accts[0];
            this.firstAirline = accts[1];

            callback();
        });
    }

    isOperational(callback) {
       let self = this;
       self.flightSuretyApp.methods
            .isOperational()
            .call({ from: self.owner}, callback);
    }

    fetchFlightStatus(flight, callback) {
        let self = this;
        let payload = {
            airline: self.airlines[0],
            flight: flight,
            timestamp: Math.floor(Date.now() / 1000)
        } 
        self.flightSuretyApp.methods
            .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
            .send({ from: self.owner}, (error, result) => {
                callback(error, payload);
            });
    }


    buyInsurance(flight, insuranceValue, callback) {
        let self = this;
        
        self.flightSuretyApp.methods
            .buyInsurance(self.airlines[0], flight)
            .send({from: self.owner, value: this.web3.utils.toWei(insuranceValue, "ether"), gas: 9999999}, (error, result) => {
                callback(error, result);
            });
    }

    withdrawFunds(callback) {
        let self = this;
        self.flightSuretyApp.methods
            .withdrawFunds()
            .send({ from: self.owner, gas: 9999999}, (error, result) => {
                callback(error, result);
            });
    }
}