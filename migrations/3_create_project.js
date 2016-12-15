module.exports = function(deployer) {
    FundingHub.deployed().createProject(1000, 1581775271, {gas: 3000000 });
};
