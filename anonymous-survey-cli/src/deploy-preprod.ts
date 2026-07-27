// SPDX-License-Identifier: Apache-2.0
// Programmatic Deployment Script for Midnight Preprod Network

import { createLogger } from './logger-utils.js';
import { PreprodRemoteConfig } from './config.js';
import { AnonymousSurveyAPI } from '../../api/src/index.js';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { MidnightWalletProvider } from './midnight-wallet-provider.js';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import crypto from 'node:crypto';

const PROOF_SERVER_URL = process.env.PROOF_SERVER_URL || 'https://proof-server.preprod.midnight.network';
const INDEXER_URL = 'https://indexer.preprod.midnight.network/api/v4/graphql';
const INDEXER_WS = 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws';
const BLOCKFROST_KEY = 'nightpreprod2PcFVTAw9hyCidUguT0NccoE5h6DJi39';
const WALLET_ADDR = 'mn_addr_preprod1l2jzh0y35th6dj2f2zx0mjce6ad3sx24f4fg484syhmnaaavww9s62fsxl';
const USER_MNEMONIC = 'gift excuse found hat elegant ivory toy jump across student captain wide twenty milk beauty survey trick brush latin answer item orange street learn';

function mnemonicToSeedHex(mnemonic: string): string {
  const seedBuffer = crypto.pbkdf2Sync(mnemonic.trim(), 'mnemonic', 2048, 64, 'sha512');
  return seedBuffer.toString('hex').slice(0, 64);
}

async function main() {
  console.log('--------------------------------------------------');
  console.log('🚀 Deploying Anonymous Survey Contract to Preprod via CLI');
  console.log(`Wallet Address: ${WALLET_ADDR}`);
  console.log(`Proof Server: ${PROOF_SERVER_URL}`);
  console.log(`Blockfrost Key: ${BLOCKFROST_KEY.slice(0, 12)}...`);
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
  console.log(`[1/4] Initializing Midnight Wallet Provider with derived master seed hex (${masterSeedHex.slice(0, 16)}...)...`);
  
  const walletProvider = await MidnightWalletProvider.build(logger, envConfiguration, masterSeedHex);
  await walletProvider.start();

  console.log(`[2/4] Initializing ZK Key Material & Proof Provider...`);
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

  console.log(`[3/4] Compiling and Executing Contract Deployment Circuit...`);
  try {
    const api = await AnonymousSurveyAPI.deploy(providers, logger);
    console.log('--------------------------------------------------');
    console.log('🎉 CONTRACT DEPLOYMENT SUCCESSFUL!');
    console.log(`Deployed Contract Address: ${api.deployedContractAddress}`);
    console.log('--------------------------------------------------');
    await walletProvider.stop();
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Deployment status:', err.message || err);
    await walletProvider.stop();
    process.exit(0);
  }
}

main().catch(console.error);
