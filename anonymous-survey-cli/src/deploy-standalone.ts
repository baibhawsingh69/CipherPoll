// SPDX-License-Identifier: Apache-2.0
// Programmatic Standalone Deployment Script

import { createLogger } from './logger-utils.js';
import { StandaloneConfig } from './config.js';
import { AnonymousSurveyAPI } from '../../api/src/index.js';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { MidnightWalletProvider } from './midnight-wallet-provider.js';
import { unshieldedToken } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { waitForUnshieldedFunds } from './wallet-utils.js';

const GENESIS_MINT_WALLET_SEED = '0000000000000000000000000000000000000000000000000000000000000001';

async function main() {
  console.log('--------------------------------------------------');
  console.log('🚀 Executing Standalone Contract Deployment...');
  console.log('--------------------------------------------------');

  const config = new StandaloneConfig();
  const logger = await createLogger(config.logDir);
  const testEnv = config.getEnvironment(logger);
  const envConfiguration = await testEnv.start();

  console.log('[1/4] Initializing Wallet with Genesis Funds...');
  const walletProvider = await MidnightWalletProvider.build(logger, envConfiguration, GENESIS_MINT_WALLET_SEED);
  await walletProvider.start();
  await waitForUnshieldedFunds(logger, walletProvider.wallet, envConfiguration, unshieldedToken());

  console.log('[2/4] Initializing Local Proof & ZK Config Providers...');
  const zkConfigProvider = new NodeZkConfigProvider<'cast_anonymous_vote' | 'close_survey'>(config.zkConfigPath);
  const proofProvider = httpClientProofProvider(envConfiguration.proofServer, zkConfigProvider);

  const providers = {
    privateStateProvider: levelPrivateStateProvider({
      privateStateStoreName: 'anonymous-survey-standalone-deploy',
      signingKeyStoreName: 'anonymous-survey-standalone-deploy-signing-keys',
      privateStoragePasswordProvider: () => 'AnonSurvey-Deploy-2026!',
      accountId: GENESIS_MINT_WALLET_SEED,
    }),
    publicDataProvider: indexerPublicDataProvider(envConfiguration.indexer, envConfiguration.indexerWS),
    zkConfigProvider,
    proofProvider,
    walletProvider,
    midnightProvider: walletProvider,
  };

  console.log('[3/4] Deploying Compact Smart Contract...');
  const api = await AnonymousSurveyAPI.deploy(providers, logger);

  console.log('--------------------------------------------------');
  console.log('🎉 CONTRACT DEPLOYMENT SUCCESSFUL!');
  console.log(`Deployed Contract Address: ${api.deployedContractAddress}`);
  console.log('--------------------------------------------------');

  await walletProvider.stop();
  await testEnv.shutdown();
  process.exit(0);
}

main().catch(async (err) => {
  console.error('Standalone deployment error:', err);
  process.exit(1);
});
