pragma solidity ^0.4.6;
import "ProjectLib.sol";
import "Project.sol";

contract FundingHub {

    mapping(uint => Project) deployedProjects;
    uint numOfProjects;

    // Define events
    event OnCreatedProject(address indexed projectOwner, address indexed projectAddress);
    event OnContribution(address contributor, address projectAddress, bool result, ProjectLib.StatusType status);

    function FundingHub() {

    }

    function createProject(uint amount, uint deadline) {
        deployedProjects[numOfProjects] = new Project(amount, deadline);
        numOfProjects++;
        OnCreatedProject(tx.origin, deployedProjects[numOfProjects]);
    }

    function contribute(address a, uint amount) {
        Project p = Project(a);
        var (result, status) = p.fund(amount);
        OnContribution(tx.origin, a, result, status);
    }

}