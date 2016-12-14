var accounts;
var account;
var allProjects = [];

var initUtils = function (web3) {

    // Found here https://gist.github.com/xavierlepretre/88682e871f4ad07be4534ae560692ee6
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

};


function setStatus(message) {
    var status = document.getElementById("status");
    status.innerHTML = message;
};

//Gets and displays available projects in the contract
getListOfProjects = function() {
    FundingHub.deployed().getProjectCount.call()
        .then(function (count) {
            console.log(count.valueOf());
            if (count.valueOf() > 0) {
                for (var i = 0; i < count.valueOf(); i++) {
                    FundingHub.deployed().getProject.call(i)
                        .then(function (values) {
                            allProjects.push({
                                address: values[0],
                                status: values[1]
                            });
                        })
                        .catch(function (e) {
                            console.error(e);
                        });
                }
            }
        });
};

createProject = function(amount, deadline) {
    FundingHub.deployed().createProject(amount, deadline, { from: account, gas: 3000000 })
        .then(function (tx) {
            return web3.eth.getTransactionReceiptMined(tx);
    }).then(function (receipt) {
        setStatus(receipt);

    });
};



function testing() {
  //balance = web3.fromWei(web3.eth.getBalance(account), "ether");
  //console.log(balance.plus(21).toString(10));

  //var fh = FundingHub.deployed();

    createProject(500000, 1640995200);

  /*fh.createProject(500000, 1640995200, { from: account, gas: 3000000 }).then(function (tx) {
      return web3.eth.getTransactionReceiptMined(tx);
  }).then(function (receipt) {
          //console.log(receipt);
      });
*/



    /*fh.getProjectCount.call().then(function(numOfProjects) {
        var totalProjects = [];
        for(i = 0; i < numOfProjects.valueOf(); i++) {
            fh.getProject.call(i).then(function(a){
                totalProjects[i] = {address: a[0], status: a[1]};
                console.log(totalProjects[i]);
            });
        }
    });*/


    /*fh.getProject.call(1).then(function(a, status){
      console.log(a);
      console.log(status);
    });*/


}

/*function refreshBalance() {
  var meta = MetaCoin.deployed();

  meta.getBalance.call(account, {from: account}).then(function(value) {
    var balance_element = document.getElementById("balance");
    balance_element.innerHTML = value.valueOf();
  }).catch(function(e) {
    console.log(e);
    setStatus("Error getting balance; see log.");
  });
};

function sendCoin() {
  var meta = MetaCoin.deployed();

  var amount = parseInt(document.getElementById("amount").value);
  var receiver = document.getElementById("receiver").value;

  setStatus("Initiating transaction... (please wait)");

  meta.sendCoin(receiver, amount, {from: account}).then(function() {
    setStatus("Transaction complete!");
    refreshBalance();
  }).catch(function(e) {
    console.log(e);
    setStatus("Error sending coin; see log.");
  });
};*/

//
window.onload = function() {
    initUtils(web3);
  web3.eth.getAccounts(function(err, accs) {
    if (err != null) {
      alert("There was an error fetching your accounts.");
      return;
    }

    if (accs.length == 0) {
      alert("Couldn't get any accounts! Make sure your Ethereum client is configured correctly.");
      return;
    }

    accounts = accs;
    account = accounts[0];

      //My events
      // I only want to get project created from current user
      var onCreatedProject = FundingHub.deployed().OnCreatedProject({projectOwner: account});

      onCreatedProject.watch(function(error, result) {
          if (!error)
              console.log(result);
      });

      getListOfProjects();
      testing();
  });
}
