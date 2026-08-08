// useWalletConnection.ts
// Real Midnight wallet connection via the DApp Connector API
// (@midnight-ntwrk/dapp-connector-api) — wallets (Lace, 1AM, ...) inject
// themselves onto window.midnight, keyed by an opaque id, not a fixed name.
// See .agents/skills/react-wallet-connector for the reference pattern this
// is based on.
//
// This gets a REAL wallet address. It does NOT enable real ZK proof
// generation for provePatientOwnership — that additionally requires a
// contract actually deployed on-chain (CONTRACT_ADDRESS is still a
// placeholder in backend/.env), ZK assets hosted over HTTP, and the full
// midnight-js provider pipeline. See Paciente.tsx's generateZKProof for
// where that real path is documented once deployment exists.

import { useCallback, useEffect, useState } from 'react';
import '@midnight-ntwrk/dapp-connector-api';

export type WalletDetectionStatus = 'checking' | 'detected' | 'not-found';
export type NetworkId = 'undeployed' | 'preview' | 'preprod' | 'mainnet';

function listWallets() {
  return window.midnight ? Object.values(window.midnight) : [];
}

export function useWalletConnection() {
  const [status, setStatus] = useState<WalletDetectionStatus>('checking');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Extension injection is async — poll for it rather than assuming it's
  // there on first render.
  useEffect(() => {
    const startedAt = Date.now();
    const id = setInterval(() => {
      if (listWallets().length > 0) {
        setStatus('detected');
        clearInterval(id);
        return;
      }
      if (Date.now() - startedAt >= 6000) {
        setStatus('not-found');
        clearInterval(id);
      }
    }, 300);
    return () => clearInterval(id);
  }, []);

  const connect = useCallback(async (networkId: NetworkId = 'preview') => {
    setIsConnecting(true);
    setError(null);
    try {
      const wallets = listWallets();
      if (wallets.length === 0) {
        throw new Error('No Midnight wallet found. Install the Lace extension and refresh.');
      }
      // Single-wallet pick — if this project ever needs to support multiple
      // installed wallets side by side, render listWallets() as a picker
      // instead of always taking the first one.
      const api = await wallets[0].connect(networkId);
      const { unshieldedAddress } = await api.getUnshieldedAddress();
      setAddress(unshieldedAddress);
      setIsConnected(true);
      return unshieldedAddress;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect wallet';
      setError(message);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setIsConnected(false);
    setError(null);
  }, []);

  return { status, isConnected, isConnecting, address, error, connect, disconnect };
}
