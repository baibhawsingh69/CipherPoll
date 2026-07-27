// SPDX-License-Identifier: Apache-2.0
// Anonymous Survey Contract Entrypoint

import { CompiledContract } from "@midnight-ntwrk/midnight-js-protocol/compact-js";

export * from "./managed/anonymous-survey/contract/index.js";
export * from "./witnesses.js";

import * as CompiledAnonymousSurveyContract from "./managed/anonymous-survey/contract/index.js";
import * as Witnesses from "./witnesses.js";

export const CompiledAnonymousSurveyContractContract = CompiledContract.make<
  CompiledAnonymousSurveyContract.Contract<Witnesses.AnonymousSurveyPrivateState>
>("AnonymousSurvey", CompiledAnonymousSurveyContract.Contract<Witnesses.AnonymousSurveyPrivateState>).pipe(
  CompiledContract.withWitnesses(Witnesses.witnesses),
  CompiledContract.withCompiledFileAssets("./managed/anonymous-survey"),
);
