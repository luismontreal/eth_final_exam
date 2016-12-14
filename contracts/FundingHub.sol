pragma solidity ^0.4.6;
import "Project.sol";

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
    function createProject(uint amountGoal, uint deadline) {
        deployedProjects[numOfProjects] = new Project(amountGoal, deadline);
        numOfProjects++;
        OnCreatedProject(tx.origin, deployedProjects[numOfProjects]);
    }
    //Calls Project.fund() which returns whether or not the deposit was succeful and its status
    //Only FindingHub can call Project.fund()
    function contribute(address a) payable {
        Project p = Project(a);
        var result = p.fund.value(msg.value)();
        OnContribution(tx.origin, a, result);
    }

}