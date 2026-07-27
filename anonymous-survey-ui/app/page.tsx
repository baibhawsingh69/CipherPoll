'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Vote,
  BarChart3,
  RefreshCw,
  Key,
  CheckCircle2,
  Copy,
  Wallet,
  Check,
  Globe,
  Cpu
} from 'lucide-react';
import { useLace, LedgerStateData } from '../lib/lace-context';

export default function CipherPollPage() {
  const {
    isConnected,
    isConnecting,
    walletState,
    connect,
    disconnect,
    contractAddress,
    setContractAddress,
    browserCastVote,
    browserCloseSurvey,
    fetchLedgerState,
  } = useLace();

  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [ledgerState, setLedgerState] = useState<LedgerStateData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [copiedAddress, setCopiedAddress] = useState<boolean>(false);

  const [recentTxs, setRecentTxs] = useState<Array<{ id: string; time: string; nullifier: string; option: number }>>([]);

  const surveyDetails = {
    id: 'survey-midnight-gov-001',
    title: 'Should Midnight Network implement shielded cross-chain governance voting?',
    description: 'Vote anonymously on whether Midnight should activate ZK-proven cross-chain voting bridges for Cardano and Ethereum DAOs.',
    category: 'Governance & Privacy',
    options: [
      { id: 0, label: 'Strongly Agree (Shielded Cross-Chain)' },
      { id: 1, label: 'Agree with Limitations' },
      { id: 2, label: 'Neutral / Need Technical Spec' },
      { id: 3, label: 'Disagree' },
    ],
  };

  const loadLedgerState = async () => {
    setIsRefreshing(true);
    try {
      const data = await fetchLedgerState();
      if (data) {
        setLedgerState(data);
      }
    } catch (e) {
      console.error('Failed to fetch ledger state:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadLedgerState();
    const interval = setInterval(loadLedgerState, 15000);
    return () => clearInterval(interval);
  }, [contractAddress]);

  const getOptionVotes = (id: number): bigint => {
    if (!ledgerState) return 0n;
    if (id === 0) return ledgerState.option0Votes;
    if (id === 1) return ledgerState.option1Votes;
    if (id === 2) return ledgerState.option2Votes;
    return ledgerState.option3Votes;
  };

  const getTotalVotes = (): bigint => {
    if (!ledgerState) return 0n;
    return ledgerState.totalVotes;
  };

  const getPercentage = (optionId: number): number => {
    const total = getTotalVotes();
    if (total === 0n) return 0;
    const votes = getOptionVotes(optionId);
    return Math.round((Number(votes) / Number(total)) * 100);
  };

  const handleCastVote = async () => {
    if (selectedOption === null) return;
    if (!isConnected) {
      await connect();
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await browserCastVote(selectedOption);
      setRecentTxs((prev) => [
        {
          id: res.txId.length > 14 ? `${res.txId.slice(0, 10)}...${res.txId.slice(-4)}` : res.txId,
          time: new Date().toLocaleTimeString(),
          nullifier: `0x${res.txId}`,
          option: selectedOption,
        },
        ...prev,
      ]);
      await loadLedgerState();
    } catch (e) {
      console.error('Vote submission error:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseSurvey = async () => {
    if (!isConnected) {
      await connect();
      return;
    }
    try {
      await browserCloseSurvey();
      await loadLedgerState();
    } catch (e) {
      console.error('Close survey error:', e);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 20px 60px 20px' }}>
      {/* Top Navbar */}
      <header className="glass-panel" style={{ padding: '16px 24px', marginBottom: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 15px rgba(139,92,246,0.5)' }}>
            <Lock size={22} color="#fff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.02em', background: 'linear-gradient(90deg, #fff, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                CipherPoll
              </h1>
              <span className="glow-pill">MIDNIGHT PREPROD</span>
            </div>
            <p style={{ fontSize: '0.82rem', color: '#9ca3af', marginTop: '2px' }}>
              Zero-Knowledge Anonymous Survey Protocol
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.2)' }}>
            <Globe size={14} />
            <span>Network: Preprod</span>
          </div>

          {isConnected ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Wallet size={14} color="#8b5cf6" />
                <span>{walletState?.address ? `${walletState.address.slice(0, 14)}...${walletState.address.slice(-6)}` : 'Lace Connected'}</span>
              </div>
              <button onClick={disconnect} className="glass-button-secondary" style={{ padding: '8px 14px', fontSize: '0.82rem' }}>
                Disconnect
              </button>
            </div>
          ) : (
            <button onClick={connect} disabled={isConnecting} className="glass-button">
              <Wallet size={16} />
              <span>{isConnecting ? 'Connecting Lace...' : 'Connect Lace Wallet'}</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Grid Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>
        {/* Left Column: Poll Details & Voting */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Contract Address & Network Status Panel */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Deployed Preprod Contract Address
              </span>
              <button onClick={loadLedgerState} disabled={isRefreshing} className="glass-button-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
                <RefreshCw size={12} className={isRefreshing ? 'spin' : ''} />
                <span>{isRefreshing ? 'Querying...' : 'Sync Ledger'}</span>
              </button>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={contractAddress}
                onChange={(e) => setContractAddress(e.target.value)}
                placeholder="Enter Preprod Contract Address"
                style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 14px', color: '#8b5cf6', fontFamily: 'monospace', fontSize: '0.88rem' }}
              />
              <button onClick={() => copyToClipboard(contractAddress)} className="glass-button-secondary" style={{ padding: '10px' }}>
                {copiedAddress ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          {/* Survey Card */}
          <div className="glass-panel" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span className="glow-pill">{surveyDetails.category}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: ledgerState?.state === 'CLOSED' ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)', color: ledgerState?.state === 'CLOSED' ? '#f87171' : '#34d399', padding: '4px 12px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, border: ledgerState?.state === 'CLOSED' ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(16,185,129,0.3)' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }}></span>
                <span>{ledgerState?.state || 'ACTIVE'} ON-CHAIN</span>
              </div>
            </div>

            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, lineHeight: 1.35, marginBottom: '12px' }}>
              {surveyDetails.title}
            </h2>
            <p style={{ color: '#9ca3af', fontSize: '0.92rem', lineHeight: 1.5, marginBottom: '24px' }}>
              {surveyDetails.description}
            </p>

            {/* Voting Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '28px' }}>
              {surveyDetails.options.map((option) => {
                const isSelected = selectedOption === option.id;
                const percentage = getPercentage(option.id);
                const votes = getOptionVotes(option.id);

                return (
                  <div
                    key={option.id}
                    onClick={() => setSelectedOption(option.id)}
                    className={isSelected ? 'glow-border-selected' : ''}
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '12px',
                      padding: '16px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          border: isSelected ? '6px solid #8b5cf6' : '2px solid rgba(255,255,255,0.3)',
                          transition: 'all 0.2s ease'
                        }} />
                        <span style={{ fontWeight: 600, fontSize: '0.95rem', color: isSelected ? '#fff' : '#e5e7eb' }}>
                          {option.label}
                        </span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontWeight: 700, fontSize: '1rem', color: '#8b5cf6' }}>{percentage}%</span>
                        <span style={{ fontSize: '0.78rem', color: '#9ca3af', marginLeft: '6px' }}>({votes.toString()} votes)</span>
                      </div>
                    </div>

                    <div className="progress-bar-bg">
                      <div className="progress-bar-fill" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Voting Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9ca3af', fontSize: '0.85rem' }}>
                <BarChart3 size={16} color="#06b6d4" />
                <span>Total On-Chain Votes: <strong style={{ color: '#fff' }}>{getTotalVotes().toString()}</strong></span>
              </div>

              <button
                onClick={handleCastVote}
                disabled={selectedOption === null || isSubmitting || ledgerState?.state === 'CLOSED'}
                className="glass-button"
                style={{ padding: '12px 24px', fontSize: '0.95rem' }}
              >
                <Vote size={18} />
                <span>{isSubmitting ? 'Verifying ZK Proof...' : isConnected ? 'Cast Anonymous Vote' : 'Connect Lace & Vote'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Protocol Status & ZK Audit Log */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* ZK Guarantees Card */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <ShieldCheck size={20} color="#10b981" />
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>ZK Privacy Guarantees</h3>
            </div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.84rem', color: '#9ca3af' }}>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <CheckCircle2 size={15} color="#8b5cf6" style={{ marginTop: '2px', flexShrink: 0 }} />
                <span><strong>Nullifier Derivation:</strong> Poseidon hash prevents double-voting on Midnight ledger.</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <CheckCircle2 size={15} color="#8b5cf6" style={{ marginTop: '2px', flexShrink: 0 }} />
                <span><strong>Witness Privacy:</strong> Local secret key never leaves Lace browser wallet.</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <CheckCircle2 size={15} color="#8b5cf6" style={{ marginTop: '2px', flexShrink: 0 }} />
                <span><strong>Public Verifiability:</strong> On-chain counters increment transparently.</span>
              </li>
            </ul>
          </div>

          {/* Organizer Actions Panel */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <Key size={18} color="#06b6d4" />
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Organizer Controls</h3>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#9ca3af', marginBottom: '14px' }}>
              Only the survey organizer key can close this poll on the Midnight ledger.
            </p>
            <button
              onClick={handleCloseSurvey}
              disabled={ledgerState?.state === 'CLOSED'}
              className="glass-button-secondary"
              style={{ width: '100%', justifyContent: 'center', color: '#f87171', borderColor: 'rgba(239,68,68,0.2)' }}
            >
              <span>{ledgerState?.state === 'CLOSED' ? 'Survey Is Closed' : 'Close Survey On-Chain'}</span>
            </button>
          </div>

          {/* Live On-Chain ZK Audit Log */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Cpu size={18} color="#8b5cf6" />
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>ZK Audit Log</h3>
              </div>
              <span className="glow-pill" style={{ fontSize: '0.65rem' }}>LIVE</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {recentTxs.length === 0 ? (
                <div style={{ padding: '16px 12px', textTransform: 'none', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px border rgba(255,255,255,0.05)', textAlign: 'center', color: '#9ca3af', fontSize: '0.78rem' }}>
                  No transactions submitted in this browser session yet.
                </div>
              ) : (
                recentTxs.map((tx, idx) => (
                  <div key={idx} style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '10px 12px', fontSize: '0.78rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontFamily: 'monospace', color: '#8b5cf6', fontWeight: 600 }}>{tx.id}</span>
                      <span style={{ color: '#10b981', fontWeight: 600, fontSize: '0.72rem' }}>VERIFIED</span>
                    </div>
                    <div style={{ color: '#9ca3af', fontFamily: 'monospace', fontSize: '0.72rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      Tx Hash: {tx.nullifier}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
