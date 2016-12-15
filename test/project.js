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

    //I create a project in the past with no balance
    it("Should refund only if address had contributed and there's available balance", function() {
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
                    });
            });

    });
});
