// SPDX-License-Identifier: Apache-2.0
// Anonymous Survey CLI Driver

import { createInterface, type Interface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { WebSocket } from 'ws';
import {
  AnonymousSurveyAPI,
  type AnonymousSurveyDerivedState,
  anonymousSurveyPrivateStateKey,
  type AnonymousSurveyProviders,
  type DeployedAnonymousSurveyContract,
  type PrivateStateId,
} from '../../api/src/index.js';
import { type WalletFacade } from '@midnight-ntwrk/wallet-sdk-facade';
import { ledger, type Ledger, SurveyState } from '../../contract/src/managed/anonymous-survey/contract/index.js';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { type Logger } from 'pino';
import { type Config, StandaloneConfig } from './config.js';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { type ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { assertIsContractAddress, toHex } from '@midnight-ntwrk/midnight-js-utils';
import { TestEnvironment } from '@midnight-ntwrk/testkit-js';
import { MidnightWalletProvider } from './midnight-wallet-provider.js';
import { randomBytes } from '../../api/src/utils/index.js';
import { unshieldedToken } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { syncWallet, waitForUnshieldedFunds } from './wallet-utils.js';
import { generateDust } from './generate-dust.js';
import { AnonymousSurveyPrivateState } from '../../contract/src/witnesses.js';

// @ts-expect-error: Needed for WebSocket in apollo/ws environment
globalThis.WebSocket = WebSocket;

export const getAnonymousSurveyLedgerState = async (
  providers: AnonymousSurveyProviders,
  contractAddress: ContractAddress,
): Promise<Ledger | null> => {
  assertIsContractAddress(contractAddress);
  const contractState = await providers.publicDataProvider.queryContractState(contractAddress);
  return contractState != null ? ledger(contractState.data) : null;
};

const DEPLOY_OR_JOIN_QUESTION = `
You can do one of the following:
  1. Deploy a new Anonymous Survey contract
  2. Join an existing Anonymous Survey contract
  3. Exit
Which would you like to do? `;

const deployOrJoin = async (providers: AnonymousSurveyProviders, rli: Interface, logger: Logger): Promise<AnonymousSurveyAPI | null> => {
  let api: AnonymousSurveyAPI | null = null;
  while (true) {
    const choice = await rli.question(DEPLOY_OR_JOIN_QUESTION);
    switch (choice) {
      case '1':
        api = await AnonymousSurveyAPI.deploy(providers, logger);
        logger.info(`Deployed contract at address: ${api.deployedContractAddress}`);
        return api;
      case '2':
        api = await AnonymousSurveyAPI.join(providers, await rli.question('What is the contract address (in hex)? '), logger);
        logger.info(`Joined contract at address: ${api.deployedContractAddress}`);
        return api;
      case '3':
        logger.info('Exiting...');
        return null;
      default:
        logger.error(`Invalid choice: ${choice}`);
    }
  }
};

const displayLedgerState = async (
  providers: AnonymousSurveyProviders,
  deployedContract: DeployedAnonymousSurveyContract,
  logger: Logger,
): Promise<void> => {
  const contractAddress = deployedContract.deployTxData.public.contractAddress;
  const ledgerState = await getAnonymousSurveyLedgerState(providers, contractAddress);
  if (ledgerState === null) {
    logger.info(`There is no survey contract deployed at ${contractAddress}`);
  } else {
    const status = ledgerState.state === SurveyState.ACTIVE ? 'ACTIVE' : 'CLOSED';
    logger.info(`Survey status is: '${status}'`);
    logger.info(`Option 0 votes: ${ledgerState.option_0_votes}`);
    logger.info(`Option 1 votes: ${ledgerState.option_1_votes}`);
    logger.info(`Option 2 votes: ${ledgerState.option_2_votes}`);
    logger.info(`Option 3 votes: ${ledgerState.option_3_votes}`);
    logger.info(`Total votes cast: ${ledgerState.total_votes}`);
    logger.info(`Organizer PK is: '${toHex(ledgerState.organizer_pk)}'`);
  }
};

const MAIN_LOOP_QUESTION = `
You can do one of the following:
  1. Cast an Anonymous Vote (Option 0, 1, 2, or 3)
  2. Close Survey (Organizer only)
  3. Display current ledger state (public tally)
  4. Exit
Which would you like to do? `;

const mainLoop = async (providers: AnonymousSurveyProviders, rli: Interface, logger: Logger): Promise<void> => {
  const surveyApi = await deployOrJoin(providers, rli, logger);
  if (surveyApi === null) {
    return;
  }
  let currentState: AnonymousSurveyDerivedState | undefined;
  const subscription = surveyApi.state$.subscribe({
    next: (state: AnonymousSurveyDerivedState) => (currentState = state),
  });
  try {
    while (true) {
      const choice = await rli.question(MAIN_LOOP_QUESTION);
      try {
        switch (choice) {
          case '1': {
            const optStr = await rli.question(`Enter option index to vote (0, 1, 2, or 3): `);
            const opt = parseInt(optStr, 10);
            if (isNaN(opt) || opt < 0 || opt > 3) {
              logger.error('Invalid option selection');
            } else {
              await surveyApi.castVote(opt);
              logger.info('Anonymous vote submitted successfully via ZK proof!');
            }
            break;
          }
          case '2':
            await surveyApi.closeSurvey();
            logger.info('Survey closed successfully.');
            break;
          case '3':
            await displayLedgerState(providers, surveyApi.deployedContract, logger);
            break;
          case '4':
            logger.info('Exiting...');
            return;
          default:
            logger.error(`Invalid choice: ${choice}`);
        }
      } catch (e) {
        logError(logger, e);
        logger.info('Returning to main menu...');
      }
    }
  } finally {
    subscription.unsubscribe();
  }
};

const GENESIS_MINT_WALLET_SEED = '0000000000000000000000000000000000000000000000000000000000000001';

const buildWallet = async (config: Config, rli: Interface, logger: Logger): Promise<string | undefined> => {
  if (config instanceof StandaloneConfig) {
    return GENESIS_MINT_WALLET_SEED;
  }
  while (true) {
    const choice = await rli.question(`
You can do one of the following:
  1. Build a fresh wallet
  2. Build wallet from a seed
  3. Exit
Which would you like to do? `);
    switch (choice) {
      case '1':
        return toHex(randomBytes(32));
      case '2':
        return await rli.question('Enter your wallet seed: ');
      case '3':
        logger.info('Exiting...');
        return undefined;
      default:
        logger.error(`Invalid choice: ${choice}`);
    }
  }
};

export const run = async (config: Config, testEnv: TestEnvironment, logger: Logger): Promise<void> => {
  const rli = createInterface({ input, output, terminal: true });
  const providersToBeStopped: MidnightWalletProvider[] = [];
  try {
    const envConfiguration = await testEnv.start();
    logger.info(`Environment started with configuration: ${JSON.stringify(envConfiguration)}`);
    const seed = await buildWallet(config, rli, logger);
    if (seed === undefined) {
      return;
    }
    const walletProvider = await MidnightWalletProvider.build(logger, envConfiguration, seed);
    providersToBeStopped.push(walletProvider);
    const walletFacade: WalletFacade = walletProvider.wallet;

    await walletProvider.start();

    const unshieldedState = await waitForUnshieldedFunds(logger, walletFacade, envConfiguration, unshieldedToken());
    const nightBalance = unshieldedState.balances[unshieldedToken().raw];
    if (nightBalance === undefined) {
      logger.info('No funds received, exiting...');
      return;
    }
    logger.info(`Your NIGHT wallet balance is: ${nightBalance}`);

    if (config.generateDust) {
      const dustGeneration = await generateDust(logger, seed, unshieldedState, walletFacade);
      if (dustGeneration) {
        logger.info(`Submitted dust generation registration transaction: ${dustGeneration}`);
        await syncWallet(logger, walletFacade);
      }
    }

    const zkConfigProvider = new NodeZkConfigProvider<'cast_anonymous_vote' | 'close_survey'>(config.zkConfigPath);
    const providers: AnonymousSurveyProviders = {
      privateStateProvider: levelPrivateStateProvider<PrivateStateId, AnonymousSurveyPrivateState>({
        privateStateStoreName: config.privateStateStoreName,
        signingKeyStoreName: `${config.privateStateStoreName}-signing-keys`,
        privateStoragePasswordProvider: () => {
          return 'AnonSurvey-Test-2026!';
        },
        accountId: seed,
      }),
      publicDataProvider: indexerPublicDataProvider(envConfiguration.indexer, envConfiguration.indexerWS),
      zkConfigProvider: zkConfigProvider,
      proofProvider: httpClientProofProvider(envConfiguration.proofServer, zkConfigProvider),
      walletProvider: walletProvider,
      midnightProvider: walletProvider,
    };
    await mainLoop(providers, rli, logger);
  } catch (e) {
    logError(logger, e);
    logger.info('Exiting...');
  } finally {
    try {
      rli.close();
      rli.removeAllListeners();
    } catch (e) {
      logError(logger, e);
    } finally {
      try {
        for (const wallet of providersToBeStopped) {
          logger.info('Stopping wallet...');
          await wallet.stop();
        }
        if (testEnv) {
          logger.info('Stopping test environment...');
          await testEnv.shutdown();
        }
      } catch (e) {
        logError(logger, e);
      }
    }
  }
};

function logError(logger: Logger, e: unknown) {
  if (e instanceof Error) {
    logger.error(`Found error '${e.message}'`);
    logger.debug(`${e.stack}`);
  } else {
    logger.error(`Found error (unknown type)`);
  }
}
