// SPDX-License-Identifier: Apache-2.0
// Deployment script for CipherPoll on Midnight Preprod using pre-synced Umbra WalletFacade

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Buffer } from 'buffer';

import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import * as ledger from '@midnight-ntwrk/midnight-js-protocol/ledger';
import {
  WalletFacade,
  DustWallet,
  HDWallet,
  Roles,
  ShieldedWallet,
  createKeystore,
  NoOpTransactionHistoryStorage,
  PublicKey,
  UnshieldedWallet,
} from '@midnight-ntwrk/wallet-sdk';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { u8aToHex } from '@polkadot/util';

import * as AnonymousSurvey from '../../contract/src/managed/anonymous-survey/contract/index.js';
import { witnesses, createAnonymousSurveyPrivateState } from '../../contract/src/witnesses.js';

const UMBRA_PREPROD_SEED = '61c9e170b4c478edf99bc7025aec88fd5eb31904eed5e863a5f584d76d37b5bb';
const INDEXER_URL = 'https://indexer.preprod.midnight.network/api/v4/graphql';
const INDEXER_WS = 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws';
const NODE_URL = 'https://rpc.midnight-preprod.blockfrost.io?project_id=nightpreprod2PcFVTAw9hyCidUguT0NccoE5h6DJi39';
const NODE_WS = 'wss://rpc.midnight-preprod.blockfrost.io/ws?project_id=nightpreprod2PcFVTAw9hyCidUguT0NccoE5h6DJi39';
const PROOF_SERVER_URL = process.env.PROOF_SERVER_URL || 'https://proof-server.preprod.midnight.network';
const PRIVATE_STATE_ID = 'anonymousSurveyPrivateState';

function makeInBlockSubmissionService(nodeWsUrl: string) {
  let apiPromise: Promise<ApiPromise> | null = null;
  const getApi = (): Promise<ApiPromise> => {
    if (!apiPromise) {
      apiPromise = ApiPromise.create({
        provider: new WsProvider(nodeWsUrl),
        throwOnConnect: false,
        noInitWarn: true,
      });
    }
    return apiPromise;
  };

  return {
    async submitTransaction(tx: { serialize(): Uint8Array }) {
      const api = await getApi();
      const hex = u8aToHex(tx.serialize());
      const ext = (api.tx as any).midnight.sendMnTransaction(hex);

      return new Promise((resolve, reject) => {
        let unsub: (() => void) | undefined;
        let settled = false;
        const done = (fn: () => void) => {
          if (settled) return;
          settled = true;
          try { unsub?.(); } catch {}
          fn();
        };

        ext
          .send((result: any) => {
            const { status } = result;
            if (result.dispatchError) {
              let msg = result.dispatchError.toString();
              if (result.dispatchError.isModule) {
                try {
                  const d = api.registry.findMetaError(result.dispatchError.asModule);
                  msg = `${d.section}.${d.name}: ${d.docs.join(' ')}`;
                } catch {}
              }
              done(() => reject(new Error(`Transaction dispatch error: ${msg}`)));
              return;
            }
            if (status?.isInBlock) {
              done(() => resolve({ status: 'InBlock', blockHash: status.asInBlock.toString(), txHash: result.txHash?.toString() }));
            } else if (status?.isFinalized) {
              done(() => resolve({ status: 'Finalized', blockHash: status.asFinalized.toString(), txHash: result.txHash?.toString() }));
            } else if (status?.isInvalid) {
              done(() => reject(new Error('Transaction reported Invalid by node')));
            } else if (status?.isDropped) {
              done(() => reject(new Error('Transaction Dropped')));
            }
          })
          .then((u: () => void) => { unsub = u; })
          .catch((e: any) => done(() => reject(e instanceof Error ? e : new Error(String(e)))));
      });
    },
    async close() {
      if (apiPromise) {
        try {
          const api = await apiPromise;
          await api.disconnect();
        } catch {}
        apiPromise = null;
      }
    },
  };
}

function deriveKeys(seed: string) {
  const hdWallet = HDWallet.fromSeed(Buffer.from(seed, 'hex'));
  if (hdWallet.type !== 'seedOk') throw new Error('Invalid seed');
  const result = hdWallet.hdWallet
    .selectAccount(0)
    .selectRoles([Roles.Zswap, Roles.NightExternal, Roles.Dust])
    .deriveKeysAt(0);
  if (result.type !== 'keysDerived') throw new Error('Key derivation failed');
  hdWallet.hdWallet.clear();
  return result.keys;
}

function readVersionedState<T>(file: string): T | undefined {
  if (!fs.existsSync(file)) return undefined;
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf-8'));
    return parsed?.state;
  } catch {
    return undefined;
  }
}

async function main() {
  console.log('--------------------------------------------------');
  console.log('🚀 Deploying CipherPoll Contract to Preprod via WalletFacade...');
  console.log(`Proof Server: ${PROOF_SERVER_URL}`);
  console.log('--------------------------------------------------');

  setNetworkId('preprod');

  const keys = deriveKeys(UMBRA_PREPROD_SEED);
  const shieldedSecretKeys = ledger.ZswapSecretKeys.fromSeed(keys[Roles.Zswap]);
  const dustSecretKey = ledger.DustSecretKey.fromSeed(keys[Roles.Dust]);
  const unshieldedKeystore = createKeystore(keys[Roles.NightExternal], 'preprod');

  const stateDir = path.resolve(process.cwd(), '..', 'state', 'preprod', '.midnight-wallet-state');
  const savedShielded = readVersionedState(path.join(stateDir, 'shielded.json'));
  const savedUnshielded = readVersionedState(path.join(stateDir, 'unshielded.json'));
  const savedDust = readVersionedState<string>(path.join(stateDir, 'dust.json'));

  const submissionSvc = makeInBlockSubmissionService(NODE_WS);

  const walletConfig = {
    networkId: 'preprod',
    indexerClientConnection: { indexerHttpUrl: INDEXER_URL, indexerWsUrl: INDEXER_WS },
    provingServerUrl: new URL(PROOF_SERVER_URL),
    relayURL: new URL(NODE_WS),
    txHistoryStorage: new NoOpTransactionHistoryStorage(),
    costParameters: { additionalFeeOverhead: 300_000_000_000_000n, feeBlocksMargin: 5 },
    batchUpdates: { size: 10000, timeout: 10, spacing: 0 },
  };

  console.log('[1/4] Initializing WalletFacade with restored preprod state...');
  console.log(`  State Dir: ${stateDir}`);
  console.log(`  Saved Shielded Present: ${savedShielded !== undefined}`);
  console.log(`  Saved Unshielded Present: ${savedUnshielded !== undefined}`);
  console.log(`  Saved Dust Present: ${savedDust !== undefined}`);

  const wallet = await WalletFacade.init({
    configuration: walletConfig,
    submissionService: () => submissionSvc as any,
    shielded: async (config) => {
      console.log('  -> Restoring ShieldedWallet...');
      const cls = ShieldedWallet(config);
      if (savedShielded !== undefined) {
        try {
          const res = await (cls as any).restore(savedShielded);
          console.log('  ✓ ShieldedWallet restored!');
          return res;
        } catch (err) {
          console.warn('Shielded restore warning:', err);
        }
      }
      return cls.startWithSecretKeys(shieldedSecretKeys);
    },
    unshielded: async (config) => {
      console.log('  -> Restoring UnshieldedWallet...');
      const cls = UnshieldedWallet(config);
      if (savedUnshielded !== undefined) {
        try {
          const res = await (cls as any).restore(savedUnshielded);
          console.log('  ✓ UnshieldedWallet restored!');
          return res;
        } catch (err) {
          console.warn('Unshielded restore warning:', err);
        }
      }
      return cls.startWithPublicKey(PublicKey.fromKeyStore(unshieldedKeystore));
    },
    dust: async (config) => {
      console.log('  -> Restoring DustWallet...');
      const cls = DustWallet(config);
      if (savedDust !== undefined) {
        try {
          const res = await (cls as any).restore(savedDust);
          console.log('  ✓ DustWallet restored!');
          return res;
        } catch (err) {
          console.warn('Dust restore warning:', err);
        }
      }
      return cls.startWithSecretKey(dustSecretKey, ledger.LedgerParameters.initialParameters().dust);
    },
  });

  console.log('[2/4] Starting WalletFacade...');
  await wallet.start(shieldedSecretKeys, dustSecretKey);

  console.log('[3/4] Syncing wallet with network...');
  let lastState: any = null;
  const stateSub = wallet.state().subscribe((s) => {
    lastState = s;
  });
  const syncInterval = setInterval(() => {
    if (lastState) {
      const uProgress = lastState.unshielded?.progress;
      const sProgress = lastState.shielded?.progress;
      const dProgress = lastState.dust?.progress;
      const uIndex = uProgress ? `${uProgress.appliedId}/${uProgress.highestTransactionId}` : 'syncing';
      const sIndex = sProgress ? `${sProgress.appliedIndex}/${sProgress.highestIndex}` : 'syncing';
      const dIndex = dProgress ? `${dProgress.appliedIndex}/${dProgress.highestIndex}` : 'syncing';
      console.log(`⏳ Syncing [Unshielded: ${uIndex}, Shielded: ${sIndex}, Dust: ${dIndex}]`);
    } else {
      console.log('⏳ Syncing wallet...');
    }
  }, 5000);

  const state = await wallet.waitForSyncedState();
  clearInterval(syncInterval);
  stateSub.unsubscribe();
  const address = unshieldedKeystore.getBech32Address();
  const balance = state.unshielded.balances[ledger.unshieldedToken().raw] ?? 0n;
  console.log(`\n✓ Wallet Synced! Address: ${address}, Balance: ${balance} tNight\n`);

  const zkConfigPath = path.resolve(process.cwd(), '..', 'contract', 'src', 'managed', 'anonymous-survey');
  const zkConfigProvider = new NodeZkConfigProvider(zkConfigPath);
  const proofProvider = httpClientProofProvider(PROOF_SERVER_URL, zkConfigProvider);

  const walletProvider = {
    getCoinPublicKey: () => shieldedSecretKeys.coinPublicKey,
    getEncryptionPublicKey: () => shieldedSecretKeys.encryptionPublicKey,
    async balanceTx(tx: any, ttl?: Date) {
      const recipe = await wallet.balanceUnboundTransaction(
        tx,
        { shieldedSecretKeys, dustSecretKey },
        { ttl: ttl ?? new Date(Date.now() + 30 * 60 * 1000) },
      );
      return wallet.finalizeRecipe(recipe);
    },
    submitTx: (tx: any) => wallet.submitTransaction(tx) as any,
  };

  const providers = {
    privateStateProvider: levelPrivateStateProvider({
      midnightDbName: path.join(process.cwd(), '..', 'state', 'preprod', 'cipherpoll-level-db'),
      privateStateStoreName: 'anonymous-survey-state',
      accountId: address.toString(),
      privateStoragePasswordProvider: () => 'CipherPoll-Preprod-2026-Secret!',
    }),
    publicDataProvider: indexerPublicDataProvider(INDEXER_URL, INDEXER_WS),
    zkConfigProvider,
    proofProvider,
    walletProvider,
    midnightProvider: walletProvider,
  };

  const compiledContract = CompiledContract.make('anonymous-survey', AnonymousSurvey.Contract).pipe(
    CompiledContract.withWitnesses(witnesses as never),
    CompiledContract.withCompiledFileAssets(zkConfigPath),
  );

  console.log('Deploying AnonymousSurvey contract...');
  const deployed = await deployContract(providers, {
    compiledContract: compiledContract as any,
    privateStateId: PRIVATE_STATE_ID,
    initialPrivateState: createAnonymousSurveyPrivateState(crypto.randomBytes(32)),
  });

  const contractAddress = deployed.deployTxData.public.contractAddress;
  console.log('--------------------------------------------------');
  console.log('🎉 CIPHERPOLL CONTRACT DEPLOYED SUCCESSFULLY!');
  console.log(`Deployed Contract Address: ${contractAddress}`);
  console.log('--------------------------------------------------');

  // Save deployed contract address to a JSON file in state/preprod/deployment.json
  const deployInfo = {
    network: 'preprod',
    contractAddress,
    deployer: address.toString(),
    deployedAt: new Date().toISOString(),
  };
  const deployFile = path.resolve(process.cwd(), '..', 'state', 'preprod', 'deployment.json');
  fs.writeFileSync(deployFile, JSON.stringify(deployInfo, null, 2));
  console.log(`Saved deployment info to ${deployFile}`);

  await submissionSvc.close();
  await wallet.stop();
  process.exit(0);
}

main().catch((err) => {
  console.error('Deployment failed:', err);
  process.exit(1);
});
