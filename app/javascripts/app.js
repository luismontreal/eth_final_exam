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
            //console.log(count.valueOf());
            var theTable = document.getElementById('table');

            if (count.valueOf() > 0) {
                for (var i = 0; i < count.valueOf(); i++) {
                    FundingHub.deployed().getProject.call(i)
                        .then(function (values) {
                            allProjects.push ({
                                address: values[0],
                                status: values[1],
                                balance: values[2],
                                owner: values[3],
                                goal: values[4],
                                deadline: values[5],
                            });

                            if (values[1].valueOf() == 0) {
                                statusString = "Active";
                            } else if (values[1].valueOf() == 1) {
                                statusString = "Refunding";
                            } else if (values[1].valueOf() == 2) {
                                statusString = "Achieved";
                            } else {
                                statusString = "Paid Out";
                            }

                            tr = document.createElement('tr');
                            td = document.createElement('td');
                            td2 = document.createElement('td');
                            td3 = document.createElement('td');
                            td4 = document.createElement('td');
                            td5 = document.createElement('td');
                            td6 = document.createElement('td');
                            td.appendChild(document.createTextNode(values[0]));
                            td2.appendChild(document.createTextNode(statusString));
                            td3.appendChild(document.createTextNode(values[2]));
                            td4.appendChild(document.createTextNode(values[3]));
                            td5.appendChild(document.createTextNode(values[4]));
                            td6.appendChild(document.createTextNode(values[5]));
                            tr.appendChild(td);
                            tr.appendChild(td2);
                            tr.appendChild(td3);
                            tr.appendChild(td4);
                            tr.appendChild(td5);
                            tr.appendChild(td6);
                            theTable.appendChild(tr);

                        })
                        .catch(function (e) {
                            console.error(e);
                        });
                }
            }
        })
};

createProject = function(amount, deadline) {
    //I'm aware that getting timestamp from JS is a bad idea
    deadlineTimeStamp = Math.floor((new Date()).getTime() / 1000) + (86400 * deadline);
    FundingHub.deployed().createProject(amount, deadlineTimeStamp, { from: account, gas: 3000000 })
        .then(function (tx) {
            return web3.eth.getTransactionReceiptMined(tx);
    }).then(function (receipt) {
        setStatus('Transaction Hash:' + receipt.transactionHash);
        filter = web3.eth.filter("pending");
        var onCreatedProject = FundingHub.deployed().OnCreatedProject({projectOwner: account}, filter);

        onCreatedProject.watch(function(error, result) {
            if (!error) {
                setStatus(result.args.projectOwner + ' created project with address ' + result.args.projectAddress);
            }
        });

    });
};

contributeToProject = function(address, amount) {
    console.log(FundingHub.deployed());
    FundingHub.deployed().contribute(address, {from: account, value: amount,gas:3000000})
        .then(function (tx) {
            return web3.eth.getTransactionReceiptMined(tx);
        }).then(function (receipt) {
            setStatus('Transaction Hash:' + receipt.transactionHash);
        })
};

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

    //testing();
    getListOfProjects();

  });
}
