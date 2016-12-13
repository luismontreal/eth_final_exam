pragma solidity ^0.4.6;
import "ProjectLib.sol";
import "Project.sol";

contract FundingHub {

    mapping(uint => Project) deployedProjects;
    uint numOfProjects;

    function FundingHub() {

    }

    function createProject(uint amount, uint deadline) returns(address a) {
        deployedProjects[numOfProjects] = new Project(amount, deadline);
        numOfProjects++;
        return deployedProjects[numOfProjects];
    }

    function contribute(address a, uint amount) {
        Project p = Project(a);
        var (result, status) = p.fund(amount);
    }

}