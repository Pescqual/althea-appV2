import { NEW_ERROR, NO_ERROR, PromiseWithError } from "@/config/interfaces";
import { GRAVITY_BRIDGE, GRAVITY_BRIGDE_EVM } from "@/config/networks";
import { Chain, Sender } from "@/transactions/interfaces";

import { getCantoSenderObj, getGravitySenderObj } from "@/utils/cosmos";
import { getCosmosEIPChainObject, isCantoChainId } from "@/utils/networks";
import { ethToAlthea, ethToGravity } from "@gravity-bridge/address-converter";

type Context = {
  chainObj: Chain;
  senderObj: Sender;
};
export async function generateCosmosEIP712TxContext(
  chainId: number,
  ethAddress: string
): PromiseWithError<Context> {
  if (isCantoChainId(chainId)) {
    return generateCantoEIP712TxContext(chainId, ethAddress);
  } else if (chainId === GRAVITY_BRIGDE_EVM.chainId) {
    return generateGravityEIP712TxContext(ethAddress);
  }
  return NEW_ERROR("invalid chain id for eip712 context");
}

async function generateCantoEIP712TxContext(
  chainId: number,
  ethAddress: string
): PromiseWithError<Context> {
  try {
    /** convert eth address to address on cosmos chain */
    const altheaAddress = ethToAlthea(ethAddress);

    /** chain object */
    const { data: chainObj, error: chainObjError } =
      getCosmosEIPChainObject(chainId);
    if (chainObjError) throw chainObjError;

    /** sender object */
    const { data: senderObj, error: senderObjError } = await getCantoSenderObj(
      altheaAddress,
      chainId
    );
    if (senderObjError) throw senderObjError;

    /** return context */
    return NO_ERROR({
      chainObj,
      senderObj,
    });
  } catch (err) {
    return NEW_ERROR("generateCosmosEIP712TxContext", err);
  }
}

async function generateGravityEIP712TxContext(
  ethAddress: string
): PromiseWithError<Context> {
  try {
    /** convert eth address to gravity address */
    const gravityAddress = ethToGravity(ethAddress);

    /** chain obj */
    const chainObj = {
      chainId: GRAVITY_BRIGDE_EVM.chainId,
      cosmosChainId: GRAVITY_BRIDGE.chainId,
    };

    /** sender obj */
    const { data: senderObj, error: senderObjError } =
      await getGravitySenderObj(gravityAddress);
    if (senderObjError) throw senderObjError;

    /** return context */
    return NO_ERROR({
      chainObj,
      senderObj,
    });
  } catch (err) {
    return NEW_ERROR("generateGravityEIP712TxContext", err);
  }
}
