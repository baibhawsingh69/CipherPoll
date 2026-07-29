# CipherPoll — Anonymous Survey DApp on Midnight Blockchain

A privacy-preserving, full-stack Zero-Knowledge anonymous survey application built on the Midnight Network using Compact smart contracts and ZK nullifier proofs.

## Live Deployment & Demo

- **Vercel DApp URL**: [https://cipherpoll-peach.vercel.app](https://cipherpoll-peach.vercel.app)
- **Demo Video**: [Watch 1-Minute Walkthrough](https://drive.google.com/file/d/1tUryuMmCTpCEA43JksPhRLx8j5BpI5Kv/view?usp=sharing)

## Contract Address

| Network | Contract Address |
|---------|------------------|
| Preprod | `7c55c230cecf067415798d79c5e2508ff5eb93911c1c6ff848d7d13ee95ce582` |

```env
CONTRACT_ADDRESS=7c55c230cecf067415798d79c5e2508ff5eb93911c1c6ff848d7d13ee95ce582
```

## Features

- **Zero-Knowledge Anonymous Polling**: Voters prove voting eligibility and record choices without exposing voter identity.
- **ZK Nullifier Protection**: Poseidon hash-based nullifier `H("anon_survey:nullifier", surveyTag, secret)` prevents double voting on the Midnight ledger.
- **Verifiable Public Tally**: Transparent, on-chain ledger state for public option counters and total vote tallies.
- **1AM Wallet & Midnight Wallet Connector**: Integrated witness generation and proof execution pipeline via proof-server (`:6300`).
- **Modern High-End Web Interface**: Glassmorphism UI with live vote tally charts and ZK transaction audit log.
- **CLI Tooling**: Command-line interface for deploying, joining, and casting votes.

## What This Project Does

CipherPoll allows organizations, DAOs, and communities to run 100% anonymous polls and surveys on the Midnight blockchain. Voters cast votes through zero-knowledge proofs that guarantee one vote per person while keeping individual selections untraceable to their wallet or real-world identity.

## Privacy Model

- **Public Information**:
  - Active survey status (`ACTIVE` / `CLOSED`).
  - Option vote counts (`option_0_votes`, `option_1_votes`, `option_2_votes`, `option_3_votes`, `total_votes`).
  - Organizer Public Key (`organizer_pk`).
  - Set of used nullifier hashes (prevents double voting).
- **Private Information**:
  - Voter Secret Key (`localVoterSecret` witness).
  - Individual voter identity and wallet address.
- **What Users Prove Without Revealing**:
  - Knowledge of a valid voter secret.
  - Correct execution of circuit logic and nullifier calculation.
  - Selection of a valid option (0-3) without disclosing voter identity.

## Tech Stack

- **Smart Contract**: Compact 0.23 (Midnight Domain Specific Language)
- **ZK Circuit Compiler**: `compact` (v0.5.1 / 0.31.1)
- **Proof Server**: `https://proof-server.preprod.midnight.network` / Docker `midnightnetwork/proof-server:latest` (Port 6300)
- **API & Protocol**: `@midnight-ntwrk/midnight-js-protocol`, `@midnight-ntwrk/midnight-js-contracts`
- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, 1AM Wallet & Midnight Connector, Lucide Icons, Custom Glassmorphism CSS System
- **CLI**: Node.js CLI with `@midnight-ntwrk/testkit-js` and LevelDB private state provider

## Folder Structure

```
CipherPoll/
├── contract/
│   ├── src/
│   │   ├── anonymous-survey.compact   # Compact 0.23 smart contract
│   │   ├── witnesses.ts              # ZK witness functions & private state definition
│   │   └── index.ts                  # Compiled contract exports
│   └── package.json
├── api/
│   ├── src/
│   │   ├── common-types.ts           # Types & interfaces for Anonymous Survey API
│   │   └── index.ts                  # Midnight API wrapper & contract interactions
│   └── package.json
├── anonymous-survey-cli/
│   ├── src/
│   │   ├── config.ts                 # Preprod network config
│   │   ├── deploy-preprod-wallet-facade.ts # Preprod deployment script
│   │   └── index.ts                  # CLI driver loop & wallet runner
│   └── package.json
├── anonymous-survey-ui/
│   ├── app/
│   │   ├── layout.tsx                # Root layout with LaceProvider
│   │   ├── page.tsx                  # Main CipherPoll Next.js DApp page
│   │   └── globals.css               # Midnight dark glassmorphism styling
│   ├── lib/
│   │   └── lace-context.tsx          # 1AM Wallet Provider & browser ZK contract runner
│   ├── next.config.ts                # Next.js WASM & Webpack config
│   └── package.json
├── images/                           # Application Screenshots
│   └── Screenshot From 2026-07-27 22-52-00.png
├── package.json
└── README.md
```

## Prerequisites

- Node.js >= v22
- Docker Desktop or Docker Engine running
- Compact Compiler (`compact --version`)
- 1AM Wallet / Midnight Wallet Extension (for browser interaction)

## Installation

```bash
npm install
cd api && npm install && cd ..
cd contract && npm install && cd ..
cd anonymous-survey-cli && npm install && cd ..
cd anonymous-survey-ui && npm install && cd ..
```

## Compile

```bash
npm run compact
```

## Build

```bash
npm run build
cd anonymous-survey-cli && npm run build && cd ..
cd anonymous-survey-ui && npm run build && cd ..
```

## Manual Deployment

Deployment is intentionally skipped as per challenge guidelines.

To deploy the Compact smart contract to Midnight Preprod testnet:

```bash
NODE_OPTIONS="--max-old-space-size=12288" npm run deploy -- --network preprod
```

or via CLI:

```bash
cd anonymous-survey-cli
npm run preprod-remote
```

## After Deployment

State clearly that the only remaining manual steps are:

1. Deploy the Compact contract.
2. Copy the deployed contract address.
3. Replace every occurrence of:

```
<YOUR_DEPLOYED_CONTRACT_ADDRESS>
```

No additional coding should be required.

## Environment Variables

- `VITE_NETWORK_ID`: Midnight network ID (`preprod` or `preview`)
- `VITE_LOGGING_LEVEL`: Logging verbosity (`info`, `debug`, `trace`)
- `CONTRACT_ADDRESS`: Deployed contract address placeholder (`<YOUR_DEPLOYED_CONTRACT_ADDRESS>`)

## Screenshots

### CipherPoll Anonymous Survey DApp Interface
![CipherPoll DApp Interface](./images/Screenshot%20From%202026-07-27%2022-52-00.png)

## Initial Idea

Selected from Rise In Midnight Builder Challenge list:
**Idea #27: Anonymous Survey** (`anonymous-survey`)

## Troubleshooting

- **Proof Server Connection Failed**: Ensure Docker container is running:
  `docker run -d -p 6300:6300 midnightnetwork/proof-server:latest`
- **Compact Compiler Missing**: Install globally with `npm install -g @midnight-ntwrk/compact-compiler` or verify PATH.
