import { ApiPromise, WsProvider } from "@polkadot/api";
import { Keyring } from "@polkadot/keyring";
import { KeyringPair } from "@polkadot/keyring/types";
import stringToU8a from "@polkadot/util/string/toU8a";
import axios from "axios";
import { EpicSignature } from "modules/root";
import { combineEpics } from "redux-observable";
import { delay, filter, mapTo, mergeMap, pluck } from "rxjs/operators";
import { isActionOf } from "typesafe-actions";
import Toast from "ui/Toast";
import { Actions } from "../root-actions";
import { DotAccount } from "./store";

/** ===========================================================================
 * Epics
 * ============================================================================
 */

/**
 * Talk to Dave and Ankit about the server:
 */
const SERVER_URL = "https://ns3169927.ip-51-89-192.eu";

// const MOCK_DOT_ACCOUNT = {
//   balance: 13610592207537,
//   controllerKey: "5GvUXQYHU8WmjDTUmnZ686n9id5vVxSzUivf99dSPmjn1wYX",
//   stashKey: "F7BeW4g5ViG8xGJQAzguGPxiX9QNdoPNc3YqF1bV8d9XkVV",
// };

/**
 * Fetch Polkadot account.
 */
const fetchAccountEpic: EpicSignature = (action$, state$, deps) => {
  return action$.pipe(
    filter(isActionOf(Actions.fetchAccount)),
    mergeMap(async () => {
      try {
        const { address } = state$.value.ledger.ledger;
        const account = await fetchAccount(address);
        return Actions.fetchAccountSuccess(account);
      } catch (err) {
        return Actions.fetchAccountFailure();
      }
    }),
  );
};

/**
 * Set Polkadot account controller key.
 */
const setControllerEpic: EpicSignature = (action$, state$, deps) => {
  return action$.pipe(
    filter(isActionOf(Actions.setController)),
    mergeMap(async () => {
      try {
        const { seed, stakeAmount } = state$.value.polkadot;
        /**
         * Just use the stored seed to get a new account/stashKey from the
         * seed.
         */
        if (seed) {
          const { account, stashKey } = await createPolkadotAccountFromSeed(
            seed,
          );
          const bond = await setBond(account, stashKey, stakeAmount);
          return Actions.setControllerSuccess(bond);
        } else {
          throw new Error("No seed found!");
        }
      } catch (err) {
        console.log(err);
        Toast.warn("Failed to activate agent...");
        return Actions.setControllerFailure(err);
      }
    }),
  );
};

/**
 * Stake/Unstake epic.
 */
const stakeEpic: EpicSignature = (action$, state$, deps) => {
  return action$.pipe(
    filter(isActionOf(Actions.setPolkadotStake)),
    pluck("payload"),
    mergeMap(async () => {
      try {
        const { stashKey, stakeAmount } = state$.value.polkadot;
        const data = { newStaked: stakeAmount };
        const url = SERVER_URL;
        const response = await axios.post(`${url}/account/${stashKey}`, data);
        return Actions.setPolkadotStakeSuccess(response.data);
      } catch (err) {
        console.log(err);
        return Actions.setPolkadotStakeFailure(err);
      }
    }),
  );
};

/**
 * Delay and then set the transaction stage to CONFIRMED.
 */
const mockConfirmEpic: EpicSignature = (action$, state$, deps) => {
  return action$.pipe(
    filter(isActionOf(Actions.setTransactionStage)),
    pluck("payload"),
    filter(x => x === "SIGN"),
    filter(() => state$.value.polkadot.interactionType !== "ACTIVATE"),
    delay(3000),
    mapTo(Actions.setTransactionStage("CONFIRMED")),
  );
};

/** ===========================================================================
 * Utils
 * ============================================================================
 */

// Handy helper for emulating FlowJS style Opaque types. This is just so that
// type aliases cannot be interchanged. I.E: ControllerKey != StashKey.
type Opaque<K, V> = V & { __OPAQUE__: K };

// Ed25519 Pubkey.
type Pubkey = string;
type SecretKey = string;

interface Keypair {
  keyringPair: KeyringPair;
  mnemonic: string;
}

// Unique types for each kind of Pubkey Polkadot might use.
type ControllerKey = Opaque<"ControllerKey", Keypair>;
type StashKey = Opaque<"StashKey", Pubkey>;

export const createPolkadotAccountFromSeed = async (
  key: string,
): Promise<{ account: DotAccount; stashKey: any }> => {
  console.log(`Creating new Polkadot Account from Seed: ${key}`);
  const seed = key.padEnd(32, " ");
  const keyring: Keyring = new Keyring({ type: "ed25519", ss58Format: 2 });
  const stashKey = keyring.addFromSeed(stringToU8a(seed));
  const account = await fetchAccount(stashKey.address);
  console.log("Account Result:");
  console.log(account);
  return { account, stashKey };
};

const setBond = async (
  account: DotAccount,
  stashKey: KeyringPair,
  bond: string,
) => {
  console.log("Setting bond for account and stashKey:");
  console.log(account);
  console.log(stashKey);

  const { controllerKey } = account;
  const WS_PROVIDER_URL: string = "wss://kusama-rpc.polkadot.io/";
  const wsProvider = new WsProvider(WS_PROVIDER_URL);
  const api: ApiPromise = await ApiPromise.create({ provider: wsProvider });
  const result = await api.tx.staking
    .bond(controllerKey, bond, "Stash")
    .signAndSend(stashKey);

  console.log("Set Bond Result:");
  console.log(result);
  return result;
};

// const setController = async (account: DotAccount, stashKey: KeyringPair) => {
//   console.log("Setting controller for account and stashKey:");
//   console.log(account);
//   console.log(stashKey);

//   const { controllerKey } = account;
//   const WS_PROVIDER_URL: string = "wss://kusama-rpc.polkadot.io/";
//   const wsProvider = new WsProvider(WS_PROVIDER_URL);
//   const api: ApiPromise = await ApiPromise.create({ provider: wsProvider });

//   const hash = await api.tx.staking
//     .setController(controllerKey)
//     .signAndSend(stashKey);

//   console.log("Set Controller Result:");
//   console.log(hash);
//   return hash;
// };

const fetchAccount = async (stashKey: string): Promise<DotAccount> => {
  try {
    const url = `${SERVER_URL}/account/${stashKey}`;
    const response = await axios.get(url);
    return response.data;
  } catch (err) {
    console.error(`Error fetching account state: ${err.message}`);
    throw err;
  }
};

/** ===========================================================================
 * Export
 * ============================================================================
 */

export default combineEpics(
  fetchAccountEpic,
  setControllerEpic,
  stakeEpic,
  mockConfirmEpic,
);
