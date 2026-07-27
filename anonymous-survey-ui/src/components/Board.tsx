// SPDX-License-Identifier: Apache-2.0
// Survey Card Component

import React, { useState } from 'react';
import { Card, CardContent, Typography } from '@mui/material';
import { type AnonymousSurveyDerivedState, type DeployedAnonymousSurveyAPI } from '../../../api/src/index.js';
import { type SurveyDeployment } from '../contexts/BrowserDeployedBoardManager.js';
import { type Observable } from 'rxjs';

export interface BoardProps {
  boardDeployment$?: Observable<SurveyDeployment>;
}

export const Board: React.FC<Readonly<BoardProps>> = () => {
  const [boardState] = useState<AnonymousSurveyDerivedState>();
  const [deployedBoardAPI] = useState<DeployedAnonymousSurveyAPI>();

  return (
    <Card sx={{ background: 'rgba(18, 20, 38, 0.8)', color: '#fff', padding: 2, borderRadius: 3 }}>
      <CardContent>
        <Typography variant="h6" color="primary">
          Anonymous Survey Node
        </Typography>
        <Typography variant="body2" sx={{ color: '#9ca3af', marginTop: 1 }}>
          Address: {deployedBoardAPI?.deployedContractAddress || '<YOUR_DEPLOYED_CONTRACT_ADDRESS>'}
        </Typography>
        <Typography variant="body2" sx={{ marginTop: 1 }}>
          Total Votes: {boardState?.totalVotes ? boardState.totalVotes.toString() : '0'}
        </Typography>
      </CardContent>
    </Card>
  );
};
