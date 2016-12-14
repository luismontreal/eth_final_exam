var Web3 = require("web3");
var SolidityEvent = require("web3/lib/web3/event.js");

(function() {
  // Planned for future features, logging, etc.
  function Provider(provider) {
    this.provider = provider;
  }

  Provider.prototype.send = function() {
    this.provider.send.apply(this.provider, arguments);
  };

  Provider.prototype.sendAsync = function() {
    this.provider.sendAsync.apply(this.provider, arguments);
  };

  var BigNumber = (new Web3()).toBigNumber(0).constructor;

  var Utils = {
    is_object: function(val) {
      return typeof val == "object" && !Array.isArray(val);
    },
    is_big_number: function(val) {
      if (typeof val != "object") return false;

      // Instanceof won't work because we have multiple versions of Web3.
      try {
        new BigNumber(val);
        return true;
      } catch (e) {
        return false;
      }
    },
    merge: function() {
      var merged = {};
      var args = Array.prototype.slice.call(arguments);

      for (var i = 0; i < args.length; i++) {
        var object = args[i];
        var keys = Object.keys(object);
        for (var j = 0; j < keys.length; j++) {
          var key = keys[j];
          var value = object[key];
          merged[key] = value;
        }
      }

      return merged;
    },
    promisifyFunction: function(fn, C) {
      var self = this;
      return function() {
        var instance = this;

        var args = Array.prototype.slice.call(arguments);
        var tx_params = {};
        var last_arg = args[args.length - 1];

        // It's only tx_params if it's an object and not a BigNumber.
        if (Utils.is_object(last_arg) && !Utils.is_big_number(last_arg)) {
          tx_params = args.pop();
        }

        tx_params = Utils.merge(C.class_defaults, tx_params);

        return new Promise(function(accept, reject) {
          var callback = function(error, result) {
            if (error != null) {
              reject(error);
            } else {
              accept(result);
            }
          };
          args.push(tx_params, callback);
          fn.apply(instance.contract, args);
        });
      };
    },
    synchronizeFunction: function(fn, instance, C) {
      var self = this;
      return function() {
        var args = Array.prototype.slice.call(arguments);
        var tx_params = {};
        var last_arg = args[args.length - 1];

        // It's only tx_params if it's an object and not a BigNumber.
        if (Utils.is_object(last_arg) && !Utils.is_big_number(last_arg)) {
          tx_params = args.pop();
        }

        tx_params = Utils.merge(C.class_defaults, tx_params);

        return new Promise(function(accept, reject) {

          var decodeLogs = function(logs) {
            return logs.map(function(log) {
              var logABI = C.events[log.topics[0]];

              if (logABI == null) {
                return null;
              }

              var decoder = new SolidityEvent(null, logABI, instance.address);
              return decoder.decode(log);
            }).filter(function(log) {
              return log != null;
            });
          };

          var callback = function(error, tx) {
            if (error != null) {
              reject(error);
              return;
            }

            var timeout = C.synchronization_timeout || 240000;
            var start = new Date().getTime();

            var make_attempt = function() {
              C.web3.eth.getTransactionReceipt(tx, function(err, receipt) {
                if (err) return reject(err);

                if (receipt != null) {
                  // If they've opted into next gen, return more information.
                  if (C.next_gen == true) {
                    return accept({
                      tx: tx,
                      receipt: receipt,
                      logs: decodeLogs(receipt.logs)
                    });
                  } else {
                    return accept(tx);
                  }
                }

                if (timeout > 0 && new Date().getTime() - start > timeout) {
                  return reject(new Error("Transaction " + tx + " wasn't processed in " + (timeout / 1000) + " seconds!"));
                }

                setTimeout(make_attempt, 1000);
              });
            };

            make_attempt();
          };

          args.push(tx_params, callback);
          fn.apply(self, args);
        });
      };
    }
  };

  function instantiate(instance, contract) {
    instance.contract = contract;
    var constructor = instance.constructor;

    // Provision our functions.
    for (var i = 0; i < instance.abi.length; i++) {
      var item = instance.abi[i];
      if (item.type == "function") {
        if (item.constant == true) {
          instance[item.name] = Utils.promisifyFunction(contract[item.name], constructor);
        } else {
          instance[item.name] = Utils.synchronizeFunction(contract[item.name], instance, constructor);
        }

        instance[item.name].call = Utils.promisifyFunction(contract[item.name].call, constructor);
        instance[item.name].sendTransaction = Utils.promisifyFunction(contract[item.name].sendTransaction, constructor);
        instance[item.name].request = contract[item.name].request;
        instance[item.name].estimateGas = Utils.promisifyFunction(contract[item.name].estimateGas, constructor);
      }

      if (item.type == "event") {
        instance[item.name] = contract[item.name];
      }
    }

    instance.allEvents = contract.allEvents;
    instance.address = contract.address;
    instance.transactionHash = contract.transactionHash;
  };

  // Use inheritance to create a clone of this contract,
  // and copy over contract's static functions.
  function mutate(fn) {
    var temp = function Clone() { return fn.apply(this, arguments); };

    Object.keys(fn).forEach(function(key) {
      temp[key] = fn[key];
    });

    temp.prototype = Object.create(fn.prototype);
    bootstrap(temp);
    return temp;
  };

  function bootstrap(fn) {
    fn.web3 = new Web3();
    fn.class_defaults  = fn.prototype.defaults || {};

    // Set the network iniitally to make default data available and re-use code.
    // Then remove the saved network id so the network will be auto-detected on first use.
    fn.setNetwork("default");
    fn.network_id = null;
    return fn;
  };

  // Accepts a contract object created with web3.eth.contract.
  // Optionally, if called without `new`, accepts a network_id and will
  // create a new version of the contract abstraction with that network_id set.
  function Contract() {
    if (this instanceof Contract) {
      instantiate(this, arguments[0]);
    } else {
      var C = mutate(Contract);
      var network_id = arguments.length > 0 ? arguments[0] : "default";
      C.setNetwork(network_id);
      return C;
    }
  };

  Contract.currentProvider = null;

  Contract.setProvider = function(provider) {
    var wrapped = new Provider(provider);
    this.web3.setProvider(wrapped);
    this.currentProvider = provider;
  };

  Contract.new = function() {
    if (this.currentProvider == null) {
      throw new Error("FundingHub error: Please call setProvider() first before calling new().");
    }

    var args = Array.prototype.slice.call(arguments);

    if (!this.unlinked_binary) {
      throw new Error("FundingHub error: contract binary not set. Can't deploy new instance.");
    }

    var regex = /__[^_]+_+/g;
    var unlinked_libraries = this.binary.match(regex);

    if (unlinked_libraries != null) {
      unlinked_libraries = unlinked_libraries.map(function(name) {
        // Remove underscores
        return name.replace(/_/g, "");
      }).sort().filter(function(name, index, arr) {
        // Remove duplicates
        if (index + 1 >= arr.length) {
          return true;
        }

        return name != arr[index + 1];
      }).join(", ");

      throw new Error("FundingHub contains unresolved libraries. You must deploy and link the following libraries before you can deploy a new version of FundingHub: " + unlinked_libraries);
    }

    var self = this;

    return new Promise(function(accept, reject) {
      var contract_class = self.web3.eth.contract(self.abi);
      var tx_params = {};
      var last_arg = args[args.length - 1];

      // It's only tx_params if it's an object and not a BigNumber.
      if (Utils.is_object(last_arg) && !Utils.is_big_number(last_arg)) {
        tx_params = args.pop();
      }

      tx_params = Utils.merge(self.class_defaults, tx_params);

      if (tx_params.data == null) {
        tx_params.data = self.binary;
      }

      // web3 0.9.0 and above calls new twice this callback twice.
      // Why, I have no idea...
      var intermediary = function(err, web3_instance) {
        if (err != null) {
          reject(err);
          return;
        }

        if (err == null && web3_instance != null && web3_instance.address != null) {
          accept(new self(web3_instance));
        }
      };

      args.push(tx_params, intermediary);
      contract_class.new.apply(contract_class, args);
    });
  };

  Contract.at = function(address) {
    if (address == null || typeof address != "string" || address.length != 42) {
      throw new Error("Invalid address passed to FundingHub.at(): " + address);
    }

    var contract_class = this.web3.eth.contract(this.abi);
    var contract = contract_class.at(address);

    return new this(contract);
  };

  Contract.deployed = function() {
    if (!this.address) {
      throw new Error("Cannot find deployed address: FundingHub not deployed or address not set.");
    }

    return this.at(this.address);
  };

  Contract.defaults = function(class_defaults) {
    if (this.class_defaults == null) {
      this.class_defaults = {};
    }

    if (class_defaults == null) {
      class_defaults = {};
    }

    var self = this;
    Object.keys(class_defaults).forEach(function(key) {
      var value = class_defaults[key];
      self.class_defaults[key] = value;
    });

    return this.class_defaults;
  };

  Contract.extend = function() {
    var args = Array.prototype.slice.call(arguments);

    for (var i = 0; i < arguments.length; i++) {
      var object = arguments[i];
      var keys = Object.keys(object);
      for (var j = 0; j < keys.length; j++) {
        var key = keys[j];
        var value = object[key];
        this.prototype[key] = value;
      }
    }
  };

  Contract.all_networks = {
  "default": {
    "abi": [
      {
        "constant": false,
        "inputs": [
          {
            "name": "amountGoal",
            "type": "uint256"
          },
          {
            "name": "deadline",
            "type": "uint256"
          }
        ],
        "name": "createProject",
        "outputs": [],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "getProjectCount",
        "outputs": [
          {
            "name": "count",
            "type": "uint256"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "a",
            "type": "address"
          }
        ],
        "name": "contribute",
        "outputs": [
          {
            "name": "",
            "type": "bool"
          }
        ],
        "payable": true,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "id",
            "type": "uint256"
          }
        ],
        "name": "getProject",
        "outputs": [
          {
            "name": "a",
            "type": "address"
          },
          {
            "name": "status",
            "type": "uint8"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "inputs": [],
        "payable": false,
        "type": "constructor"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "name": "projectOwner",
            "type": "address"
          },
          {
            "indexed": true,
            "name": "projectAddress",
            "type": "address"
          }
        ],
        "name": "OnCreatedProject",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "contributor",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "projectAddress",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "result",
            "type": "bool"
          }
        ],
        "name": "OnContribution",
        "type": "event"
      }
    ],
    "unlinked_binary": "0x606060405234610000575b5b5b6107368061001a6000396000f3606060405260e060020a600035046302da667b811461003f5780633bcff3b01461005457806373e888fd14610073578063f0f3f2c814610092575b610000565b34610000576100526004356024356100d0565b005b346100005761006161018a565b60408051918252519081900360200190f35b61007e600435610191565b604080519115158252519081900360200190f35b34610000576100a26004356102a2565b6040518083600160a060020a0316815260200182600381116100005781526020019250505060405180910390f35b818160405161040a8061032c8339019182526020820152604080519182900301906000f080156100005760018054600090815260208190526040808220805473ffffffffffffffffffffffffffffffffffffffff19166c0100000000000000000000000095860295909504949094179093558154820191829055908152818120549151600160a060020a03928316923216917fe6933e3389d19088e093b9152d1e5e509efff289d341ceac7ecbc29249902d3091a35b5050565b6001545b90565b600081818082600160a060020a0316634e69d5606000604051602001526040518160e060020a028152600401809050602060405180830381600087803b156100005760325a03f1156100005750506040515190506003811161000057146101fb576000925061029b565b81600160a060020a031663b60d4288346000604051602001526040518260e060020a0281526004018090506020604051808303818588803b156100005761235a5a03f115610000575050604080518051600160a060020a033281168352891660208301528015158284015291519194507f5ffd0d4726ef258b5d9312aeaf6a66868951958276f432dd4f8d3859dbf15f9593508190036060019150a18092505b5050919050565b600081815260208181526040808320548151830184905281517f4e69d56000000000000000000000000000000000000000000000000000000000815291518493600160a060020a039092169283928392634e69d56092600480820193929182900301818987803b156100005760325a03f11561000057505060405151919450909250505b50915091566060604052346100005760405160408061040a8339810160405280516020909101515b600080546004829055600160a060020a03199081166c010000000000000000000000003381028190049190911760a060020a60ff0219169092556001805490911632830292909204919091179055600282905560038190555b50505b61037e8061008c6000396000f3606060405236156100405760e060020a60003504634e69d560811461004e578063590e1ae31461007957806363bd1d4a1461009a578063b60d4288146100bb575b346100005761004c5b5b565b005b346100005761005b6100d7565b60405180826003811161000057815260200191505060405180910390f35b3461000057610086610143565b604080519115158252519081900360200190f35b346100005761008661022b565b604080519115158252519081900360200190f35b6100866102e8565b604080519115158252519081900360200190f35b60006100e556506003610140565b600281600381116100005714806101085750600254600160a060020a0330163110155b1561011557506002610140565b6001816003811161000057148061012f5750600354429011155b1561013c57506001610140565b5060005b90565b60008060016101506100d7565b60038111610000571461016257610000565b600160005460ff60a060020a90910416600381116100005714610196576000805460a060020a60ff02191660a060020a1790555b600160a060020a03321660009081526005602052604081205411156102225750600160a060020a033216600081815260056020526040808220805490839055905190929183156108fc02918491818181858888f19350505050151561021957600160a060020a033216600090815260056020526040812091909155905080610227565b60019150610227565b600091505b5090565b60015460009033600160a060020a0390811691161461024957610000565b60026102536100d7565b60038111610000571461026857506000610140565b600080547403000000000000000000000000000000000000000060a060020a60ff0219909116178155600154604051600160a060020a0391821692309092163180156108fc0292909190818181858888f1935050505015156102e057506000805460a060020a60ff02191660a160020a178155610140565b5060015b5b90565b6000805433600160a060020a0390811691161461030457610000565b600061030e6100d7565b60038111610000571461032357506000610140565b600160a060020a033216600090815260056020526040902034905560048054600101905560026103516100d7565b600381116100005714156102e0576000805460a060020a60ff02191660a160020a1790555b5060015b5b9056",
    "events": {
      "0xe6933e3389d19088e093b9152d1e5e509efff289d341ceac7ecbc29249902d30": {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "name": "projectOwner",
            "type": "address"
          },
          {
            "indexed": true,
            "name": "projectAddress",
            "type": "address"
          }
        ],
        "name": "OnCreatedProject",
        "type": "event"
      },
      "0x0a3253d44eaba7bb537e70d4edb5059cb89e1da11640634f15cd397da6778997": {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "contributor",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "projectAddress",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "result",
            "type": "bool"
          },
          {
            "indexed": false,
            "name": "status",
            "type": "uint8"
          }
        ],
        "name": "OnContribution",
        "type": "event"
      },
      "0x5ffd0d4726ef258b5d9312aeaf6a66868951958276f432dd4f8d3859dbf15f95": {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "contributor",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "projectAddress",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "result",
            "type": "bool"
          }
        ],
        "name": "OnContribution",
        "type": "event"
      }
    },
    "updated_at": 1481738123526,
    "links": {},
    "address": "0xbef029b53cd223cacbe2afe3bd7870cd7ca02cbd"
  }
};

  Contract.checkNetwork = function(callback) {
    var self = this;

    if (this.network_id != null) {
      return callback();
    }

    this.web3.version.network(function(err, result) {
      if (err) return callback(err);

      var network_id = result.toString();

      // If we have the main network,
      if (network_id == "1") {
        var possible_ids = ["1", "live", "default"];

        for (var i = 0; i < possible_ids.length; i++) {
          var id = possible_ids[i];
          if (Contract.all_networks[id] != null) {
            network_id = id;
            break;
          }
        }
      }

      if (self.all_networks[network_id] == null) {
        return callback(new Error(self.name + " error: Can't find artifacts for network id '" + network_id + "'"));
      }

      self.setNetwork(network_id);
      callback();
    })
  };

  Contract.setNetwork = function(network_id) {
    var network = this.all_networks[network_id] || {};

    this.abi             = this.prototype.abi             = network.abi;
    this.unlinked_binary = this.prototype.unlinked_binary = network.unlinked_binary;
    this.address         = this.prototype.address         = network.address;
    this.updated_at      = this.prototype.updated_at      = network.updated_at;
    this.links           = this.prototype.links           = network.links || {};
    this.events          = this.prototype.events          = network.events || {};

    this.network_id = network_id;
  };

  Contract.networks = function() {
    return Object.keys(this.all_networks);
  };

  Contract.link = function(name, address) {
    if (typeof name == "function") {
      var contract = name;

      if (contract.address == null) {
        throw new Error("Cannot link contract without an address.");
      }

      Contract.link(contract.contract_name, contract.address);

      // Merge events so this contract knows about library's events
      Object.keys(contract.events).forEach(function(topic) {
        Contract.events[topic] = contract.events[topic];
      });

      return;
    }

    if (typeof name == "object") {
      var obj = name;
      Object.keys(obj).forEach(function(name) {
        var a = obj[name];
        Contract.link(name, a);
      });
      return;
    }

    Contract.links[name] = address;
  };

  Contract.contract_name   = Contract.prototype.contract_name   = "FundingHub";
  Contract.generated_with  = Contract.prototype.generated_with  = "3.2.0";

  // Allow people to opt-in to breaking changes now.
  Contract.next_gen = false;

  var properties = {
    binary: function() {
      var binary = Contract.unlinked_binary;

      Object.keys(Contract.links).forEach(function(library_name) {
        var library_address = Contract.links[library_name];
        var regex = new RegExp("__" + library_name + "_*", "g");

        binary = binary.replace(regex, library_address.replace("0x", ""));
      });

      return binary;
    }
  };

  Object.keys(properties).forEach(function(key) {
    var getter = properties[key];

    var definition = {};
    definition.enumerable = true;
    definition.configurable = false;
    definition.get = getter;

    Object.defineProperty(Contract, key, definition);
    Object.defineProperty(Contract.prototype, key, definition);
  });

  bootstrap(Contract);

  if (typeof module != "undefined" && typeof module.exports != "undefined") {
    module.exports = Contract;
  } else {
    // There will only be one version of this contract in the browser,
    // and we can use that.
    window.FundingHub = Contract;
  }
})();
