'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, LAMPORTS_PER_SOL, Transaction, SystemProgram } from '@solana/web3.js';
import WalletButton from './components/WalletButton';
import Nav from './nav';

export default function TestWallet() {
  const { publicKey, wallet, connected } = useWallet();
  const { connection } = useConnection();
  const [balance, setBalance] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);

  const testConnection = async () => {
    if (!publicKey || !connection) {
      setError('Wallet or connection not available');
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      
      // Test the connection
      const info = await connection.getVersion();
      console.log('Connection info:', info);

      // Get the balance
      const balanceInLamports = await connection.getBalance(publicKey);
      setBalance(balanceInLamports / LAMPORTS_PER_SOL);
      
      setSuccess('Connection test successful');
    } catch (err) {
      console.error('Error testing connection:', err);
      setError(`Error testing connection: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const requestAirdrop = async () => {
    if (!publicKey || !connection) {
      setError('Wallet or connection not available');
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      
      const signature = await connection.requestAirdrop(publicKey, 1 * LAMPORTS_PER_SOL);
      await connection.confirmTransaction(signature);
      
      // Refresh balance
      const balanceInLamports = await connection.getBalance(publicKey);
      setBalance(balanceInLamports / LAMPORTS_PER_SOL);
      
      setSuccess('Airdrop successful');
    } catch (err) {
      console.error('Error requesting airdrop:', err);
      setError(`Error requesting airdrop: ${err instanceof Error ? err.message : String(err)}`);
    }
  };
  
  const testSendTransaction = async () => {
    if (!publicKey || !connection || !wallet?.adapter) {
      setError('Wallet or connection not available');
      return;
    }
    
    try {
      setError(null);
      setSuccess(null);
      setTxSignature(null);
      
      // Create a simple transaction that sends a very small amount of SOL to ourselves
      // This tests that the wallet can properly sign transactions
      const transaction = new Transaction();
      
      // Add a simple transfer instruction (sending a tiny amount to ourselves)
      // Using a tiny amount (0.000001 SOL = 1000 lamports) for testing
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: publicKey, // sending to self
          lamports: 1000, // 0.000001 SOL
        })
      );
      
      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;
      
      console.log('Testing transaction signing with adapter:', wallet.adapter.name);
      
      // Sign and send transaction
      const signature = await wallet.adapter.sendTransaction(transaction, connection);
      console.log('Transaction signed and sent successfully:', signature);
      
      // Store signature for display
      setTxSignature(signature);
      
      // Confirm transaction
      const confirmation = await connection.confirmTransaction(signature, 'confirmed');
      
      if (confirmation.value.err) {
        throw new Error(`Transaction confirmed but has errors: ${JSON.stringify(confirmation.value.err)}`);
      }
      
      // Refresh balance
      const balanceInLamports = await connection.getBalance(publicKey);
      setBalance(balanceInLamports / LAMPORTS_PER_SOL);
      
      setSuccess('Transaction test successful!');
    } catch (err) {
      console.error('Error testing transaction:', err);
      if (err instanceof Error) {
        setError(`Transaction test failed: ${err.message}`);
      } else {
        setError(`Transaction test failed: ${String(err)}`);
      }
    }
  };

  return (
    <>
      <Nav />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Wallet Connection Test</h1>
        
        <div className="card bg-base-200 shadow-xl mb-6 p-4">
          <h2 className="text-xl font-bold mb-2">Wallet Status</h2>
          <div className="mb-2">
            <p>Status: <span className={connected ? "text-success" : "text-error"}>
              {connected ? "Connected" : "Disconnected"}
            </span></p>
            {connected && (
              <>
                <p>Address: {publicKey?.toString()}</p>
                <p>Wallet: {wallet?.adapter.name || "Unknown"}</p>
                <p>Protocol: {typeof window !== 'undefined' ? window.location.protocol : "Unknown"}</p>
                <p>Connection: {connection?.rpcEndpoint || "Not available"}</p>
                {balance !== null && (
                  <p>Balance: {balance.toFixed(6)} SOL</p>
                )}
              </>
            )}
          </div>
          
          <div className="flex gap-2 mt-4 flex-wrap">
            <WalletButton />
            {connected && (
              <>
                <button 
                  className="btn btn-primary" 
                  onClick={testConnection}
                >
                  Test Connection
                </button>
                <button 
                  className="btn btn-accent" 
                  onClick={requestAirdrop}
                >
                  Request Airdrop (1 SOL)
                </button>
                <button 
                  className="btn btn-secondary" 
                  onClick={testSendTransaction}
                >
                  Test Transaction Signing
                </button>
              </>
            )}
          </div>
          
          {error && (
            <div className="alert alert-error mt-4">
              <span>{error}</span>
            </div>
          )}
          
          {success && (
            <div className="alert alert-success mt-4">
              <span>{success}</span>
            </div>
          )}
          
          {txSignature && (
            <div className="mt-4 p-3 bg-base-300 rounded">
              <p className="font-semibold">Transaction Signature:</p>
              <p className="break-all text-xs mt-1">{txSignature}</p>
            </div>
          )}
        </div>
        
        <div className="card bg-base-200 shadow-xl p-4">
          <h2 className="text-xl font-bold mb-2">Connection Details</h2>
          <div className="overflow-x-auto">
            <pre className="bg-base-300 p-4 rounded-lg text-sm">
              {JSON.stringify({
                wallet: {
                  name: wallet?.adapter.name,
                  connecting: wallet?.adapter.connecting,
                  connected: wallet?.adapter.connected,
                  readyState: wallet?.adapter.readyState,
                  supportedTransactionVersions: wallet?.adapter.supportedTransactionVersions?.size 
                    ? Array.from(wallet.adapter.supportedTransactionVersions) 
                    : null,
                  // List the available methods on the wallet adapter
                  methods: wallet?.adapter ? Object.getOwnPropertyNames(Object.getPrototypeOf(wallet.adapter))
                    .filter(name => typeof wallet.adapter[name as keyof typeof wallet.adapter] === 'function') : []
                },
                connection: {
                  endpoint: connection?.rpcEndpoint,
                  commitment: connection?.commitment,
                },
                environment: {
                  protocol: typeof window !== 'undefined' ? window.location.protocol : null,
                  host: typeof window !== 'undefined' ? window.location.host : null,
                },
              }, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </>
  );
} 