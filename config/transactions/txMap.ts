import { Transaction, PromiseWithError, NO_ERROR } from "../interfaces";
import { BridgeTransactionParams } from "@/hooks/bridge/interfaces/hookParams";
import {
  bridgeInTx,
  bridgeOutTx,
  validateBridgeInRetryParams,
  validateBridgeOutRetryParams,
} from "@/hooks/bridge/transactions/bridge";
import { CTokenLendingTransactionParams } from "@/hooks/lending/interfaces/lendingTxTypes";
import {
  cTokenLendingTx,
  validateCTokenLendingRetryParams,
} from "@/hooks/lending/transactions/lending";
import { PairsTransactionParams } from "@/hooks/pairs/interfaces/pairsTxTypes";
import { lpPairTx } from "@/hooks/pairs/transactions/pairsTx";

export enum TransactionFlowType {
  BRIDGE_IN = "BRIDGE_IN",
  BRIDGE_OUT = "BRIDGE_OUT",
  CLM_CTOKEN_TX = "CLM_CTOKEN_TX",
  DEX_LP_TX = "DEX_LP_TX",
}

export const TRANSACTION_FLOW_MAP: {
  [key in TransactionFlowType]: {
    validRetry: (...params: any[]) => PromiseWithError<{
      valid: boolean;
      error?: string;
    }>;
    tx: (...params: any[]) => PromiseWithError<Transaction[]>;
  };
} = {
  [TransactionFlowType.BRIDGE_IN]: {
    validRetry: async (params: BridgeTransactionParams) =>
      validateBridgeInRetryParams(params),
    tx: async (params: BridgeTransactionParams) => bridgeInTx(params),
  },
  [TransactionFlowType.BRIDGE_OUT]: {
    validRetry: async (params: BridgeTransactionParams) =>
      validateBridgeOutRetryParams(params),
    tx: async (params: BridgeTransactionParams) => bridgeOutTx(params),
  },
  [TransactionFlowType.CLM_CTOKEN_TX]: {
    validRetry: async (params: CTokenLendingTransactionParams) =>
      validateCTokenLendingRetryParams(params),
    tx: async (params: CTokenLendingTransactionParams) =>
      cTokenLendingTx(params),
  },
  [TransactionFlowType.DEX_LP_TX]: {
    validRetry: async (params: PairsTransactionParams) =>
      NO_ERROR({ valid: true }),
    tx: async (params: PairsTransactionParams) => lpPairTx(params),
  },
};
