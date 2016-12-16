// From Xavier

web3.eth.getTransactionReceiptMined = function (txnHash, interval) {
    var transactionReceiptAsync;
    interval = interval ? interval : 500;
    transactionReceiptAsync = function(txnHash, resolve, reject) {
        try {
            var receipt = web3.eth.getTransactionReceipt(txnHash);
            if (receipt == null) {
                setTimeout(function () {
                    transactionReceiptAsync(txnHash, resolve, reject);
                }, interval);
            } else {
                resolve(receipt);
            }
        } catch(e) {
            reject(e);
        }
    };

    return new Promise(function (resolve, reject) {
        transactionReceiptAsync(txnHash, resolve, reject);
    });
};

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
                return Project.at(e[0][0].args.projectAddress).refund.call({gas: 3000000 })})
            .then(function(success){
                       assert.equal(success, false,"Contract has no balance nor contributors");
                        done();
                    });
        });


    //Create project with deadline in seconds in the future need to use --blocktime=1 in TESTRPC
    //ID 2, to be used in next test
    it("Should be able to be contributed", function(done) {
        var fh = FundingHub.deployed();
        blockNumber = web3.eth.blockNumber;

        fh.createProject(1000, web3.eth.getBlock('latest').timestamp + 5, {gas: 3000000 })
            .then(function(tx) {
                return Promise.all([
                    getEventsPromise(fh.OnCreatedProject({projectOwner: accounts[0]}))
                ]);
            })
            .then(function (e) {
                return Promise.all([
                    //OnContribution(tx.origin, a, false);
                    getEventsPromise(fh.OnContribution({contributor: accounts[0]})),
                    FundingHub.deployed().contribute(e[0][0].args.projectAddress, {from: accounts[0], value: 50,gas:3000000})
                ]);
            })
            .then(function(myPromise) {
                assert.equal(myPromise[0][0].args.result, true, "Can contribute");
                //Some delay here to generate some blocks an be able to expire contract ID 2
                setTimeout(done, 8000);
        });
    });
    //Project created in the last test should be expired by now
    it("Should be able to get refunded", function(done) {
        var fh = FundingHub.deployed();

            fh.getProject.call(2)
                .then(function (values) {
                    //console.log(values[1].valueOf()); //status 1 is refund
                    //console.log('balance: ' + values[2].valueOf()); //dealine
                    //console.log(accounts[0]);
                    //console.log(web3.eth.getBlock('latest').timestamp); //current timestamp
                    return Project.at(values[0]);
                })
                .then(function (activeProject) {
                    return activeProject.refund.call({gas: 3000000 })
                })
                .then(function (success) {
                    assert.equal(success, true, "Was refunded");
                        done();
                });
    });
});
