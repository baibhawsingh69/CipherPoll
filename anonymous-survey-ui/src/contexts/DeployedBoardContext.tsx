// SPDX-License-Identifier: Apache-2.0
// Deployed Board Context for Anonymous Survey UI

import React, { type PropsWithChildren, createContext } from 'react';
import { type DeployedSurveyAPIProvider, BrowserDeployedBoardManager } from './BrowserDeployedBoardManager.js';
import { type Logger } from 'pino';

export const DeployedBoardContext = createContext<DeployedSurveyAPIProvider | undefined>(undefined);

export type DeployedBoardProviderProps = PropsWithChildren<{
  logger: Logger;
}>;

export const DeployedBoardProvider: React.FC<Readonly<DeployedBoardProviderProps>> = ({ logger, children }) => (
  <DeployedBoardContext.Provider value={new BrowserDeployedBoardManager(logger)}>
    {children}
  </DeployedBoardContext.Provider>
);
