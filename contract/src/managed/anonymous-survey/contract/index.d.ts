import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export enum SurveyState { ACTIVE = 0, CLOSED = 1 }

export type Witnesses<PS> = {
  localVoterSecret(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
}

export type ImpureCircuits<PS> = {
  cast_anonymous_vote(context: __compactRuntime.CircuitContext<PS>,
                      option_index_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  close_survey(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  cast_anonymous_vote(context: __compactRuntime.CircuitContext<PS>,
                      option_index_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  close_survey(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
  deriveNullifier(secret_0: Uint8Array, surveyTag_0: Uint8Array): Uint8Array;
  deriveOrganizerPk(sk_0: Uint8Array): Uint8Array;
}

export type Circuits<PS> = {
  deriveNullifier(context: __compactRuntime.CircuitContext<PS>,
                  secret_0: Uint8Array,
                  surveyTag_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  deriveOrganizerPk(context: __compactRuntime.CircuitContext<PS>,
                    sk_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  cast_anonymous_vote(context: __compactRuntime.CircuitContext<PS>,
                      option_index_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  close_survey(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  readonly state: SurveyState;
  readonly option_0_votes: bigint;
  readonly option_1_votes: bigint;
  readonly option_2_votes: bigint;
  readonly option_3_votes: bigint;
  readonly total_votes: bigint;
  readonly organizer_pk: Uint8Array;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
