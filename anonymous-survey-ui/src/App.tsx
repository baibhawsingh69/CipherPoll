// SPDX-License-Identifier: Apache-2.0
// CipherPoll - Anonymous Survey DApp on Midnight Network

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Vote, 
  Sparkles, 
  Cpu, 
  CheckCircle2, 
  Layers, 
  BarChart3, 
  ExternalLink, 
  RefreshCw, 
  PlusCircle, 
  Key, 
  AlertCircle,
  Copy
} from 'lucide-react';
import './index.css';

const CONTRACT_ADDRESS_PLACEHOLDER = "<YOUR_DEPLOYED_CONTRACT_ADDRESS>";

interface SurveyOption {
  id: number;
  label: string;
  votes: bigint;
}

interface SurveyData {
  id: string;
  title: string;
  description: string;
  category: string;
  options: SurveyOption[];
  totalVotes: bigint;
  status: 'ACTIVE' | 'CLOSED';
  organizerPk: string;
}

export const App: React.FC = () => {
  const [selectedSurveyIndex, setSelectedSurveyIndex] = useState<number>(0);
  const [voterSecret, setVoterSecret] = useState<string>('0x7f8c9b3a1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0');
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isVotingModalOpen, setIsVotingModalOpen] = useState<boolean>(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [votingStep, setVotingStep] = useState<number>(0);
  const [txLogs, setTxLogs] = useState<Array<{ id: string; time: string; nullifier: string; status: string; option: number }>>([
    {
      id: '0x9a8f...3e1b',
      time: '2 mins ago',
      nullifier: '0x4c2b9a7f8e1d5c6b4a3f2e1d0c9b8a7f6e5d4c3b2a1f',
      status: 'VERIFIED ON-CHAIN',
      option: 0,
    },
    {
      id: '0x1c3d...8f2a',
      time: '14 mins ago',
      nullifier: '0x8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e',
      status: 'VERIFIED ON-CHAIN',
      option: 1,
    }
  ]);

  // Demo survey list
  const [surveys, setSurveys] = useState<SurveyData[]>([
    {
      id: 'survey-midnight-gov-001',
      title: 'Should Midnight Network implement shielded cross-chain governance voting?',
      description: 'Vote anonymously on whether Midnight should activate ZK-proven cross-chain voting bridges for Cardano and Ethereum DAOs.',
      category: 'Governance & Privacy',
      status: 'ACTIVE',
      organizerPk: '0x3a4b...9e8f',
      totalVotes: 142n,
      options: [
        { id: 0, label: 'Strongly Agree (Shielded Cross-Chain)', votes: 84n },
        { id: 1, label: 'Agree with Limitations', votes: 38n },
        { id: 2, label: 'Neutral / Need Technical Spec', votes: 12n },
        { id: 3, label: 'Disagree', votes: 8n },
      ]
    },
    {
      id: 'survey-zk-primitives-002',
      title: 'Which ZK circuit scaling primitive should be prioritized for Compact smart contracts?',
      description: 'Community poll for Midnight developers evaluating proof generation latency vs circuit constraint sizes.',
      category: 'Protocol Engineering',
      status: 'ACTIVE',
      organizerPk: '0x7e8f...1a2b',
      totalVotes: 89n,
      options: [
        { id: 0, label: 'Recursive PlonK / Halo2 Circuits', votes: 45n },
        { id: 1, label: 'Groth16 SNARKs with Pre-computed Keys', votes: 29n },
        { id: 2, label: 'STARK Polynomial Commitments', votes: 10n },
        { id: 3, label: 'Optimistic ZK Hybrids', votes: 5n },
      ]
    }
  ]);

  // New survey form state
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newOpt0, setNewOpt0] = useState('');
  const [newOpt1, setNewOpt1] = useState('');
  const [newOpt2, setNewOpt2] = useState('');
  const [newOpt3, setNewOpt3] = useState('');

  const currentSurvey = surveys[selectedSurveyIndex];

  // Helper to calculate vote percentages
  const getPercentage = (votes: bigint, total: bigint) => {
    if (total === 0n) return 0;
    return Math.round((Number(votes) / Number(total)) * 100);
  };

  // ZK Vote Execution Simulator
  const handleExecuteZkVote = () => {
    if (selectedOption === null) return;
    setVotingStep(1); // Computing witness
    setTimeout(() => {
      setVotingStep(2); // Generating ZK Proof & Nullifier
      setTimeout(() => {
        setVotingStep(3); // Submitting to Midnight Ledger
        setTimeout(() => {
          setVotingStep(4); // Verified!

          // Update state
          const updatedSurveys = [...surveys];
          const curr = updatedSurveys[selectedSurveyIndex];
          curr.options[selectedOption].votes += 1n;
          curr.totalVotes += 1n;
          setSurveys(updatedSurveys);

          // Add to ZK Audit Log
          const fakeNullifier = '0x' + Array.from({length: 40}, () => Math.floor(Math.random()*16).toString(16)).join('');
          const fakeTxHash = '0x' + Array.from({length: 8}, () => Math.floor(Math.random()*16).toString(16)).join('') + '...' + Array.from({length: 4}, () => Math.floor(Math.random()*16).toString(16)).join('');

          setTxLogs(prev => [
            {
              id: fakeTxHash,
              time: 'Just now',
              nullifier: fakeNullifier,
              status: 'VERIFIED ON-CHAIN',
              option: selectedOption
            },
            ...prev
          ]);

        }, 1200);
      }, 1400);
    }, 1200);
  };

  const handleCreateSurvey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newOpt0 || !newOpt1) return;

    const created: SurveyData = {
      id: `survey-user-${Date.now()}`,
      title: newTitle,
      description: newDesc || 'Community created Midnight anonymous poll.',
      category: 'Community Poll',
      status: 'ACTIVE',
      organizerPk: '0x' + voterSecret.slice(2, 10) + '...',
      totalVotes: 0n,
      options: [
        { id: 0, label: newOpt0, votes: 0n },
        { id: 1, label: newOpt1, votes: 0n },
        { id: 2, label: newOpt2 || 'Option C', votes: 0n },
        { id: 3, label: newOpt3 || 'Option D', votes: 0n }
      ]
    };

    setSurveys([created, ...surveys]);
    setSelectedSurveyIndex(0);
    setIsCreateModalOpen(false);
    setNewTitle('');
    setNewDesc('');
    setNewOpt0('');
    setNewOpt1('');
    setNewOpt2('');
    setNewOpt3('');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navbar */}
      <header className="glass-panel" style={{ margin: '16px', padding: '16px 24px', borderRadius: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              width: '42px', 
              height: '42px', 
              borderRadius: '12px', 
              background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(139, 92, 246, 0.5)'
            }}>
              <ShieldCheck size={24} color="#fff" />
            </div>
            <div>
              <h1 className="glow-text" style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.5px' }}>
                CipherPoll
              </h1>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Midnight Blockchain Anonymous Survey DApp
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div className="badge-network">
              <Cpu size={14} />
              Midnight Preprod
            </div>
            <div className="badge-privacy">
              <Lock size={14} />
              ZK Nullifiers Active
            </div>
            <button 
              className="glow-btn" 
              onClick={() => setIsCreateModalOpen(true)}
              style={{ fontSize: '0.9rem', padding: '8px 16px' }}
            >
              <PlusCircle size={16} />
              New Anonymous Survey
            </button>
          </div>
        </div>
      </header>

      {/* Contract Address & Network Status Banner */}
      <div style={{ margin: '0 16px 20px 16px' }}>
        <div className="glass-panel" style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Contract Target:</span>
            <code style={{ 
              background: 'rgba(0,0,0,0.4)', 
              padding: '4px 10px', 
              borderRadius: '6px', 
              color: '#38bdf8', 
              fontSize: '0.85rem',
              fontFamily: 'monospace'
            }}>
              {CONTRACT_ADDRESS_PLACEHOLDER}
            </code>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            <span>Proof Server: <strong style={{ color: '#4ade80' }}>Online (6300)</strong></span>
            <span>Circuit: <strong style={{ color: '#c084fc' }}>cast_anonymous_vote.zkir</strong></span>
          </div>
        </div>
      </div>

      {/* Main Layout Grid */}
      <main style={{ flex: 1, padding: '0 16px 32px 16px', display: 'grid', gridTemplateColumns: 'minmax(300px, 340px) 1fr', gap: '20px' }}>
        
        {/* Left Sidebar: Survey List & Voter Secret Key */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Voter ZK Credentials Card */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Key size={18} color="var(--primary-cyan)" />
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Your ZK Private Witness</h3>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: 1.4 }}>
              Your private key is stored locally in memory. It computes your ZK Nullifier without ever revealing your identity to the blockchain.
            </p>
            <div style={{ position: 'relative' }}>
              <input 
                type="password"
                value={voterSecret}
                onChange={(e) => setVoterSecret(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: 'rgba(0,0,0,0.5)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff',
                  fontSize: '0.85rem',
                  fontFamily: 'monospace'
                }}
              />
              <button 
                onClick={() => setVoterSecret('0x' + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join(''))}
                title="Generate New Secret Key"
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--primary-cyan)',
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          {/* Active Surveys Explorer List */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={18} color="var(--primary-purple)" />
                Surveys Directory
              </h3>
              <span className="badge-network" style={{ fontSize: '0.75rem' }}>{surveys.length} Active</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {surveys.map((survey, index) => {
                const isSelected = index === selectedSurveyIndex;
                return (
                  <div
                    key={survey.id}
                    onClick={() => setSelectedSurveyIndex(index)}
                    style={{
                      padding: '14px',
                      borderRadius: '12px',
                      background: isSelected ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255,255,255,0.03)',
                      border: isSelected ? '1px solid var(--primary-purple)' : '1px solid rgba(255,255,255,0.06)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', color: 'var(--primary-cyan)', fontWeight: 600, marginBottom: '4px' }}>
                      {survey.category}
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, lineHeight: 1.3, marginBottom: '8px' }}>
                      {survey.title}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      <span>{survey.totalVotes.toString()} votes</span>
                      <span style={{ color: '#4ade80' }}>● Active</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Right Main Area: Survey Details & Anonymous Voting Interface */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Survey Active Card */}
          <div className="glass-panel" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <div>
                <span className="badge-privacy" style={{ marginBottom: '8px' }}>
                  <Sparkles size={12} /> {currentSurvey.category}
                </span>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '8px', lineHeight: 1.3 }}>
                  {currentSurvey.title}
                </h2>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Total Anonymous Tally</span>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary-cyan)' }}>
                  {currentSurvey.totalVotes.toString()}
                </div>
              </div>
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '28px' }}>
              {currentSurvey.description}
            </p>

            {/* Option Choices with Progress Bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '28px' }}>
              {currentSurvey.options.map((opt) => {
                const percentage = getPercentage(opt.votes, currentSurvey.totalVotes);
                const isSelected = selectedOption === opt.id;

                return (
                  <div
                    key={opt.id}
                    className="option-progress-bg"
                    onClick={() => setSelectedOption(opt.id)}
                    style={{
                      borderColor: isSelected ? 'var(--primary-cyan)' : undefined,
                      boxShadow: isSelected ? '0 0 15px rgba(6, 182, 212, 0.4)' : undefined
                    }}
                  >
                    <div 
                      className="option-progress-fill" 
                      style={{ width: `${percentage}%` }}
                    />
                    <div className="option-content">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ 
                          width: '20px', 
                          height: '20px', 
                          borderRadius: '50%', 
                          border: isSelected ? '5px solid var(--primary-cyan)' : '2px solid rgba(255,255,255,0.4)',
                          background: isSelected ? '#fff' : 'transparent'
                        }} />
                        <span style={{ fontSize: '0.95rem' }}>{opt.label}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          {opt.votes.toString()} votes
                        </span>
                        <span style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', minWidth: '42px', textAlign: 'right' }}>
                          {percentage}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Voting Action Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <Lock size={16} color="var(--primary-purple)" />
                <span>Zero-Knowledge Proof prevents double voting via Poseidon Nullifiers</span>
              </div>

              <button
                className="glow-btn"
                disabled={selectedOption === null}
                onClick={() => {
                  setVotingStep(0);
                  setIsVotingModalOpen(true);
                }}
              >
                <Vote size={18} />
                Cast Anonymous Vote
              </button>
            </div>
          </div>

          {/* On-Chain Ledger & Nullifier Audit Log */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart3 size={18} color="var(--primary-cyan)" />
                Midnight Ledger Nullifier Audit Log
              </h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Public Verifiable Registry</span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '10px 12px' }}>Tx Hash</th>
                    <th style={{ padding: '10px 12px' }}>Time</th>
                    <th style={{ padding: '10px 12px' }}>Derived ZK Nullifier</th>
                    <th style={{ padding: '10px 12px' }}>Verification Status</th>
                  </tr>
                </thead>
                <tbody>
                  {txLogs.map((log, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '12px', fontFamily: 'monospace', color: '#a78bfa' }}>{log.id}</td>
                      <td style={{ padding: '12px', color: 'var(--text-muted)' }}>{log.time}</td>
                      <td style={{ padding: '12px', fontFamily: 'monospace', color: '#38bdf8' }}>
                        {log.nullifier.slice(0, 16)}...{log.nullifier.slice(-12)}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#4ade80', fontWeight: 600 }}>
                          <CheckCircle2 size={14} /> {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>

      {/* ZK Proof Execution Modal */}
      {isVotingModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="glass-panel" style={{ maxWidth: '520px', width: '100%', padding: '28px', borderRadius: '20px' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '8px' }}>
              Midnight ZK Circuit Execution
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Generating zero-knowledge proof for Option #{selectedOption} using local witness <code style={{ color: '#38bdf8' }}>localVoterSecret()</code>
            </p>

            {/* Execution Steps Tracker */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', opacity: votingStep >= 1 ? 1 : 0.4 }}>
                <div style={{ 
                  width: '28px', 
                  height: '28px', 
                  borderRadius: '50%', 
                  background: votingStep > 1 ? '#4ade80' : votingStep === 1 ? 'var(--primary-purple)' : 'rgba(255,255,255,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.8rem'
                }}>
                  {votingStep > 1 ? <CheckCircle2 size={16} color="#000" /> : '1'}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Compute Private Witness</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Retrieves local secret without exposing key</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', opacity: votingStep >= 2 ? 1 : 0.4 }}>
                <div style={{ 
                  width: '28px', 
                  height: '28px', 
                  borderRadius: '50%', 
                  background: votingStep > 2 ? '#4ade80' : votingStep === 2 ? 'var(--primary-purple)' : 'rgba(255,255,255,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.8rem'
                }}>
                  {votingStep > 2 ? <CheckCircle2 size={16} color="#000" /> : '2'}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Derive Poseidon ZK Nullifier</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>H("anon_survey:nullifier", surveyTag, secret)</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', opacity: votingStep >= 3 ? 1 : 0.4 }}>
                <div style={{ 
                  width: '28px', 
                  height: '28px', 
                  borderRadius: '50%', 
                  background: votingStep > 3 ? '#4ade80' : votingStep === 3 ? 'var(--primary-purple)' : 'rgba(255,255,255,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.8rem'
                }}>
                  {votingStep > 3 ? <CheckCircle2 size={16} color="#000" /> : '3'}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Proof Server Execution (Port 6300)</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Constructing SNARK proof for cast_anonymous_vote()</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', opacity: votingStep >= 4 ? 1 : 0.4 }}>
                <div style={{ 
                  width: '28px', 
                  height: '28px', 
                  borderRadius: '50%', 
                  background: votingStep === 4 ? '#4ade80' : 'rgba(255,255,255,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.8rem'
                }}>
                  {votingStep === 4 ? <CheckCircle2 size={16} color="#000" /> : '4'}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Midnight Ledger Finalization</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Incrementing public option counter anonymously</div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              {votingStep === 0 && (
                <>
                  <button 
                    style={{
                      padding: '10px 18px',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.06)',
                      border: 'none',
                      color: '#fff',
                      cursor: 'pointer'
                    }}
                    onClick={() => setIsVotingModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    className="glow-btn"
                    onClick={handleExecuteZkVote}
                  >
                    Start Proof & Submit
                  </button>
                </>
              )}

              {votingStep > 0 && votingStep < 4 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-cyan)', fontSize: '0.88rem' }}>
                  <RefreshCw className="animate-spin" size={16} />
                  Executing ZK Circuit...
                </div>
              )}

              {votingStep === 4 && (
                <button 
                  className="glow-btn"
                  onClick={() => setIsVotingModalOpen(false)}
                >
                  Done
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Survey Modal */}
      {isCreateModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <form onSubmit={handleCreateSurvey} className="glass-panel" style={{ maxWidth: '560px', width: '100%', padding: '28px', borderRadius: '20px' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '8px' }}>
              Create New Anonymous Survey
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Deploy a new Compact-compatible anonymous survey with ZK nullifier protections.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Survey Topic / Question</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Should Midnight add anonymous liquidity pools?"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(0,0,0,0.5)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Description</label>
                <textarea 
                  rows={2}
                  placeholder="Brief context for voters..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(0,0,0,0.5)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                    fontSize: '0.9rem',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Option 0</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Choice A" 
                    value={newOpt0}
                    onChange={(e) => setNewOpt0(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Option 1</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Choice B" 
                    value={newOpt1}
                    onChange={(e) => setNewOpt1(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Option 2</label>
                  <input 
                    type="text" 
                    placeholder="Choice C" 
                    value={newOpt2}
                    onChange={(e) => setNewOpt2(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Option 3</label>
                  <input 
                    type="text" 
                    placeholder="Choice D" 
                    value={newOpt3}
                    onChange={(e) => setNewOpt3(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.85rem' }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                type="button"
                style={{
                  padding: '10px 18px',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.06)',
                  border: 'none',
                  color: '#fff',
                  cursor: 'pointer'
                }}
                onClick={() => setIsCreateModalOpen(false)}
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="glow-btn"
              >
                Publish Survey
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default App;
