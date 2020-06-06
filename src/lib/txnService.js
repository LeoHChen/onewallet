import store from "../popup/store";
import { encryptPhrase, getAddress, decryptPhrase } from "@harmony-js/crypto";
const { isValidAddress, ChainType } = require("@harmony-js/utils");
import { Harmony } from "@harmony-js/core";
import BigNumber from "bignumber.js";
const H20 = require("./contracts/HarmonyERC20.json");
const DEFAULT_CONTRACT_ADDRESS = "0xf4Be4Bad17Ff4be93384C9d04f7bebDcfb227dBb";
var currentNetwork = "";
const DECIMAL = 18;
BigNumber.config({ ROUNDING_MODE: 3 });
export const RecoverCode = {
  MNEMONIC: 1,
  PRIVATE_KEY: 2,
  KEYSTORE: 3,
};

var harmony = new Harmony(
  // rpc url
  store.state.network.apiUrl,
  {
    chainType: ChainType.Harmony,
    chainId: store.state.network.chainId, //ChainID.HmyMainnet,
  }
);
export default function getHarmony() {
  if (currentNetwork != store.state.network.name) {
    currentNetwork = store.state.network.name;
    console.log("current network changed to", currentNetwork);
    harmony = new Harmony(
      // rpc url
      store.state.network.apiUrl,
      {
        chainType: ChainType.Harmony,
        chainId: store.state.network.chainId, //ChainID.HmyMainnet,
      }
    );
  }

  return harmony;
}

export const getH20ContractInstance = () => {
  const netid = store.state.network.chainId;
  const contract = getHarmony().contracts.createContract(
    H20.abi,
    H20.networks[netid] ? H20.networks[netid].address : DEFAULT_CONTRACT_ADDRESS
  );
  return contract;
};

export const oneToHexAddress = (address) =>
  getHarmony().crypto.getAddress(address).basicHex;

export function validatePrivateKey(privateKey) {
  try {
    const oneAddress = getAddressFromPrivateKey(privateKey);
    return isValidAddress(oneAddress);
  } catch (e) {
    return false;
  }
}

export async function encryptKeyStore(password, privateKey) {
  const keyStore = await encryptPhrase(privateKey, password);
  return keyStore;
}

export async function decryptKeyStore(password, keystore) {
  if (!password) {
    return false;
  }

  var privateKey;
  try {
    privateKey = await decryptPhrase(JSON.parse(keystore), password);
  } catch (e) {
    console.log(e);
    return false;
  }

  return privateKey;
}

export function generatePhrase() {
  return getHarmony().wallet.newMnemonic();
}

export async function createAccountFromMnemonic(name, mnemonic, password) {
  let account;
  try {
    account = getHarmony().wallet.addByMnemonic(mnemonic);
  } catch (e) {
    console.log("createAccountFromMnemonic error = ", e);
    return false;
  }

  let address = getAddress(account.address).bech32;
  const keystore = await encryptPhrase(account.privateKey, password);

  return {
    name,
    address,
    keystore,
  };
}

export function getAddressFromPrivateKey(privateKey) {
  let account = getHarmony().wallet.addByPrivateKey(privateKey);
  let address = getAddress(account.address).bech32;
  return address;
}

//disease travel sea cage fiscal midnight arch betray catch keen agree organ
//one1p6wcwnajxc208uxpdlx9sqktt6t8kk8nw9hshf
//0x369cbf85b0239b8c830b9f807e2fd2d4eee731a0d58063affa5bf7e152cb42e6

// 0x1b4dc81bc7245c648e846c0d6f4d818425733a988aafa7030001b409bc71f27c
// one1jcq8d7afnsz4kj8yjt39wnljvj8qkx5ccydgd6
export async function getBalance(address, shardId) {
  getHarmony().blockchain.messenger.setDefaultShardID(shardId);
  let ret = await getHarmony().blockchain.getBalance({ address });

  return ret.result;
}
export async function getH20Balance(address) {
  const instance = getH20ContractInstance();
  const hexAddress = oneToHexAddress(address);
  let decimal = await instance.methods.decimals().call();
  console.log(decimal);
  let bigbalance = await instance.methods.balanceOf(hexAddress).call();
  let balance = BigNumber(bigbalance)
    .dividedBy(Math.pow(10, DECIMAL))
    .toFixed(2);
  return balance;
}

export async function getShardInfo() {
  //set sharding
  const res = await getHarmony().blockchain.getShardingStructure();
  getHarmony().shardingStructures(res.result);

  return res.result;
}

export function checkAddress(address) {
  return isValidAddress(address);
}

export async function transferToken(
  receiver,
  fromShard,
  toShard,
  amount,
  privateKey,
  gasLimit = "210000",
  gasPrice = 2
) {
  let harmony = getHarmony();

  //1e18
  const txn = harmony.transactions.newTx({
    //  token send to
    to: receiver,
    // amount to send
    value: new harmony.utils.Unit(amount)
      .asEther()
      .toWei()
      .toString(),
    // gas limit, you can use string
    gasLimit: gasLimit,
    // send token from shardID
    shardID:
      typeof fromShard === "string"
        ? Number.parseInt(fromShard, 10)
        : fromShard,
    // send token to toShardID
    toShardID:
      typeof toShard === "string" ? Number.parseInt(toShard, 10) : toShard,
    // gas Price, you can use Unit class, and use Gwei, then remember to use toWei(), which will be transformed to BN
    gasPrice: new harmony.utils.Unit(gasPrice)
      .asGwei()
      .toWei()
      .toString(),
  });

  // update the shard information
  await getShardInfo();

  // sign the transaction use wallet;
  const account = harmony.wallet.addByPrivateKey(privateKey);

  const signedTxn = await account.signTransaction(txn);

  signedTxn
    .observed()
    .on("transactionHash", (txnHash) => {
      console.log("--- hash ---");
      console.log(txnHash);
    })
    .on("error", (error) => {
      return {
        result: false,
        mesg: "failed to sign transaction",
      };
    });

  const [sentTxn, txnHash] = await signedTxn.sendTransaction();
  const confiremdTxn = await sentTxn.confirm(txnHash);

  var explorerLink;
  if (confiremdTxn.isConfirmed()) {
    explorerLink = getNetworkLink("/tx/" + txnHash);
    console.log(explorerLink);
  } else {
    return {
      result: false,
      mesg: "can not confirm transaction " + txnHash,
    };
  }

  return {
    result: true,
    mesg: explorerLink,
  };
}

export async function getTransfers(
  address,
  pageIndex,
  pageSize,
  order = "DESC"
) {
  let harmony = getHarmony();
  const ret = await harmony.messenger.send(
    "hmy_getTransactionsHistory",
    [
      {
        address: address,
        pageIndex: pageIndex,
        pageSize: pageSize,
        fullTx: true,
        txType: "ALL",
        order,
      },
    ],
    harmony.messenger.chainPrefix,
    harmony.messenger.getCurrentShardID()
  );

  return ret.result;
}

export async function getTransactionCount(addr) {
  let harmony = getHarmony();

  // const ret = await harmony.blockchain.getTransactionCount( {address: 'one1zksj3evekayy90xt4psrz8h6j2v3hla4qwz4ur'})
  const ret = await harmony.blockchain.getTransactionCount({ address: addr });

  return parseInt(ret.result);
}

export function getNetworkLink(path) {
  var basic;
  switch (currentNetwork) {
    case "Mainnet": {
      basic = "https://explorer.harmony.one/#";
      break;
    }
    case "Pangaea": {
      basic = "https://explorer.pangaea.harmony.one/#";
      break;
    }
    case "Testnet": {
      basic = "https://explorer.testnet.harmony.one/#";
      break;
    }
    case "OpensSakingNet": {
      basic = "https://explorer.os.hmny.io/#";
      break;
    }
    case "Localnet": {
      basic = "";
      break;
    }
    case "PartnerNet": {
      basic = "https://explorer.ps.hmny.io/#";
      break;
    }
    default: {
      basic = "https://explorer.harmony.one/#";
      break;
    }
  }

  return basic + path;
}

export function removeDups(myList) {
  let unique = {};
  var newList = [];
  myList.forEach(function(i) {
    if (!unique[i.blockHash]) {
      unique[i.blockHash] = true;
      newList.push(i);
    }
  });

  return newList;
}
