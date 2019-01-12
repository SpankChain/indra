import React, { Component } from 'react';
import { getConnextClient } from 'connext/dist/Connext';
import './App.css';
import ProviderOptions from './utils/ProviderOptions.ts';
import clientProvider from './utils/web3/clientProvider.ts';
import { setWallet } from './utils/actions.js';
import { createWallet, createWalletFromKey, findOrCreateWallet } from './walletGen';
import { createStore } from 'redux';
import Select from 'react-select';
import axios from 'axios';
const Web3 = require('web3');
const eth = require('ethers');
const util = require('ethereumjs-util')
require('dotenv').config();

// const ropstenWethAbi = require('./abi/ropstenWeth.json')
const humanTokenAbi = require('./abi/humanToken.json')

console.log(`starting app in env: ${JSON.stringify(process.env, null, 1)}`)
const hubUrl = process.env.REACT_APP_HUB_URL.toLowerCase()
const providerUrl = process.env.REACT_APP_ETHPROVIDER_URL.toLowerCase()
const tokenAddress = process.env.REACT_APP_TOKEN_ADDRESS.toLowerCase()
const hubWalletAddress = process.env.REACT_APP_HUB_WALLET_ADDRESS.toLowerCase()
const channelManagerAddress = process.env.REACT_APP_CHANNEL_MANAGER_ADDRESS.toLowerCase()

const HASH_PREAMBLE = 'SpankWallet authentication message:'

const opts = {
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Authorization': 'Bearer foo'
  },
  withCredentials: true
}

export const store = createStore(setWallet, null);

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedWallet: null,
      walletOptions: [],
      metamask: {
        address: null,
        balance: 0,
        tokenBalance: 0
      },
      usingMetamask: false,
      hubWallet: {
        address: hubWalletAddress,
        balance: 0,
        tokenBalance: 0
      },
      channelManager: {
        address: channelManagerAddress,
        balance: 0,
        tokenBalance: 0
      },
      depositVal: {
        amountWei: "0",
        amountToken: "0"
      },
      exchangeVal: "100",
      paymentVal: {
        meta: {
          purchaseId: "payment"
        },
        payments: [
          {
            recipient: "0x0",
            amount: {
              amountWei: "0",
              amountToken: "100"
            }
          }
        ]
      },
      withdrawalVal: {
        withdrawalWeiUser: "100",
        tokensToSell: "0",
        withdrawalTokenUser: "0",
        weiToSell: "0",
        exchangeRate: "0.00",
        recipient: "0x0"
      },
      authorized: "false",
      web3: null,
      wallet: null,
      address: null,
      balance: 0,
      tokenBalance: 0,
      toggleKey: false,
      walletSet: false,
      keyEntered: "",
      approvalWeiUser: "10000",
      recipient: hubWalletAddress,
      connext: null,
      channelState: null,
      exchangeRate: "0.00",
      tokenContract: null
    };
    this.toggleKey = this.toggleKey.bind(this);
  }

  async componentDidMount() {
    try {
      await this.setWalletAndProvider()

      await this.setConnext()

      await this.refreshBalances();

      await this.authorizeHandler();

      this.pollExchangeRate();
    } catch (error) {
      alert(`Failed to load web3 or Connext. Check console for details.`);
      console.log(error);
    }
  }

  async pollExchangeRate() {
    const getRate = async () => {
      const response = await fetch('https://api.coinbase.com/v2/exchange-rates?currency=ETH')
      const json = await response.json()
      console.log('latest ETH->USD exchange rate: ', json.data.rates.USD);
      this.setState({
        exchangeRate: json.data.rates.USD
      })
    }
    getRate()
    setInterval(() => {
      getRate()
    }, 10000);
  }

  updateApprovalHandler(evt) {
    this.setState({
      approvalWeiUser: evt.target.value
    });
  }

  walletChangeHandler = async (selectedWallet) => {
    this.refreshBalances()
    this.setState({ selectedWallet });
    console.log(`Option selected:`, selectedWallet);
  }

  async updateDepositHandler(evt, token) {
    var value = evt.target.value;
    if (token === "ETH") {
      await this.setState(oldState => {
        oldState.depositVal.amountWei = value;
        return oldState;
      });
    } else if (token === "TST") {
      await this.setState(oldState => {
        oldState.depositVal.amountToken = value;
        return oldState;
      });
    }
    //console.log(`Updated depositVal: ${JSON.stringify(this.state.depositVal,null,2)}`)
  }

  async updateExchangeHandler(evt) {
    var value = evt.target.value;
    await this.setState(oldState => {
      oldState.exchangeVal = value;
      return oldState;
    });
    console.log(`Updated exchangeVal: ${JSON.stringify(this.state.exchangeVal, null, 2)}`);
  }

  async updateWithdrawHandler(evt, token) {
    var value = evt.target.value;
    if (token === "ETH") {
      await this.setState(oldState => {
        oldState.withdrawalVal.withdrawalWeiUser = value;
        return oldState;
      });
    } else if (token === "TST") {
      await this.setState(oldState => {
        oldState.withdrawalVal.tokensToSell = value;
        return oldState;
      });
    } else if (token === "recipient") {
      await this.setState(oldState => {
        oldState.withdrawalVal.recipient = value;
        return oldState;
      });
    }
    console.log(`Updated withdrawalVal: ${JSON.stringify(this.state.withdrawalVal, null, 2)}`);
  }

  async updatePaymentHandler(evt, token) {
    var value = evt.target.value;
    if (token === "ETH") {
      await this.setState(oldState => {
        oldState.paymentVal.payments[0].amount.amountWei = value;
        return oldState;
      });
    } else if (token === "TST") {
      await this.setState(oldState => {
        oldState.paymentVal.payments[0].amount.amountToken = value;
        return oldState;
      });
    } else if (token === "recipient") {
      await this.setState(oldState => {
        oldState.paymentVal.payments[0].recipient = value;
        return oldState;
      });
    }
    console.log(`Updated paymentVal: ${JSON.stringify(this.state.paymentVal, null, 2)}`);
  }

  async approvalHandler(evt) {
    // const tokenContract = this.state.tokenContract
    // let approveFor = channelManagerAddress;
    // let toApprove = this.state.approvalWeiUser;
    // let toApproveBn = eth.utils.bigNumberify(toApprove);
    // let depositResGas = await tokenSigner.estimate.approve(approveFor, toApproveBn);
    // console.log(`I predict this tx [a ${typeof tokenSigner.approve}] will require ${depositResGas} gas`);
    // let approveTx = await tokenSigner.functions.approve(approveFor, toApproveBn, { gasLimit: depositResGas });
    // console.log(approveTx);
  }

  //Connext Helpers

  async depositHandler() {
    const tokenContract = this.state.tokenContract
    let approveFor = channelManagerAddress;
    let approveTx = await tokenContract.methods.approve(approveFor, this.state.depositVal);
    console.log(approveTx);

    try {
      const wei = this.state.depositVal.amountWei
      const tokens = this.state.depositVal.amountToken

      if (wei !== "0") {
        console.log("found wei deposit")
        if (wei >= this.state.balance) {
          const weiNeeded = wei - this.state.balance
          await this.getEther(weiNeeded)
        }
      }

      if (tokens !== "0") {
        console.log("found token deposit")
        if (tokens >= this.state.tokenBalance) {
          const tokensNeeded = tokens - this.state.tokenBalance
          await this.getTokens(tokensNeeded)
        }
      }

    } catch (e) {
      console.log(`error fetching deposit from metamask: ${e}`)
    }


    console.log(`Depositing: ${JSON.stringify(this.state.depositVal, null, 2)}`);
    // console.log('********', this.state.connext.opts.tokenAddress)
    console.log('******** opts', this.state.connext)
    let depositRes = await this.state.connext.deposit(this.state.depositVal);
    console.log(`Deposit Result: ${JSON.stringify(depositRes, null, 2)}`);
  }

  async exchangeHandler() {
    console.log(`Exchanging: ${JSON.stringify(this.state.exchangeVal, null, 2)}`);
    let exchangeRes = await this.state.connext.exchange(this.state.exchangeVal, "wei");
    console.log(`Exchange Result: ${JSON.stringify(exchangeRes, null, 2)}`);
  }

  async paymentHandler() {
    console.log(`Submitting payment: ${JSON.stringify(this.state.paymentVal, null, 2)}`);
    let paymentRes = await this.state.connext.buy(this.state.paymentVal);
    console.log(`Payment result: ${JSON.stringify(paymentRes, null, 2)}`);
  }

  async withdrawalHandler(max) {
    let withdrawalVal = { ...this.state.withdrawalVal, exchangeRate: this.state.exchangeRate }
    if (max) {
      withdrawalVal.recipient = this.state.metamask.address
      withdrawalVal.tokensToSell = this.state.channelState.balanceTokenUser
      withdrawalVal.withdrawalWeiUser = this.state.channelState.balanceWeiUser
    }
    console.log(`Withdrawing: ${JSON.stringify(this.state.withdrawalVal, null, 2)}`);
    let withdrawalRes = await this.state.connext.withdraw(withdrawalVal);
    console.log(`Withdrawal result: ${JSON.stringify(withdrawalRes, null, 2)}`);
  }

  async collateralHandler() {
    console.log(`Requesting Collateral`);
    let collateralRes = await this.state.connext.requestCollateral();
    console.log(`Collateral result: ${JSON.stringify(collateralRes, null, 2)}`);
  }

  // Other Helpers
  getKey() {
    console.log(store.getState()[0]);
    function _innerGetKey() {
      const key = store.getState()[0].mnemonic;
      return key;
    }
    let privKey = _innerGetKey();
    console.log(`privkey: ${JSON.stringify(privKey)}`)
    return privKey;
  }

  toggleKey(evt) {
    evt.preventDefault();
    this.setState(prevState => ({ toggleKey: !prevState.toggleKey }), () => { });
  }

  // WalletHandler - it works but i'm running into some lifecycle issues. for option for user
  // to create wallet from privkey to display,
  // wallet creation needs to be in componentDidUpdate. but everything goes haywire when that happens so idk

  async walletHandler() {
    let wallet;
    let key = this.state.keyEntered;
    if (key) wallet = createWalletFromKey(key);
    else {
      wallet = await findOrCreateWallet(this.state.web3);
    }
    this.setState({ walletSet: true });
    return wallet;
  }

  updateWalletHandler(evt) {
    this.setState({
      keyEntered: evt.target.value
    });
    console.log(`Updating state : ${this.state.depositVal}`);
  }

  async createWallet() {
    await createWallet(this.state.web3);
    window.location.reload(true);
  }

  async authorizeHandler(evt) {
    const web3 = this.state.web3
    const challengeRes = await axios.post(`${hubUrl}/auth/challenge`, {}, opts);

    const hash = web3.utils.sha3(`${HASH_PREAMBLE} ${web3.utils.sha3(challengeRes.data.nonce)} ${web3.utils.sha3("localhost")}`)

    // let hash = web3.utils.sha3(`${HASH_PREAMBLE} ${web3.utils.sha3(res.data.nonce)} ${web3.utils.sha3("localhost")}`);
    const signature = await this.state.web3.eth.personal.sign(hash, this.state.address);

    try {
      let authRes = await axios.post(
        `${hubUrl}/auth/response`,
        {
          nonce: challengeRes.data.nonce,
          address: this.state.address,
          origin: "localhost",
          signature,
        },
        opts
      );
      const token = authRes.data.token;
      document.cookie = `hub.sid=${token}`;
      console.log(`cookie set: ${token}`);
      const res = await axios.get(`${hubUrl}/auth/status`, opts);
      if (res.data.success) {
        this.setState({ authorized: "true" });
      } else {
        this.setState({ authorized: "false" });
      }
      console.log(`Auth status: ${JSON.stringify(res.data)}`);
    } catch (e) {
      console.log(e);
    }
  }

  // to get tokens from metamask to browser wallet
  async getTokens(amountToken) {
    let web3 = window.web3;
    console.log(web3)
    if (!web3) {
      alert("You need to install & unlock metamask to do that");
      return;
    }
    const metamaskProvider = new Web3(web3.currentProvider);
    const address = (await metamaskProvider.eth.getAccounts())[0];
    if (!address) {
      alert("You need to install & unlock metamask to do that");
      return;
    }

    const tokenContract = new metamaskProvider.eth.Contract(humanTokenAbi, tokenAddress);

    let tokens = amountToken
    console.log(`Sending ${tokens} tokens from ${address} to ${store.getState()[0].getAddressString()}`);

    console.log('state:')
    console.log(this.state)

    let approveTx = await tokenContract.methods.transfer(store.getState()[0].getAddressString(), tokens).send({
      from: address,
      gas: "81000"
    });

    console.log(approveTx);
  }

  // to get tokens from metamask to browser wallet
  async getEther(amountWei) {
    let web3 = window.web3;
    console.log(web3)
    if (!web3) {
      alert("You need to install & unlock metamask to do that");
      return;
    }
    const metamaskProvider = new eth.providers.Web3Provider(web3.currentProvider);
    const metamask = metamaskProvider.getSigner();
    const address = (await metamask.provider.listAccounts())[0];
    if (!address) {
      alert("You need to install & unlock metamask to do that");
      return;
    }
    const sentTx = await metamask.sendTransaction({
      to: store.getState()[0].getAddressString(),
      value: eth.utils.bigNumberify(amountWei),
      gasLimit: eth.utils.bigNumberify("21000")
    });
    console.log(`Eth sent to: ${store.getState()[0].getAddressString()}. Tx: `, sentTx);
  }

  // ** wrapper for ethers getBalance. probably breaks for tokens
  async refreshBalances() {
    const tokenContract = this.state.tokenContract
    const balance = Number(await this.state.web3.eth.getBalance(this.state.address)) / 1000000000000000000;
    const tokenBalance = Number(await tokenContract.methods.balanceOf(this.state.address).call()) / 1000000000000000000;
    this.setState({ balance: balance, tokenBalance: tokenBalance });

    const hubBalance = Number(await this.state.web3.eth.getBalance(hubWalletAddress)) / 1000000000000000000;
    const hubTokenBalance = Number(await tokenContract.methods.balanceOf(hubWalletAddress).call()) / 1000000000000000000;
    this.setState({
      hubWallet: {
        address: hubWalletAddress,
        balance: hubBalance,
        tokenBalance: hubTokenBalance
      }
    });

    const cmBalance = Number(await this.state.web3.eth.getBalance(channelManagerAddress)) / 1000000000000000000;
    const cmTokenBalance = Number(await tokenContract.methods.balanceOf(channelManagerAddress).call()) / 1000000000000000000;
    this.setState({
      channelManager: {
        address: channelManagerAddress,
        balance: cmBalance,
        tokenBalance: cmTokenBalance
      }
    });

    let web3 = window.web3;
    if (!web3) {
      alert("You need to install & unlock metamask to do that");
      return;
    }
    const metamaskProvider = new eth.providers.Web3Provider(web3.currentProvider);
    const metamask = metamaskProvider.getSigner();
    const address = (await metamask.provider.listAccounts())[0];
    if (!address) {
      this.setState({ metamask: { address: "unavailable", balance: 0, tokenBalance: 0 } });
      return;
    }
    const mmBalance = Number(await this.state.web3.eth.getBalance(address)) / 1000000000000000000;
    const mmTokenBalance = Number(await tokenContract.methods.balanceOf(address).call()) / 1000000000000000000;
    this.setState({
      metamask: {
        address: address,
        balance: mmBalance,
        tokenBalance: mmTokenBalance
      }
    });
    console.log("balances refreshed!")
  }

  async setConnext() {
    const { web3, hubWallet, address, } = this.state
    console.log(`instantiating connext with hub as: ${hubUrl}`);
    console.log(`web3 address : ${await web3.eth.getAccounts()}`);
    console.log("Setting up connext...");

    // *** Instantiate the connext client ***
    const connext = getConnextClient({
      web3,
      hubAddress: hubWallet.address, //"0xfb482f8f779fd96a857f1486471524808b97452d" ,
      hubUrl: hubUrl, //http://localhost:8080,
      contractAddress: channelManagerAddress, //"0xa8c50098f6e144bf5bae32bdd1ed722e977a0a42",
      user: address.toLowerCase(),
      tokenAddress,
    });

    console.log("Successfully set up connext!");

    await connext.start(); // start polling
    //console.log('Pollers started! Good morning :)')
    connext.on("onStateChange", state => {
      console.log("Connext state changed:", state);
      this.setState({
        channelState: state.persistent.channel,
      });
    });

    this.setState({ connext, });
    const channelState = connext.state ? connext.state.persistent.channel : null
    this.setState({ channelState })
    console.log(`This is connext state: ${JSON.stringify(this.state.channelState, null, 2)}`);
  }

  async setWalletAndProvider(metamask = false) {
    this.setState({ usingMetamask: metamask, })
    let web3
    let address
    let wallet
    try {
      if (metamask) {
        this.setState({ usingMetamask: true, })
        let windowProvider = window.web3;
        if (!windowProvider) {
          alert("You need to install & unlock metamask to do that");
          return;
        }
        web3 = new Web3(windowProvider.currentProvider);
        address = (await web3.eth.getAccounts())[0].toLowerCase();
        if (!address) {
          alert("You need to install & unlock metamask to do that");
          return;
        }
        wallet = await web3.eth.getAccounts()[0]
      } else {
        // New provider code
        const providerOpts = new ProviderOptions(store).approving();
        const provider = clientProvider(providerOpts);
        web3 = new Web3(provider);
        // create wallet. TODO: maintain wallet or use some kind of auth instead of generating new one.
        // as is, if you don't write down the privkey in the store you can't recover the wallet
        wallet = await this.walletHandler()
        address = wallet.getAddressString().toLowerCase()
      }

      await this.setState({ web3 });
      console.log("set up web3 successfully");

      this.setState({
        tokenContract: new web3.eth.Contract(humanTokenAbi, tokenAddress)
      })
      console.log("Set up token contract");

      console.log('wallet: ', wallet);
      // make sure wallet is linked to chain
      store.dispatch({
        type: "SET_WALLET",
        text: wallet
      });
      this.setState({ wallet: store.getState()[0] })

      this.setState({ address })
      console.log("Set up wallet:", address);

      // set wallet options
      const walletOptions = [
        {
          value: {
            address: this.state.metamask.address,
            ETHBalance: this.state.metamask.balance,
            TSTBalance: this.state.metamask.tokenBalance
          },
          label: 'Metamask'
        },
        {
          value: {
            address: this.state.address,
            ETHBalance: this.state.balance,
            TSTBalance: this.state.tokenBalance
          },
          label: 'Browser'
        },
        {
          value: {
            address: this.state.channelManager.address,
            ETHBalance: this.state.channelManager.balance,
            TSTBalance: this.state.channelManager.tokenBalance
          },
          label: 'ChannelManager'
        },
        {
          value: {
            address: this.state.hubWallet.address,
            ETHBalance: this.state.hubWallet.balance,
            TSTBalance: this.state.hubWallet.tokenBalance
          },
          label: 'Hub'
        },
      ]

      this.setState({
        walletOptions: walletOptions
      });

      console.log(`wallet state set: ${JSON.stringify(this.state.walletOptions)}`)

    } catch (error) {
      alert(`Failed to load web3 or Connext. Check console for details.`);
      console.log(error);
    }
  }

  async userMetamaskHandler(e) {
    if (this.state.connext) {
      await this.state.connext.stop()
    }
    await this.setWalletAndProvider(true)
    await this.setConnext()
  }

  render() {
    return (
      <div className="app">
        <div className="row" style={{ justifyContent: 'center', fontFamily: 'Comfortaa' }}>
          <h1> Connext Starter Kit</h1>
        </div>
        <div className="row">
          <div className="column">
            <h2 style={{ justifyContent: 'center', fontFamily: 'Comfortaa' }}>Deposit</h2>
            {this.state.authorized ?
              (<div>
                Wallet authorized!
              </div>
              ) :
              (
                <div>
                  Awaiting wallet authorization....
                </div>
              )}
            {/* <br /> <br />
              <button className="btn" onClick={evt => this.getTokens(evt)}>
                Get 1 Token from Metamask
              </button>
              <button className="btn" onClick={evt => this.getEther(evt)}>
                Get 1 Ether from Metamask
              </button> */}
            <br /> <br />
            <div>
              <div className="value-entry">
                Enter ETH deposit amount in Wei:&nbsp;&nbsp;
                  <input defaultValue={0} onChange={evt => this.updateDepositHandler(evt, "ETH")} />
              </div>
              <div className="value-entry">
                Enter TST deposit amount in Wei:&nbsp;&nbsp;
                  <input defaultValue={0} onChange={evt => this.updateDepositHandler(evt, "TST")} />
              </div>
              <button className="btn" onClick={evt => this.depositHandler(evt)}>
                Deposit to Channel
                </button>{" "}
              &nbsp;
                <br /> <br />
            </div>
          </div>
          <div className="column">
            <h2 style={{ justifyContent: 'center', fontFamily: 'Comfortaa' }}>Swap</h2>
            <p>Swaps will be made in-channel. Currently only ETH->Token swaps are supported.</p>
            <div className="value-entry">
              Enter ETH amount in Wei:&nbsp;&nbsp;
                <input defaultValue={100} onChange={evt => this.updateExchangeHandler(evt)} />
            </div>
            <button className="btn" onClick={evt => this.exchangeHandler(evt)}>
              Make a Swap
              </button>{" "}
            &nbsp;
              <br /> <br />
          </div>
          <div className="column">
            <h2 style={{ justifyContent: 'center', fontFamily: 'Comfortaa' }}>Payment</h2>
            <div className="value-entry">
              Enter recipient address:&nbsp;&nbsp;
                <input defaultValue={`0x...`} onChange={evt => this.updatePaymentHandler(evt, "recipient")} />
            </div>
            <div className="value-entry">
              Enter ETH payment amount in Wei:&nbsp;&nbsp;
                <input defaultValue={0} onChange={evt => this.updatePaymentHandler(evt, "ETH")} />
            </div>
            <div className="value-entry">
              Enter TST payment amount in Wei:&nbsp;&nbsp;
                <input defaultValue={100} onChange={evt => this.updatePaymentHandler(evt, "TST")} />
            </div>
            <button className="btn" onClick={evt => this.paymentHandler(evt)}>
              Make a Payment
              </button>{" "}
            &nbsp;
              <button className="btn" onClick={evt => this.collateralHandler(evt)}>
              Request Collateral
              </button>{" "}
            &nbsp;
              <br /> <br />
          </div>
          <div className="column">
            <h2 style={{ justifyContent: 'center', fontFamily: 'Comfortaa' }}>Withdrawal</h2>
            <div className="value-entry">
              Enter recipient address:&nbsp;&nbsp;
                <input defaultValue={`0x...`} onChange={evt => this.updateWithdrawHandler(evt, "recipient")} />
            </div>
            <div className="value-entry">
              Enter ETH withdrawal amount in Wei:&nbsp;&nbsp;
                <input defaultValue={100} onChange={evt => this.updateWithdrawHandler(evt, "ETH")} />
            </div>
            <div className="value-entry">
              Enter TST withdrawal amount in Wei:&nbsp;&nbsp;
                <input defaultValue={0} onChange={evt => this.updateWithdrawHandler(evt, "TST")} />
            </div>
            <button className="btn" onClick={() => this.withdrawalHandler()}>
              Withdraw from Channel
              </button>{" "}
            &nbsp;
              <button className="btn" onClick={() => this.withdrawalHandler(true)}>
              Withdraw Max from Channel to MetaMask
              </button>{" "}
            &nbsp;
              <br /> <br />
          </div>
        </div>
        <div className="row">
          <div className="column">
            <h2 style={{ fontFamily: 'Comfortaa' }}>Wallet Information</h2>
            <Select
              value={this.state.selectedWallet}
              onChange={this.walletChangeHandler}
              options={this.state.walletOptions}
            />
            {this.state.selectedWallet ?
              (<div>
                <h2>Wallet Details: {this.state.selectedWallet.label}</h2>
                <p>Address: {this.state.selectedWallet.value.address}</p>
                <p>ETH Balance: {this.state.selectedWallet.value.ETHBalance} </p>
                <p>TST Balance: {this.state.selectedWallet.value.TSTBalance} </p>
                {this.state.walletSet ? (
                  <div>
                    <p>
                      <button className="btn" onClick={this.toggleKey}>
                        {this.state.toggleKey ? <span>Hide Browser Wallet Mnemonic</span> : <span>Reveal Browser Wallet Mnemonic</span>}
                      </button>
                      {this.state.toggleKey ? <span>{this.getKey()}</span> : null}
                    </p>
                    <button className="btn" onClick={() => this.createWallet()}>
                      Create New Browser Wallet
                  </button>
                  </div>
                ) : (
                    <div>
                      Enter your private key. If you do not have a wallet, leave blank and we'll create one for you.
                  <div>
                        <input defaultValue={""} onChange={evt => this.updateWalletHandler(evt)} />
                      </div>
                      <button className="btn">Get wallet</button>
                    </div>
                  )}
              </div>)
              :
              (<div><p>No wallet selected</p>
              </div>
              )
            }

          </div>

          <div className="column">
            <h2 style={{ fontFamily: 'Comfortaa' }}>Channel Information</h2>
            <div>
              <span style={{ fontWeight: "bold" }}>User Wei Balance:</span> {this.state.channelState ? this.state.channelState.balanceWeiUser : null}
              <br />
              <span style={{ fontWeight: "bold" }}>User Token Balance: </span>{this.state.channelState ? this.state.channelState.balanceTokenUser : null}
              <br />
            </div>
            <div>
              <span style={{ fontWeight: "bold" }}>Hub Wei Balance: </span> {this.state.channelState ? this.state.channelState.balanceWeiHub : null}
              <br />
              <span style={{ fontWeight: "bold" }}>Hub Token Balance:</span> {this.state.channelState ? this.state.channelState.balanceTokenHub : null}
            </div>
            <p>Token Address: {tokenAddress}</p>
          </div>
        </div>
      </div>
    );
  }
}

export default App;
