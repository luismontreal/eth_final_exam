pragma solidity ^0.4.6;
import "./Project.sol";

contract FundingHub {
    // Simple mapping to track deployed projects
    mapping(uint => Project) private deployedProjects;
    uint private numOfProjects;

    // Define events for the web page
    event OnCreatedProject(address indexed projectOwner, address indexed projectAddress);
    event OnContribution(address contributor, address projectAddress, bool result);

    function FundingHub() {
        // What do I do here?
    }

    // Deploys a new "Project" and we save the address
    // The transaction originator will be the owner
    function createProject(uint amountGoal, uint deadline) {
        //commenting first check so I can submit projects in the past and test the refund function
        //if (amountGoal > 0  && deadline > now) {
        if(amountGoal > 0) {
            deployedProjects[numOfProjects] = new Project(amountGoal, deadline);
            OnCreatedProject(tx.origin, deployedProjects[numOfProjects]);
            numOfProjects++;
        }
    }
    //Calls Project.fund() which returns whether or not the deposit was successful and its status
    //Only FindingHub can call Project.fund()
    function contribute(address a) payable returns (bool){
        Project p = Project(a);
        //return false if project is no longer active
        if(p.getStatus() != ProjectLib.StatusType.Active) {
            return false;
        }

        var result = p.fund.value(msg.value)();
        OnContribution(tx.origin, a, result);
        return result;
    }

    function getProjectCount()
        constant returns (uint count) {
        return numOfProjects;  
    }

    function getProject(uint id)
        constant
        returns (address, ProjectLib.StatusType, uint, address, uint, uint) {
        Project p = deployedProjects[id];
        return (p, p.getStatus(), p.balance, p.getOwner(), p.getGoal(), p.getDeadline());
    }

}