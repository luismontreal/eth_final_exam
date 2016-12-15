module.exports = function(deployer) {
    //First Deployed contract will be active for a while (second param is the timestamp)
    FundingHub.deployed().createProject(1000, 1581775271, {gas: 3000000 });
};
