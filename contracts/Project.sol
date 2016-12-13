pragma solidity ^0.4.6;

contract Project {
    //Tracks the address of the creator contract
	address private fundingHub;
	//"Active" status can be funded, "Refund" didn't achieve goal in time, can't be funded and refunds are open,
	//"Achieved" means amount goal has been achieved and it's ready to be payed, "PaidOut" means funds have been paid.
	enum StatusType {Active, Refund, Achieved, PaidOut}
	StatusType private status;

    //Defines project info
	struct projectInfo{
		address owner;
		uint amountGoalInWei;
		uint deadline;
	}

	projectInfo private pi;

    //Stores a map of addresses (contributors) to amount contributed
	mapping(address => uint) private contributionRecord;
	//We track the number of contributions
	uint private numOfContributions;

    //Constructor
	function Project (uint amount, uint deadline) {
	    //We init some vars
	    fundingHub = msg.sender;
	    //this is already set to 0 by the compiler but I prefer to see it here
	    numOfContributions = 0;
	    status = StatusType.Active;
        //Project info
	    pi.owner = tx.origin;
	    pi.amountGoalInWei = amount;
	    pi.deadline = deadline;
	}

    //Fund function can only be called from fundingHub
	function fund(uint amount)
	    fromFundingHub
	    payable
	    returns (bool result, StatusType status) {
        //We return false if project is no longer active
	    if (status != StatusType.Active) {
	        return (false, status);
	    }

	    //We check if deadline was met
	    if (pi.deadline <= now) {
	        status = StatusType.Refund;
	        return (false, status);
	    }

	    //If we made it here is because contribution is still available
        contributionRecord[tx.origin] = amount;
	    numOfContributions++;

        //Did we achieve the goal in Wei?
	    if(this.balance >= pi.amountGoalInWei) {
            status = StatusType.Achieved;
	    }

        //The contribution was successfully placed
	    return (true, status);

	}

	function payout()
	    fromOwner
	    returns (bool result) {

	    //If the amount goal hans't been achieved then return false
	    if(status == StatusType.Achieved) {
	        return false;
	    }

	    //Set status as already paid
	    status = StatusType.PaidOut;

	    if (!pi.owner.send(this.balance)) {
	        //payout failed, revert status
            status = StatusType.Achieved;
            return false;
        }

        return true;
	}

	function refund()
	    returns (bool result) {
        //if this address contributed then return its amount
        if(contributionRecord[tx.origin] > 0) {
            var amountToRefund = contributionRecord[tx.origin];
            contributionRecord[tx.origin] = 0;  //We set it as liquidated before paying
            if (!tx.origin.send(amountToRefund)) {
                contributionRecord[tx.origin] = amountToRefund;  //If it failed then restore its amount
                amountToRefund = 0;
                return false;
            }

            return true;
        }

        return false;

    }

    //Defining fallback, contract not meant to receive ether directly, only from fund()
    function() {}

    //We allow fund() to be called only from fundingHub
	modifier fromFundingHub {
    		if (msg.sender != fundingHub) throw;
    		_;
    }

    modifier fromOwner {
        	if (msg.sender != pi.owner) throw;
        	_;
    }

}