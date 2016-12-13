pragma solidity ^0.4.6;
import "ProjectLib.sol";

contract Project {
    //Tracks the address of the creator contract
	address private fundingHub;
    //Next two are defined from library
	ProjectLib.StatusType private status;
	ProjectLib.projectInfo private pi;

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
	    status = ProjectLib.StatusType.Active;
        //Project info
	    pi.owner = tx.origin;
	    pi.amountGoalInWei = amount;
	    pi.deadline = deadline;
	}

    //Fund function can only be called from fundingHub
	function fund(uint amount)
	    fromFundingHub
	    payable
	    returns (bool result, ProjectLib.StatusType status) {
        //We return false if project is no longer active
	    if (status != ProjectLib.StatusType.Active) {
	        return (false, status);
	    }

	    //We check if it's not in refund status
	    if (getStatus() == ProjectLib.StatusType.Refund) {
	        status = ProjectLib.StatusType.Refund;
	        return (false, status);
	    }

	    //If we made it here is because contribution is still Active
        contributionRecord[tx.origin] = amount;
	    numOfContributions++;

        //Did we achieve the goal in Wei?
	    if(getStatus() == ProjectLib.StatusType.Achieved) {
            status = ProjectLib.StatusType.Achieved;
	    }

        //The contribution was successfully placed
	    return (true, status);
	}

    //It's meant to be a 1 time payout
	function payout()
	    fromOwner
	    returns (bool result) {

	    //If the amount goal hans't been achieved then return false
	    if(getStatus() != ProjectLib.StatusType.Achieved) {
	        return false;
	    }

	    //Set status as already paid
	    status = ProjectLib.StatusType.PaidOut;

	    if (!pi.owner.send(this.balance)) {
	        //payout failed, revert status
            status = ProjectLib.StatusType.Achieved;
            return false;
        }

        return true;
	}

	function refund()
	    returns (bool result) {
	    //Here we can only check if deadline is met, the goal wasn't achieved and we haven't payout
	    if (getStatus() != ProjectLib.StatusType.Refund) {
	        throw;
	    }
        //Persisting status to Refund will ensure to get the right status even after completing refunding
        if (status != ProjectLib.StatusType.Refund) {
	        status = ProjectLib.StatusType.Refund;
        }

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

    //Constant Function so FundingHub can know the status at all time without making a transaction to persist "status"
    //I base the funtion on the Project life cycle
    function getStatus()
            constant
    	    returns (ProjectLib.StatusType status) {
            //If the payout function has been activated then we always return PaidOut
    	    if(status == ProjectLib.StatusType.PaidOut) {
    	        return ProjectLib.StatusType.PaidOut;
    	    }
            //If we haven't payout and the balance surpasses the goal, then the status is always "Achieved", regardless of the deadline
            if(status == ProjectLib.StatusType.Achieved || this.balance >= pi.amountGoalInWei) {
                return ProjectLib.StatusType.Achieved;
            }
            //If we already processed refunds OR
            //deadline is met
            //At this point I know we haven't paid nor achieved the goal
    	    if (status == ProjectLib.StatusType.Refund || pi.deadline <= now) {
                return ProjectLib.StatusType.Refund;
            }
            //Here I know for sure the status is still Active
            return ProjectLib.StatusType.Active;


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