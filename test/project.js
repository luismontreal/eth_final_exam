// From Xavier
var getEventsPromise = function (myFilter, count) {
    return new Promise(function (resolve, reject) {
        count = count ? count : 1;
        var results = [];
        myFilter.watch(function (error, result) {
            if (error) {
                reject(error);
            } else {
                count--;
                results.push(result);
            }
            if (count <= 0) {
                resolve(results);
                myFilter.stopWatching();
            }
        });
    });
};


var expectedExceptionPromise = function (action, gasToUse) {
    return new Promise(function (resolve, reject) {
        try {
            resolve(action());
        } catch(e) {
            reject(e);
        }
    })
        .then(function (txn) {
            return web3.eth.getTransactionReceiptMined(txn);
        })
        .then(function (receipt) {
            // We are in Geth
            assert.equal(receipt.gasUsed, gasToUse, "should have used all the gas");
        })
        .catch(function (e) {
            if ((e + "").indexOf("invalid JUMP") > -1) {
                // We are in TestRPC
            } else {
                throw e;
            }
        });
};

//I get the project deployed in 3_create_project, which I know is active
contract('Project', function(accounts) {
    it("Should fail when project is not in Refund status", function() {
        var fh = FundingHub.deployed();

        fh.getProject.call(0)
            .then(function (values) {
                return Project.at(values[0]);
            }).then(function (activeProject) {
                    return expectedExceptionPromise(function () {
                        return activeProject.refund.call({ from: accounts[0], gas: 3000000 });
                    },
                    3000000);
            });


    });

    //I create a project in the past with no balance, ID 1
    it("Should fail id sender hasn't contributed or there's no balance", function(done) {
        var fh = FundingHub.deployed();
        blockNumber = web3.eth.blockNumber + 1;
        //Creating project in the past (to test refund), this is ID 1
        fh.createProject(1000, 1, {gas: 3000000 }).then(function() {
            return Promise.all([
                getEventsPromise(fh.OnCreatedProject({projectOwner: accounts[0]}))
            ]);
        })
            .then(function (e){
                return Project.at(e[0][0].args.projectAddress).refund.call()
                    .then(function(success){
                       assert.equal(success, false,"Contract has no balance nor contributors");
                        done();
                    });
            });

    });

    //Create project for a short period of time, and contribute to it so we can test refunds in the last one
    //ID 2, to be used in next test
    it("Should be able contribute", function(done) {
        var fh = FundingHub.deployed();
        blockNumber = web3.eth.blockNumber;
        console.log(web3.eth.getBlock('latest').timestamp + 4);

        fh.createProject(1000, web3.eth.getBlock('latest').timestamp + 15, {gas: 3000000 })
            .then(function(tx) {
                return Promise.all([
                    getEventsPromise(fh.OnCreatedProject({projectOwner: accounts[0]}))
                ]);
            })
            .then(function (e) {
                 return FundingHub.deployed().contribute.call(e[0][0].args.projectAddress, {from: accounts[0], value: 50,gas:3000000})
            })
            .then(function(success) {
                assert.equal(success, true, "Can contribute");
        });
    });

    it("Should be able to get refunded", function(done) {
        var fh = FundingHub.deployed();
        console.log(web3.eth.getBlock('latest').timestamp);
        //console.log(Math.round(new Date().getTime()/1000));

        fh.getProject.call(1)
            .then(function (values) {
                return Project.at(values[0]);
            }).then(function (activeProject) {
            return activeProject.refund.call()
                .then(function(success){
                    assert.equal(success, true,"Was refunded");
                    //Wait some time before next test
                    setTimeout(done, 60000);
                });
        });


    });
});
