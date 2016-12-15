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
                        return activeProject.refund.call({ from: accounts[1], gas: 3000000 });
                    },
                    3000000);
            });


    });

    /*it("Should refund only on Refund status", function() {
        var fh = FundingHub.deployed();
        //getting my first project which I know is active
        fh.getProject.call(0)
            .then(function (values) {
                return Project.at(values[0]).refund();
            }).then(function (fail) {
                //Status 1 is Refund, see ProjectLib.sol
                assert.equal(fail, 1, "Project Must start at Active Status");
        });*/

        /*return meta.getBalance.call(accounts[0]).then(function(balance) {
            assert.equal(balance.valueOf(), 10000, "10000 wasn't in the first account");
        });
    });*/




    /*it("should call a function that depends on a linked library  ", function(){
        var meta = MetaCoin.deployed();
        var metaCoinBalance;
        var metaCoinEthBalance;

        return meta.getBalance.call(accounts[0]).then(function(outCoinBalance){
            metaCoinBalance = outCoinBalance.toNumber();
            return meta.getBalanceInEth.call(accounts[0]);
        }).then(function(outCoinBalanceEth){
            metaCoinEthBalance = outCoinBalanceEth.toNumber();

        }).then(function(){
            assert.equal(metaCoinEthBalance,2*metaCoinBalance,"Library function returned unexpeced function, linkage may be broken");

        });
    });
    it("should send coin correctly", function() {
        var meta = MetaCoin.deployed();

        // Get initial balances of first and second account.
        var account_one = accounts[0];
        var account_two = accounts[1];

        var account_one_starting_balance;
        var account_two_starting_balance;
        var account_one_ending_balance;
        var account_two_ending_balance;

        var amount = 10;

        return meta.getBalance.call(account_one).then(function(balance) {
            account_one_starting_balance = balance.toNumber();
            return meta.getBalance.call(account_two);
        }).then(function(balance) {
            account_two_starting_balance = balance.toNumber();
            return meta.sendCoin(account_two, amount, {from: account_one});
        }).then(function() {
            return meta.getBalance.call(account_one);
        }).then(function(balance) {
            account_one_ending_balance = balance.toNumber();
            return meta.getBalance.call(account_two);
        }).then(function(balance) {
            account_two_ending_balance = balance.toNumber();

            assert.equal(account_one_ending_balance, account_one_starting_balance - amount, "Amount wasn't correctly taken from the sender");
            assert.equal(account_two_ending_balance, account_two_starting_balance + amount, "Amount wasn't correctly sent to the receiver");
        });
    });*/
});
