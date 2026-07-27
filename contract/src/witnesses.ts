// SPDX-License-Identifier: Apache-2.0
// Anonymous Survey Contract Witnesses Implementation

import { Ledger } from "./managed/anonymous-survey/contract/index.js";
import { WitnessContext } from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";

export type AnonymousSurveyPrivateState = {
  readonly secretKey: Uint8Array;
};

export const createAnonymousSurveyPrivateState = (secretKey: Uint8Array): AnonymousSurveyPrivateState => ({
  secretKey,
});

export const witnesses = {
  localVoterSecret: ({
    privateState,
  }: WitnessContext<Ledger, AnonymousSurveyPrivateState>): [
    AnonymousSurveyPrivateState,
    Uint8Array,
  ] => [privateState, privateState.secretKey],
};
