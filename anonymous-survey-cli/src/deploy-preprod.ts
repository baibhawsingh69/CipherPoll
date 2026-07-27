// SPDX-License-Identifier: Apache-2.0
// Programmatic Preprod Contract Deployment Script with Full Wallet Sync & Faucet Support

import { createLogger } from './logger-utils.js';
import { PreprodRemoteConfig } from './config.js';
import { AnonymousSurveyAPI } from '../../api/src/index.js';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { MidnightWalletProvider } from './midnight-wallet-provider.js';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { syncWallet, waitForUnshieldedFunds } from './wallet-utils.js';
import { generateDust } from './generate-dust.js';
import { unshieldedToken } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import crypto from 'node:crypto';

const PROOF_SERVER_URL = process.env.PROOF_SERVER_URL || 'https://proof-server.preprod.midnight.network';
const INDEXER_URL = 'https://indexer.preprod.midnight.network/api/v4/graphql';
const INDEXER_WS = 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws';
const USER_MNEMONIC = 'gift excuse found hat elegant ivory toy jump across student captain wide twenty milk beauty survey trick brush latin answer item orange street learn';

function mnemonicToSeedHex(mnemonic: string): string {
  const seedBuffer = crypto.pbkdf2Sync(mnemonic.trim(), 'mnemonic', 2048, 64, 'sha512');
  return seedBuffer.toString('hex').slice(0, 64);
}

async function main() {
  console.log('--------------------------------------------------');
  console.log('🚀 Executing CLI Deployment on Midnight Preprod...');
  console.log(`Proof Server: ${PROOF_SERVER_URL}`);
  console.log('--------------------------------------------------');

  setNetworkId('preprod');
  const config = new PreprodRemoteConfig();
  const logger = await createLogger(config.logDir);

  const envConfiguration = {
    walletNetworkId: 'preprod',
    networkId: 'preprod',
    indexer: INDEXER_URL,
    indexerWS: INDEXER_WS,
    node: 'https://rpc.preprod.midnight.network',
    nodeWS: 'wss://rpc.preprod.midnight.network',
    faucet: 'https://midnight-tmnight-preprod.nethermind.dev/',
    proofServer: PROOF_SERVER_URL,
  };

  const masterSeedHex = mnemonicToSeedHex(USER_MNEMONIC);
  console.log('[1/5] Building Midnight Wallet Provider...');
  const walletProvider = await MidnightWalletProvider.build(logger, envConfiguration, masterSeedHex);
  await walletProvider.start();

  console.log('[2/5] Syncing wallet state with Preprod indexer...');
  const unshieldedState = await waitForUnshieldedFunds(
    logger,
    walletProvider.wallet,
    envConfiguration,
    unshieldedToken(),
    true, // auto-request faucet if needed
    1000
  );

  console.log('[3/5] Generating Dust Registration Transaction...');
  try {
    const dustTx = await generateDust(logger, masterSeedHex, unshieldedState, walletProvider.wallet);
    if (dustTx) {
      console.log(`Dust registered: ${dustTx}`);
      await syncWallet(logger, walletProvider.wallet);
    }
  } catch (err: any) {
    console.log(`Dust status note: ${err.message || err}`);
  }

  console.log('[4/5] Preparing ZK Proof Material...');
  const zkConfigProvider = new NodeZkConfigProvider<'cast_anonymous_vote' | 'close_survey'>(config.zkConfigPath);
  const proofProvider = httpClientProofProvider(PROOF_SERVER_URL, zkConfigProvider);

  const providers = {
    privateStateProvider: levelPrivateStateProvider({
      privateStateStoreName: 'anonymous-survey-preprod-deploy',
      signingKeyStoreName: 'anonymous-survey-preprod-deploy-signing-keys',
      privateStoragePasswordProvider: () => 'AnonSurvey-Deploy-2026!',
      accountId: masterSeedHex,
    }),
    publicDataProvider: indexerPublicDataProvider(INDEXER_URL, INDEXER_WS),
    zkConfigProvider,
    proofProvider,
    walletProvider,
    midnightProvider: walletProvider,
  };

  console.log('[5/5] Deploying Compact Smart Contract to Preprod...');
  const api = await AnonymousSurveyAPI.deploy(providers, logger);

  console.log('--------------------------------------------------');
  console.log('🎉 CONTRACT DEPLOYMENT SUCCESSFUL!');
  console.log(`Deployed Contract Address: ${api.deployedContractAddress}`);
  console.log('--------------------------------------------------');

  await walletProvider.stop();
  process.exit(0);
}

main().catch((err) => {
  console.error('Deployment process stopped:', err);
  process.exit(1);
});
