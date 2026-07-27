'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { Buffer } from 'buffer';

interface V4Configuration {
  indexerUri: string;
  indexerWsUri: string;
  proverServerUri?: string;
  substrateNodeUri: string;
  networkId: string;
}

interface V4ConnectedAPI {
  getConfiguration(): Promise<V4Configuration>;
  getShieldedAddresses(): Promise<{
    shieldedAddress: string;
    shieldedCoinPublicKey: string;
    shieldedEncryptionPublicKey: string;
  }>;
  balanceUnsealedTransaction(tx: string, options?: { payFees?: boolean }): Promise<{ tx: string }>;
  submitTransaction(tx: string): Promise<void>;
}

interface V4InitialAPI {
  rdns: string;
  name: string;
  icon: string;
  apiVersion: string;
  connect(networkId: string): Promise<V4ConnectedAPI>;
}

if (typeof window !== 'undefined') {
  (window as any).Buffer = Buffer;
  const nativeFetch = window.fetch;
  if (nativeFetch && !(nativeFetch as any).__cipherpollBound) {
    const bound = nativeFetch.bind(window) as typeof window.fetch;
    (bound as any).__cipherpollBound = true;
    window.fetch = bound;
    (globalThis as any).fetch = bound;
  }
}

function isStaleWalletChannel(err: unknown): boolean {
  const msg = (err as any)?.message || String(err || '');
  return /shutdown|no longer be used|RemoteApiShutdown|channel .* was shutdown|disconnected/i.test(msg);
}

const PRIVATE_STATE_ID = 'anonymousSurveyPrivateState';
const LACE_PASSWORD = 'CipherPoll-Lace-Private-State-Password-V1-Goated!@#$';

const NETWORK = process.env.NEXT_PUBLIC_NETWORK || 'preprod';
const DEFAULT_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '';

export interface WalletStateLite {
  address: string;
  coinPublicKey: string;
  encryptionPublicKey: string;
}

export interface LedgerStateData {
  state: 'ACTIVE' | 'CLOSED';
  option0Votes: bigint;
  option1Votes: bigint;
  option2Votes: bigint;
  option3Votes: bigint;
  totalVotes: bigint;
  organizerPk: string;
}

export interface LaceContextType {
  isLaceMode: boolean;
  setIsLaceMode: (val: boolean) => void;
  hasLaceExtension: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  isWrongNetwork: boolean;
  walletState: WalletStateLite | null;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  deployedContract: any;
  privateStateProvider: any;
  activeNetwork: string;
  contractAddress: string;
  setContractAddress: (addr: string) => void;
  browserCastVote: (optionIndex: number) => Promise<{ txId: string }>;
  browserCloseSurvey: () => Promise<{ txId: string }>;
  fetchLedgerState: () => Promise<LedgerStateData | null>;
}

const LaceContext = createContext<LaceContextType | undefined>(undefined);

export function useLace() {
  const context = useContext(LaceContext);
  if (!context) throw new Error('useLace must be used within a LaceProvider');
  return context;
}

export function LaceProvider({ children }: { children: React.ReactNode }) {
  const [isLaceMode, setIsLaceMode] = useState<boolean>(false);
  const [hasLaceExtension, setHasLaceExtension] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isWrongNetwork, setIsWrongNetwork] = useState<boolean>(false);
  const [walletState, setWalletState] = useState<WalletStateLite | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [deployedContract, setDeployedContract] = useState<any>(null);
  const [privateStateProvider, setPrivateStateProvider] = useState<any>(null);
  const [activeNetwork] = useState<string>(NETWORK);
  const [contractAddress, setContractAddressState] = useState<string>(DEFAULT_CONTRACT_ADDRESS);

  const setContractAddress = (addr: string) => {
    setContractAddressState(addr);
  };

  useEffect(() => {
    const detect = () => {
      const midnightObj = (window as any).midnight;
      if (!midnightObj) {
        setHasLaceExtension(false);
        return;
      }
      const hasConnector = Object.values(midnightObj).some(
        (val: any) => val && typeof val.connect === 'function'
      );
      setHasLaceExtension(hasConnector);
    };

    detect();
    const interval = setInterval(detect, 300);
    const timeout = setTimeout(() => clearInterval(interval), 5000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  const disconnect = useCallback(() => {
    setIsConnected(false);
    setWalletState(null);
    setDeployedContract(null);
    setPrivateStateProvider(null);
    setIsLaceMode(false);
    setError(null);
    toast.success('Lace Wallet disconnected');
  }, []);

  // Intercept background extension port shutdowns (RemoteApiShutdownError)
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (isStaleWalletChannel(event.reason)) {
        event.preventDefault();
        console.warn('Lace extension API channel shutdown detected — auto-resetting wallet state.');
        disconnect();
      }
    };
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [disconnect]);

  const connect = useCallback(async () => {
    const findProvider = (): V4InitialAPI | null => {
      const midnightObj = (window as any).midnight;
      if (!midnightObj) return null;
      const providers = Object.values(midnightObj) as V4InitialAPI[];
      const laceish = providers.find(
        (p) => p && typeof p.connect === 'function' && /lace/i.test(p.rdns || p.name || '')
      );
      if (laceish) return laceish;
      return providers.find((p) => p && typeof p.connect === 'function') || null;
    };

    let provider = findProvider();
    if (!provider) {
      for (let i = 0; i < 15 && !provider; i++) {
        await new Promise((r) => setTimeout(r, 200));
        provider = findProvider();
      }
    }

    if (!provider) {
      const errMsg = 'No Midnight wallet found. Please install and enable the Lace extension for Midnight Preprod.';
      setError(errMsg);
      toast.error(errMsg, { duration: 8000 });
      return;
    }

    setHasLaceExtension(true);
    setIsConnecting(true);
    setError(null);
    setIsWrongNetwork(false);

    try {
      if (!contractAddress) throw new Error('Contract address is not set');

      let api: V4ConnectedAPI;
      try {
        api = await provider.connect(NETWORK);
      } catch (err: any) {
        if (isStaleWalletChannel(err)) {
          await new Promise((r) => setTimeout(r, 400));
          const freshProvider = findProvider() || provider;
          api = await freshProvider.connect(NETWORK);
        } else {
          throw err;
        }
      }
      const config = await api.getConfiguration();

      if (config.networkId && config.networkId !== NETWORK) {
        setIsWrongNetwork(true);
        const msg = `Lace is connected to "${config.networkId}", but CipherPoll requires "${NETWORK}". Please switch Lace network to Preprod.`;
        setError(msg);
        toast.error(msg, { duration: 7000 });
        setIsConnecting(false);
        return;
      }

      const { findDeployedContract } = await import('@midnight-ntwrk/midnight-js-contracts');
      const { httpClientProofProvider } = await import('@midnight-ntwrk/midnight-js-http-client-proof-provider');
      const { indexerPublicDataProvider } = await import('@midnight-ntwrk/midnight-js-indexer-public-data-provider');
      const { levelPrivateStateProvider } = await import('@midnight-ntwrk/midnight-js-level-private-state-provider');
      const { FetchZkConfigProvider } = await import('@midnight-ntwrk/midnight-js-fetch-zk-config-provider');
      const { CompiledContract } = await import('@midnight-ntwrk/midnight-js-protocol/compact-js');
      const { Transaction } = await import('@midnight-ntwrk/midnight-js-protocol/ledger');
      const { setNetworkId } = await import('@midnight-ntwrk/midnight-js-network-id');
      const { parseCoinPublicKeyToHex, parseEncPublicKeyToHex } = await import('@midnight-ntwrk/midnight-js-utils');

      const AnonymousSurvey = await import('../../contract/dist/managed/anonymous-survey/contract/index.js');
      const { witnesses, createAnonymousSurveyPrivateState } = await import('../../contract/dist/witnesses.js');

      setNetworkId(NETWORK);

      const { shieldedAddress, shieldedCoinPublicKey, shieldedEncryptionPublicKey } =
        await api.getShieldedAddresses();
      const coinPublicKey = parseCoinPublicKeyToHex(shieldedCoinPublicKey, NETWORK);
      const encryptionPublicKey = parseEncPublicKeyToHex(shieldedEncryptionPublicKey, NETWORK);

      const psProvider = levelPrivateStateProvider({
        midnightDbName: 'anonymous-survey-indexed-db',
        privateStateStoreName: 'anonymous-survey-state',
        accountId: shieldedAddress,
        privateStoragePasswordProvider: () => LACE_PASSWORD,
      });

      psProvider.setContractAddress(contractAddress);

      let ps = await psProvider.get(PRIVATE_STATE_ID);
      if (!ps) {
        const secret = window.crypto.getRandomValues(new Uint8Array(32));
        ps = createAnonymousSurveyPrivateState(secret);
        await psProvider.set(PRIVATE_STATE_ID, ps);
      }

      const zkConfigProvider = new FetchZkConfigProvider(`${window.location.origin}/managed/anonymous-survey`);

      const toHexString = (bytes: Uint8Array) => Buffer.from(bytes).toString('hex');
      const fromHexString = (hex: string) =>
        Uint8Array.from(Buffer.from(hex.startsWith('0x') ? hex.slice(2) : hex, 'hex'));

      const walletProvider = {
        getCoinPublicKey: () => coinPublicKey,
        getEncryptionPublicKey: () => encryptionPublicKey,
        async balanceTx(tx: any) {
          const unsealedHex = toHexString(tx.serialize());
          let balancedHex: string;
          try {
            ({ tx: balancedHex } = await api.balanceUnsealedTransaction(unsealedHex));
          } catch (e) {
            if (isStaleWalletChannel(e)) throw new Error('Lace connection was lost. Please reconnect your wallet.');
            throw e;
          }
          return Transaction.deserialize(
            'signature', 'proof', 'binding', fromHexString(balancedHex),
          ) as any;
        },
        async submitTx(tx: any) {
          const sealedHex = toHexString(tx.serialize());
          try {
            await api.submitTransaction(sealedHex);
          } catch (e) {
            if (isStaleWalletChannel(e)) throw new Error('Lace connection was lost. Please reconnect your wallet.');
            throw e;
          }
          return tx.identifiers()[0];
        },
      };

      const providers = {
        privateStateProvider: psProvider,
        publicDataProvider: indexerPublicDataProvider(config.indexerUri, config.indexerWsUri),
        zkConfigProvider,
        proofProvider: httpClientProofProvider(
          config.proverServerUri || process.env.NEXT_PUBLIC_PROOF_SERVER_URI || 'http://127.0.0.1:6300',
          zkConfigProvider,
        ),
        walletProvider,
        midnightProvider: walletProvider,
      };

      const compiledContract = CompiledContract.make('anonymous-survey', AnonymousSurvey.Contract).pipe(
        CompiledContract.withWitnesses(witnesses as never),
        CompiledContract.withCompiledFileAssets(''),
      );

      const deployed = await findDeployedContract(providers, {
        compiledContract: compiledContract as any,
        contractAddress,
        privateStateId: PRIVATE_STATE_ID,
      });

      setWalletState({ address: shieldedAddress, coinPublicKey, encryptionPublicKey });
      setPrivateStateProvider(psProvider);
      setDeployedContract(deployed);
      setIsConnected(true);
      setIsLaceMode(true);
      toast.success('Lace Wallet connected to Preprod network!');
    } catch (err: any) {
      console.error('Lace wallet connection error:', err);
      const isStale = isStaleWalletChannel(err);
      const errMsg = isStale
        ? 'Lace connection channel was reset by extension (locked/reloaded). Click Connect again.'
        : (err?.message || String(err));
      setError(errMsg);
      toast.error(`Connection failed: ${errMsg}`);
    } finally {
      setIsConnecting(false);
    }
  }, [contractAddress]);

  const browserCastVote = useCallback(async (optionIndex: number): Promise<{ txId: string }> => {
    if (!deployedContract) throw new Error('Wallet not connected');
    toast.loading('Generating ZK proof and submitting anonymous vote on Midnight Preprod...', { id: 'vote-tx' });
    try {
      const tx = await deployedContract.callTx.cast_anonymous_vote(BigInt(optionIndex));
      const txId = tx.public.txId;
      toast.success(`Anonymous Vote Verified On-Chain! Tx ID: ${txId.slice(0, 10)}...`, { id: 'vote-tx' });
      return { txId };
    } catch (err: any) {
      if (isStaleWalletChannel(err)) {
        disconnect();
        toast.error('Lace connection was lost (wallet locked/reloaded). Please reconnect.', { id: 'vote-tx' });
        throw new Error('Lace connection was lost. Please reconnect your wallet.');
      }
      toast.error(`Vote failed: ${err?.message || err}`, { id: 'vote-tx' });
      throw err;
    }
  }, [deployedContract, disconnect]);

  const browserCloseSurvey = useCallback(async (): Promise<{ txId: string }> => {
    if (!deployedContract) throw new Error('Wallet not connected');
    toast.loading('Submitting close_survey transaction on Midnight Preprod...', { id: 'close-tx' });
    try {
      const tx = await deployedContract.callTx.close_survey();
      const txId = tx.public.txId;
      toast.success(`Survey Closed Successfully! Tx ID: ${txId.slice(0, 10)}...`, { id: 'close-tx' });
      return { txId };
    } catch (err: any) {
      if (isStaleWalletChannel(err)) {
        disconnect();
        toast.error('Lace connection was lost (wallet locked/reloaded). Please reconnect.', { id: 'close-tx' });
        throw new Error('Lace connection was lost. Please reconnect your wallet.');
      }
      toast.error(`Close survey failed: ${err?.message || err}`, { id: 'close-tx' });
      throw err;
    }
  }, [deployedContract, disconnect]);

  const fetchLedgerState = useCallback(async (): Promise<LedgerStateData | null> => {
    if (!contractAddress) return null;
    try {
      const AnonymousSurvey = await import('../../contract/dist/managed/anonymous-survey/contract/index.js');
      const { indexerPublicDataProvider } = await import('@midnight-ntwrk/midnight-js-indexer-public-data-provider');
      const publicDataProvider = indexerPublicDataProvider(
        'https://indexer.preprod.midnight.network/api/v4/graphql',
        'wss://indexer.preprod.midnight.network/api/v4/graphql/ws'
      );
      const contractState = await publicDataProvider.queryContractState(contractAddress);
      if (!contractState || !contractState.data) return null;
      const ledger = AnonymousSurvey.ledger(contractState.data);

      return {
        state: ledger.state === AnonymousSurvey.SurveyState.ACTIVE ? 'ACTIVE' : 'CLOSED',
        option0Votes: BigInt(ledger.option_0_votes),
        option1Votes: BigInt(ledger.option_1_votes),
        option2Votes: BigInt(ledger.option_2_votes),
        option3Votes: BigInt(ledger.option_3_votes),
        totalVotes: BigInt(ledger.total_votes),
        organizerPk: Buffer.from(ledger.organizer_pk).toString('hex'),
      };
    } catch (err) {
      console.warn('Failed to query ledger state:', err);
      return null;
    }
  }, [contractAddress]);

  return (
    <LaceContext.Provider
      value={{
        isLaceMode,
        setIsLaceMode,
        hasLaceExtension,
        isConnected,
        isConnecting,
        isWrongNetwork,
        walletState,
        error,
        connect,
        disconnect,
        deployedContract,
        privateStateProvider,
        activeNetwork,
        contractAddress,
        setContractAddress,
        browserCastVote,
        browserCloseSurvey,
        fetchLedgerState,
      }}
    >
      {children}
    </LaceContext.Provider>
  );
}
