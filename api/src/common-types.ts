// SPDX-License-Identifier: Apache-2.0
// Anonymous Survey Common Types and Abstractions

import { type MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import { type FoundContract } from '@midnight-ntwrk/midnight-js-contracts';
import type { SurveyState, AnonymousSurveyPrivateState, Contract, Witnesses } from '../../contract/src/index';

export const anonymousSurveyPrivateStateKey = 'anonymousSurveyPrivateState';
export type PrivateStateId = typeof anonymousSurveyPrivateStateKey;

export type PrivateStates = {
  readonly anonymousSurveyPrivateState: AnonymousSurveyPrivateState;
};

export type AnonymousSurveyContract = Contract<AnonymousSurveyPrivateState, Witnesses<AnonymousSurveyPrivateState>>;

export type AnonymousSurveyCircuitKeys = Exclude<keyof AnonymousSurveyContract['impureCircuits'], number | symbol>;

export type AnonymousSurveyProviders = MidnightProviders<AnonymousSurveyCircuitKeys, PrivateStateId, AnonymousSurveyPrivateState>;

export type DeployedAnonymousSurveyContract = FoundContract<AnonymousSurveyContract>;

export type AnonymousSurveyDerivedState = {
  readonly state: SurveyState;
  readonly option0Votes: bigint;
  readonly option1Votes: bigint;
  readonly option2Votes: bigint;
  readonly option3Votes: bigint;
  readonly totalVotes: bigint;
  readonly isOrganizer: boolean;
};
