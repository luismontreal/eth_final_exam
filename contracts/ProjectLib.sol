pragma solidity ^0.4.6;

//Created this library to better share some common data types
library ProjectLib {

  //Defines project info
  	struct projectInfo {
  		address owner;
  		uint amountGoalInWei;
  		uint deadline;
  	}

  	//"Active" status can be funded, "Refund" didn't achieve goal in time, can't be funded and refunds are open,
    //"Achieved" means amount goal has been achieved and it's ready to be payed, "PaidOut" means funds have been paid.
  	enum StatusType {Active, Refund, Achieved, PaidOut}

}