pragma solidity >=0.4.25;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner;                                      // Account used to deploy contract
    bool private operational = true;                                    // Blocks all state changes throughout the contract if false
    address[]  private registeredAirlines;

    struct Flight {
        bool isRegistered;
        uint8 statusCode;
        uint256 updatedTimestamp;        
        address airline;
        string flight_name;
    }
    struct Airline{
        address airline;
        string airline_name;
        bool isRegistered;
        bool fundsSubmitted;
        uint256 registeredvotes;
    }
    struct Insurance{
        address payable insuree;
        uint256 funds;
    }
    mapping(bytes32 => Flight) private flights;
    mapping(address => Airline) private airlines;
    mapping(address=>bool) private airlineauthorised;
    
    mapping(bytes32=>Insurance[]) private policies;
    mapping(bytes32 => bool) private airlineRegistrationVotes;

    mapping(address => uint256) private credits;
    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/
    event AirlineAdded(address airline);
    event AirlineVoted(address airlinevoter,address airlinevotee);

    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor
                                (
                                ) 
                                public 
    {
        contractOwner = msg.sender;
        airlineauthorised[msg.sender]=true;
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in 
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational() 
    {
        require(operational, "Contract is currently not operational");
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    modifier requireAuthorizedCaller() {
        require(
            airlineauthorised[msg.sender] == true,
            "Requires caller is authorized to call this function");
        _;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */      
    function isOperational() 
                            public 
                            view requireAuthorizedCaller
                            returns(bool)     {
        return operational;
    }

    //Check for airline addition 
     function IsAirlineAdded(
        address airline
    )
        external
        view
        requireAuthorizedCaller
        requireIsOperational
        returns (bool)
    {
        return airlines[airline].airline == airline;
    }
    //Check for airline Registration
    function IsAirlineRegistered(
        address airline
    )
        external
        view
        requireAuthorizedCaller
        requireIsOperational
        returns (bool)
    {
        return airlines[airline].isRegistered;
    }
    function hasAirlineSubmittedFunds(
        address airline
    )
        external
        view
        requireAuthorizedCaller
        requireIsOperational
        returns (bool)
    {
        return airlines[airline].fundsSubmitted == true;
    }

    function hasAirlineVoted(
        address airlinevoter,
        address airlinevotee
    )
        external
        view
        requireAuthorizedCaller
        requireIsOperational
        returns (bool)
    {
        bytes32 voteHash = keccak256(
            abi.encodePacked(airlinevoter, airlinevotee));
        return airlineRegistrationVotes[voteHash] == true;
    }


    //Getting the complete list of airlines
    function getRegisteredAirlines(
    )
        external
        view
        requireAuthorizedCaller
        requireIsOperational
        returns (address[] memory)
    {
        return registeredAirlines;
    }

    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */    
    function setOperatingStatus
                            (
                                bool mode
                            ) 
                            external
                            requireContractOwner 
    {
        operational = mode;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

   /**
    * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    *
    */   

    function authorizeCaller(address caller) external requireContractOwner {
        airlineauthorised[caller] = true;
    }

    function deauthorizeCaller(address caller) external requireContractOwner {
        airlineauthorised[caller] = false;
    } 

    function addAirline(address airline,
        string calldata  airline_name
        ) external
        requireAuthorizedCaller
        requireIsOperational
        {
            airlines[airline] = Airline({
            airline: airline,
            airline_name: airline_name,
            isRegistered: false,
            fundsSubmitted: false,
            registeredvotes:0
            
        });
        emit AirlineAdded(airline);

        }
    function registerAirline
                            (  address  airline
                            )
                            external
                            requireAuthorizedCaller
        requireIsOperational
    {
        airlines[airline].isRegistered = true;
        registeredAirlines.push(airline);
    }

function registerFlight(
        address airline,
        string calldata  flight_name,
        uint256 timestamp
    )
        external
        requireAuthorizedCaller
        requireIsOperational
    {
        flights[getFlightKey(airline, flight_name, timestamp)] = Flight({
            isRegistered: true,
            statusCode: 0, 
            updatedTimestamp: timestamp,
            airline: airline,
            flight_name: flight_name
        });
    }
    

    function AirlineVote(
        address airlinevoter,
        address airlinevotee
    )
        external
        requireAuthorizedCaller
        requireIsOperational
        returns (uint256)
    {
        bytes32 vote = keccak256(
            abi.encodePacked(airlinevoter
            , airlinevotee));
        airlineRegistrationVotes[vote] = true;
        airlines[airlinevotee].registeredvotes += 1;
        emit AirlineVoted(airlinevoter,airlinevotee);

        return airlines[airlinevotee].registeredvotes;
    }



    function AirlinefundsSubmitted(
        address airline
    )
        external
        requireAuthorizedCaller
        requireIsOperational
    {
        airlines[airline].fundsSubmitted = true;
    }

    



   /**
    * @dev Buy insurance for a flight
    *
    */   
   function buyInsurancePolicy(
        address airline,
        string  calldata flight_name,
        address payable _insuree,
        uint256 amount
    )
        external
        requireAuthorizedCaller
        requireIsOperational
    {
        policies[keccak256(abi.encodePacked(airline, flight_name))].push(
            Insurance({
                insuree: _insuree,
                funds: amount
            })
        );
    }
    

    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsurees
                                (
        address airline,
        string calldata flight,
        uint256 creditMultiplier
                                )
                                external
                               requireAuthorizedCaller
        requireIsOperational
    {
         bytes32 policyKey = keccak256(abi.encodePacked(airline, flight));
        Insurance[] memory policiesToCredit = policies[policyKey];

        uint256 currentCredits;
        for (uint i = 0; i < policiesToCredit.length; i++) {
            currentCredits = credits[policiesToCredit[i].insuree];
            // Calculate payout with multiplier and add to existing credits
            uint256 creditsPayout = (
                policiesToCredit[i].funds.mul(creditMultiplier).div(10));
            credits[policiesToCredit[i].insuree] = currentCredits.add(
                creditsPayout);
        }

        delete policies[policyKey];

    }
    

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function payToInsuree
                            (
                                address payable insuree
                            )
                            external
                           requireAuthorizedCaller
                        requireIsOperational
    {
         uint256 creditsAvailable = credits[insuree];
        require(creditsAvailable > 0, "Requires credits are available");
        credits[insuree] = 0;
        insuree.transfer(creditsAvailable);
    }

   /**
    * @dev Initial funding for the insurance. Unless there are too many delayed flights
    *      resulting in insurance payouts, the contract should be self-sustaining
    *
    */   
  

    


    function getFlightKey
                        (
                            address airline,
                            string  memory flight,
                            uint256 timestamp
                        )
                        pure
                        internal
                        returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
    * @dev Fallback function for funding smart contract.
    *
    */
   function () external payable {}
                            
    


}






