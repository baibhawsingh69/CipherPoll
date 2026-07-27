// SPDX-License-Identifier: Apache-2.0
// Anonymous Survey API Implementation

import * as AnonymousSurvey from '../../contract/src/managed/anonymous-survey/contract/index.js';
import { type ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { type Logger } from 'pino';
import {
  type AnonymousSurveyDerivedState,
  type AnonymousSurveyContract,
  type AnonymousSurveyProviders,
  type DeployedAnonymousSurveyContract,
  anonymousSurveyPrivateStateKey,
} from './common-types.js';
import { CompiledAnonymousSurveyContractContract } from '../../contract/src/index.js';
import * as utils from './utils/index.js';
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { combineLatest, map, tap, from, type Observable } from 'rxjs';
import { toHex } from '@midnight-ntwrk/midnight-js-utils';
import { AnonymousSurveyPrivateState, createAnonymousSurveyPrivateState } from '../../contract/src/witnesses.js';

export const CONTRACT_ADDRESS_PLACEHOLDER = "<YOUR_DEPLOYED_CONTRACT_ADDRESS>";

export interface DeployedAnonymousSurveyAPI {
  readonly deployedContractAddress: ContractAddress;
  readonly state$: Observable<AnonymousSurveyDerivedState>;

  castVote: (optionIndex: number) => Promise<void>;
  closeSurvey: () => Promise<void>;
}

export class AnonymousSurveyAPI implements DeployedAnonymousSurveyAPI {
  private constructor(
    public readonly deployedContract: DeployedAnonymousSurveyContract,
    providers: AnonymousSurveyProviders,
    private readonly logger?: Logger,
  ) {
    this.deployedContractAddress = deployedContract.deployTxData.public.contractAddress;
    providers.privateStateProvider.setContractAddress(this.deployedContractAddress);
    this.state$ = combineLatest(
      [
        providers.publicDataProvider.contractStateObservable(this.deployedContractAddress, { type: 'latest' }).pipe(
          map((contractState) => AnonymousSurvey.ledger(contractState.data)),
          tap((ledgerState) =>
            logger?.trace({
              ledgerStateChanged: {
                ledgerState: {
                  ...ledgerState,
                  state: ledgerState.state === AnonymousSurvey.SurveyState.ACTIVE ? 'active' : 'closed',
                  totalVotes: ledgerState.total_votes.toString(),
                },
              },
            }),
          ),
        ),
        from(providers.privateStateProvider.get(anonymousSurveyPrivateStateKey) as Promise<AnonymousSurveyPrivateState>),
      ],
      (ledgerState, privateState) => {
        const derivedOrganizerPk = AnonymousSurvey.pureCircuits.deriveOrganizerPk(privateState.secretKey);
        return {
          state: ledgerState.state,
          option0Votes: ledgerState.option_0_votes,
          option1Votes: ledgerState.option_1_votes,
          option2Votes: ledgerState.option_2_votes,
          option3Votes: ledgerState.option_3_votes,
          totalVotes: ledgerState.total_votes,
          isOrganizer: toHex(ledgerState.organizer_pk) === toHex(derivedOrganizerPk),
        };
      },
    );
  }

  readonly deployedContractAddress: ContractAddress;
  readonly state$: Observable<AnonymousSurveyDerivedState>;

  async castVote(optionIndex: number): Promise<void> {
    this.logger?.info(`castingAnonymousVote for option: ${optionIndex}`);
    const txData = await this.deployedContract.callTx.cast_anonymous_vote(BigInt(optionIndex));
    this.logger?.trace({
      transactionAdded: {
        circuit: 'cast_anonymous_vote',
        txHash: txData.public.txHash,
        blockHeight: txData.public.blockHeight,
      },
    });
  }

  async closeSurvey(): Promise<void> {
    this.logger?.info('closingSurvey');
    const txData = await this.deployedContract.callTx.close_survey();
    this.logger?.trace({
      transactionAdded: {
        circuit: 'close_survey',
        txHash: txData.public.txHash,
        blockHeight: txData.public.blockHeight,
      },
    });
  }

  static async deploy(providers: AnonymousSurveyProviders, logger?: Logger): Promise<AnonymousSurveyAPI> {
    logger?.info('deployContract');
    const deployedContract = await deployContract(providers, {
      compiledContract: CompiledAnonymousSurveyContractContract,
      privateStateId: anonymousSurveyPrivateStateKey,
      initialPrivateState: createAnonymousSurveyPrivateState(utils.randomBytes(32)),
    });
    return new AnonymousSurveyAPI(deployedContract, providers, logger);
  }

  static async join(providers: AnonymousSurveyProviders, contractAddress: ContractAddress, logger?: Logger): Promise<AnonymousSurveyAPI> {
    logger?.info({ joinContract: { contractAddress } });
    const deployedContract = await findDeployedContract<AnonymousSurveyContract>(providers, {
      contractAddress: contractAddress || CONTRACT_ADDRESS_PLACEHOLDER,
      compiledContract: CompiledAnonymousSurveyContractContract,
      privateStateId: anonymousSurveyPrivateStateKey,
      initialPrivateState: await AnonymousSurveyAPI.getPrivateState(providers, contractAddress),
    });
    return new AnonymousSurveyAPI(deployedContract, providers, logger);
  }

  private static async getPrivateState(
    providers: AnonymousSurveyProviders,
    contractAddress: ContractAddress,
  ): Promise<AnonymousSurveyPrivateState> {
    providers.privateStateProvider.setContractAddress(contractAddress);
    const existingPrivateState = await providers.privateStateProvider.get(anonymousSurveyPrivateStateKey);
    return existingPrivateState ?? createAnonymousSurveyPrivateState(utils.randomBytes(32));
  }
}

export * as utils from './utils/index.js';
export * from './common-types.js';
