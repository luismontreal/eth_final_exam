contract Project {
    //Tracks the address of the creator contract
	address private fundingHub;
    //Tracks how much has been contributed in Wei
	uint private totalContributed;
	//Active status can be funded, Refund didn't achieve goal in time, can't be funded and refunds are open,
	//Achieved means amount goal has been achieved and it's ready to be payed, PaidOut means funds have been paid.
	enum StatusType {Active, Refund, Achieved, PaidOut}
	StatusType private status;

    //Defines project info
	struct projectInfo{
		address owner;
		uint amountGoalInWei;
		uint deadline;
	}

	projectInfo private pi;

    //Defines a contribution
	struct contribution {
	    uint amountOfContribution;
	    bool isRefunded;
	}
    //Stores a map of addresses (contributors) to contribution defined above
	mapping(address => contribution) private contributionRecord;
	//We track the number of contributions
	uint private numOfContributions;

    //Constructor
	function Project (uint amount, uint deadline) {
	    //We init some vars
	    fundingHub = msg.sender;
	    totalContributed = 0;
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
        contribution c = contributionRecord[tx.origin];
        c.amountOfContribution = amount;
        c.isRefunded = false;
        totalContributed += amount;
	    numOfContributions++;

        //Did we achieve the goal in Wei?
	    if(totalContributed >= pi.amountGoalInWei) {
            status = StatusType.Achieved;
	    }

        //The contribution was successfully placed
	    return (true, status);

	}

	function payout()
	    fromOwner
	    returns (bool result) {

	}

	function refund()
	    returns (bool result) {
        //if it's not a contributor or has been refunded already we only return false
    }

    //We allow fund() to be called only from fundingHub
	modifier fromFundingHub {
    		if (msg.sender != fundingHub) throw;
    		_
    }

    modifier fromOwner {
        	if (msg.sender != pi.owner) throw;
        	_
    }

}