var accounts;
var account;

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

function testing() {
  balance = web3.fromWei(web3.eth.getBalance(account), "ether");
  //console.log(balance.plus(21).toString(10));

  var fh = FundingHub.deployed();

  //console.log(fh);

  fh.createProject(500000, 1640995200, { from: account, gas: 3000000 }).then(function (tx) {
      return web3.eth.getTransactionReceiptMined(tx);
  }).then(function (receipt) {
          //console.log(receipt);
      });

    fh.getProject.call(0).then(function(a){
        console.log(a[0]);
        console.log(a[1].valueOf());
    });

    fh.getProjectCount.call().then(function(numOfProjects){
        console.log(numOfProjects.valueOf());
    });

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

    testing();
  });
}
