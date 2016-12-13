contract Project {
	address fundingHub;

	struct projectInfo{
		address owner;
		uint amountGoalInWei;
		uint deadline;
	}

	projectInfo private pi;

	struct contribution {
	    address contributor;
	    uint amountOfContribution;

	}

	mapping(uint => contribution) private contributionRecord;
	uint private numOfContributions;

	function Project (uint amount, uint deadline) {
	    numOfContributions = 0;
	    fundingHub = msg.sender;
	    pi.owner = tx.origin;
	    pi.amountGoalInWei = amount;
	    pi.deadline = deadline;
	}

	function fund(uint amount)
	    fromFundingHub
	    returns (bool result) {
	    //If contribution is still available
        contribution c = contributionRecord[numOfContributions];
        c.contributor = tx.origin;
        c.amountOfContribution = amount;
	    numOfContributions++;
	    return true;

	}

	function payout() private {

	}

	function refund() private {

    }

	modifier fromFundingHub {
    		if (msg.sender != fundingHub) throw;
    		_
    }

}