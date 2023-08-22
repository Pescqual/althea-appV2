import { useState } from "react";
import { MAIN_BRIDGE_NETWORKS, TEST_BRIDGE_NETWORKS } from "./config/networks";
import { CANTO_MAINNET_EVM, CANTO_TESTNET_EVM } from "@/config/networks";
import BRIDGE_IN_TOKEN_LIST from "@/config/jsons/bridgeInTokens.json";
import {
  NEW_ERROR,
  NO_ERROR,
  PromiseWithError,
  ReturnWithError,
} from "@/config/interfaces/errors";
import {
  BridgeHookInputParams,
  BridgeHookReturn,
  BridgeHookState,
} from "./interfaces/hookParams";
import useAutoSelect from "../helpers/useAutoSelect";
import {
  BaseNetwork,
  CosmosNetwork,
  EVMNetwork,
} from "@/config/interfaces/networks";
import { BridgeToken, BridgingMethod, IBCToken } from "./interfaces/tokens";
import { Transaction } from "@/config/interfaces/transactions";
import { bridgeInGravity } from "./transactions/gravityBridge";
import { bridgeLayerZero } from "./transactions/layerZero";
import useTokenBalances from "../helpers/useTokenBalances";
import { ibcInKeplr } from "./transactions/keplr/ibcKeplr";
import { isCosmosNetwork, isEVMNetwork } from "@/utils/networks.utils";

export default function useBridgeIn(
  props: BridgeHookInputParams
): BridgeHookReturn {
  // initial state with props
  const initialState: BridgeHookState = {
    // all options
    availableNetworks: props.testnet
      ? TEST_BRIDGE_NETWORKS
      : MAIN_BRIDGE_NETWORKS,
    availableTokens: [],
    availableMethods: [],
    // default selections
    toNetwork: props.testnet ? CANTO_TESTNET_EVM : CANTO_MAINNET_EVM,
    fromNetwork: null,
    selectedToken: null,
    selectedMethod: null,
  };

  // state of the entire hook that will be exposed
  const [state, setState] = useState<BridgeHookState>(initialState);

  ///
  /// internal hooks
  ///

  // contains object mapping of the token balances
  const userTokenBalances = useTokenBalances(
    state.fromNetwork?.chainId,
    state.availableTokens,
    props.userEthAddress,
    props.userCosmosAddress
  );
  // will autoselect the first available network (only network can have default since loaded once)
  useAutoSelect(state.availableNetworks, setNetwork, props.defaults?.networkId);
  // will autoselect the first available token
  useAutoSelect(state.availableTokens, setToken);
  // will autoselect the first available method
  useAutoSelect(state.availableMethods, setMethod);

  ///
  /// internal functions
  ///

  function getNetwork(id: string): ReturnWithError<BaseNetwork> {
    const network = state.availableNetworks.find(
      (network) => network.id === id
    );
    return network
      ? NO_ERROR(network)
      : NEW_ERROR("useBridgeIn::getNetwork: network not found:" + id);
  }
  function getToken(id: string): ReturnWithError<BridgeToken> {
    const token = state.availableTokens.find((token) => token.id === id);
    return token
      ? NO_ERROR(token)
      : NEW_ERROR("useBridgeIn::getToken: token not found:" + id);
  }

  ///
  /// external setter functions
  ///

  // sets network and finds tokens for that network
  function setNetwork(id: string): void {
    //make sure new network was actually selected
    if (state.fromNetwork?.id === id) return;

    const { data: network, error: networkError } = getNetwork(id);
    if (networkError) {
      throw new Error("useBridgeIn::setNetwork::" + networkError.message);
    }
    const tokens = BRIDGE_IN_TOKEN_LIST.chainTokenList[
      network.id as keyof typeof BRIDGE_IN_TOKEN_LIST.chainTokenList
    ] as BridgeToken[];
    if (!tokens || tokens.length === 0) {
      throw new Error(
        "useBridgeIn::setNetwork: No tokens available for network: " +
          network.id
      );
    }
    setState((prevState) => ({
      ...prevState,
      fromNetwork: network,
      availableTokens: tokens,
      // reset token and method selections
      selectedToken: null,
      availableMethods: [],
      selectedMethod: null,
    }));
  }

  // sets selected token and loads bridging methods for that token
  function setToken(id: string): void {
    //make sure new token was actually selected
    if (state.selectedToken?.id === id) return;

    const { data: token, error: tokenError } = getToken(id);
    if (tokenError) {
      throw new Error("useBridgeIn::setToken::" + tokenError.message);
    }
    const bridgeMethods = token.bridgeMethods;
    if (!bridgeMethods || bridgeMethods.length === 0) {
      throw new Error(
        "useBridgeIn::setToken: No bridging methods available for token: " +
          token.id
      );
    }
    setState((prevState) => ({
      ...prevState,
      selectedToken: token,
      availableMethods: bridgeMethods as BridgingMethod[],
      // reset method selection
      selectedMethod: null,
    }));
  }

  // sets selected bridging method only it actually exists on the token
  function setMethod(selectMethod: string): void {
    const method = selectMethod as BridgingMethod;
    //make sure new method was actually selected
    if (method === state.selectedMethod) return;

    if (!state.availableMethods.includes(method)) {
      throw new Error("useBridgeIn::setMethod: Invalid method: " + method);
    }
    setState((prevState) => ({
      ...prevState,
      selectedMethod: method,
    }));
  }

  ///
  /// external functions
  ///
  async function bridgeIn(
    ethAccount: string,
    amount: string
  ): PromiseWithError<Transaction[]> {
    // check basic parameters to make sure they exist
    if (!state.selectedToken) {
      return NEW_ERROR("useBridgeIn::bridgeIn: no token selected");
    }
    if (!state.fromNetwork || !state.toNetwork) {
      return NEW_ERROR("useBridgeIn::bridgeIn: network undefined");
    }

    let transactions: ReturnWithError<Transaction[]>;
    // check the selected method to figure out how to create tx
    switch (state.selectedMethod) {
      case BridgingMethod.GRAVITY_BRIDGE:
        // check to make sure EVM network is selected
        const gbridgeEVM = isEVMNetwork(state.fromNetwork);
        if (!gbridgeEVM) {
          return NEW_ERROR(
            "useBridgeIn::bridgeIn: gravity bridge only works for EVM networks"
          );
        }
        transactions = await bridgeInGravity(
          Number(state.fromNetwork.chainId),
          ethAccount,
          state.selectedToken,
          amount
        );
        break;
      case BridgingMethod.LAYER_ZERO:
        const lzFromEVM = isEVMNetwork(state.fromNetwork);
        const lzToEVM = isEVMNetwork(state.toNetwork);
        if (!(lzFromEVM && lzToEVM)) {
          return NEW_ERROR(
            "useBridgeIn::bridgeIn: layer zero only works for EVM networks"
          );
        }
        transactions = await bridgeLayerZero(
          state.fromNetwork as EVMNetwork,
          state.toNetwork as EVMNetwork,
          ethAccount,
          state.selectedToken,
          amount
        );
        break;
      case BridgingMethod.IBC: {
        const ibcFromCosmos = isCosmosNetwork(state.fromNetwork);
        if (!ibcFromCosmos) {
          return NEW_ERROR(
            "useBridgeIn::bridgeIn: IBC only works for Cosmos networks"
          );
        }
        transactions = await ibcInKeplr(
          state.fromNetwork as CosmosNetwork,
          "cosmos address",
          ethAccount,
          state.selectedToken as IBCToken,
          amount
        );
        break;
      }
      default:
        transactions = NEW_ERROR(
          "useBridgeIn::bridgeIn: invalid method: " + state.selectedMethod
        );
        break;
    }
    if (transactions.error) {
      return NEW_ERROR("useBridgeIn::bridgeIn::" + transactions.error.message);
    }
    return transactions;
  }

  return {
    testnet: props.testnet ?? false,
    allOptions: {
      networks: state.availableNetworks,
      tokens: state.availableTokens.map((token) => {
        const balance = userTokenBalances[token.id];
        return balance !== undefined ? { ...token, balance } : token;
      }),
      methods: state.availableMethods,
    },
    selections: {
      toNetwork: state.toNetwork,
      fromNetwork: state.fromNetwork,
      token: state.selectedToken,
      method: state.selectedMethod,
    },
    setters: {
      network: setNetwork,
      token: setToken,
      method: setMethod,
    },
    bridge: bridgeIn,
  };
}
