import './globals.css';
import React from 'react';
import { Toaster } from 'react-hot-toast';
import { LaceProvider } from '../lib/lace-context';

export const metadata = {
  title: 'CipherPoll — Midnight Preprod Anonymous Survey DApp',
  description: '100% Zero-Knowledge Anonymous Polling & Voting on Midnight Network using Compact smart contracts and Lace wallet.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <LaceProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#12141d',
                color: '#fff',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                backdropFilter: 'blur(10px)',
              },
            }}
          />
          {children}
        </LaceProvider>
      </body>
    </html>
  );
}
