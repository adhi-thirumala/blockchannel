'use client';

import { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import * as web3 from '@solana/web3.js';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export default function TestSolflare() {
  const { wallet, publicKey, connected, signTransaction, signAllTransactions, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [walletInfo, setWalletInfo] = useState<string>('Not connected');
  const [error, setError] = useState<string | null>(null);
  const [txResult, setTxResult] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [log, setLog] = useState<string[]>([]);
  
  // Add to log function
  const addLog = (message: string) => {
    setLog(prev => [...prev, `[${new Date().toISOString()}] ${message}`]);
  };
  
  // Clear log function
  const clearLog = () => setLog([]);
  
  // Update wallet info when connection status changes
  useEffect(() => {
    if (connected && wallet && publicKey) {
      const info = {
        name: wallet.adapter.name,
        publicKey: publicKey.toString(),
        connected,
        hasSignTransaction: !!signTransaction,
        hasSignAllTransactions: !!signAllTransactions,
        hasSendTransaction: !!sendTransaction,
        adapterMethods: Object.getOwnPropertyNames(Object.getPrototypeOf(wallet.adapter))
          .filter(method => typeof wallet.adapter[method as keyof typeof wallet.adapter] === 'function' && !method.startsWith('_'))
      };
      
      setWalletInfo(JSON.stringify(info, null, 2));
      addLog(`Wallet connected: ${wallet.adapter.name}`);
    } else {
      setWalletInfo('Not connected');
      addLog('Wallet disconnected');
    }
  }, [connected, wallet, publicKey, signTransaction, signAllTransactions, sendTransaction]);
  
  // Test a simple SOL transfer to self
  const testSimpleTransfer = async () => {
    if (!connected || !publicKey || !wallet) {
      setError('Wallet not connected');
      return;
    }
    
    try {
      setError(null);
      setTxResult(null);
      setTxStatus('processing');
      addLog('Starting simple transfer test');
      
      // Create a new transaction for a tiny SOL transfer to self
      const transaction = new web3.Transaction();
      const instruction = web3.SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: publicKey, // Send to self
        lamports: 100, // Tiny amount (0.0000001 SOL)
      });
      
      transaction.add(instruction);
      
      // Get recent blockhash
      addLog('Getting recent blockhash');
      const { blockhash } = await connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;
      
      // Get serialized transaction size for logging
      const rawTx = transaction.serialize({ requireAllSignatures: false, verifySignatures: false });
      addLog(`Transaction size: ${rawTx.length} bytes`);
      
      // Send the transaction
      addLog(`Using wallet adapter: ${wallet.adapter.name}`);
      
      let signature;
      if (wallet.adapter.name === 'Solflare') {
        addLog('Using Solflare-specific approach');
        
        // For Solflare, use signTransaction function from useWallet() hook
        if (signTransaction) {
          const signedTx = await signTransaction(transaction);
          signature = await connection.sendRawTransaction(signedTx.serialize());
        } else {
          throw new Error('signTransaction method not available on wallet');
        }
      } else {
        addLog('Using standard sendTransaction approach');
        if (sendTransaction) {
          signature = await sendTransaction(transaction, connection);
        } else {
          throw new Error('sendTransaction method not available on wallet');
        }
      }
      
      addLog(`Transaction sent: ${signature}`);
      
      // Confirm transaction
      const confirmation = await connection.confirmTransaction(signature, 'confirmed');
      
      if (confirmation.value.err) {
        throw new Error(`Transaction error: ${JSON.stringify(confirmation.value.err)}`);
      }
      
      setTxResult(`Transaction successful: ${signature}`);
      setTxStatus('success');
      addLog(`Transaction confirmed successfully: ${signature}`);
      
    } catch (err: any) {
      console.error('Transaction error:', err);
      setError(`Error: ${err.message || String(err)}`);
      setTxStatus('error');
      addLog(`ERROR: ${err.message || String(err)}`);
      
      // Add detailed error logging
      if (err.name) addLog(`Error name: ${err.name}`);
      if (err.code) addLog(`Error code: ${err.code}`);
      if (err.stack) addLog(`Stack: ${err.stack.slice(0, 200)}...`);
    }
  };
  
  // Test serializing and re-signing approach (helpful for transactions with multiple signers)
  const testSerializeReSign = async () => {
    if (!connected || !publicKey || !wallet || !signTransaction) {
      setError('Wallet not connected or signTransaction not available');
      return;
    }
    
    try {
      setError(null);
      setTxResult(null);
      setTxStatus('processing');
      addLog('Starting serialize/re-sign test');
      
      // Create a dummy keypair to simulate a second signer
      const dummyKeypair = web3.Keypair.generate();
      addLog(`Created dummy keypair: ${dummyKeypair.publicKey.toString()}`);
      
      // Create a transaction requiring both signatures
      const transaction = new web3.Transaction();
      
      // Add a memo instruction to identify the tx 
      // (using TransactionInstruction directly as a simple example)
      const memoInstruction = new web3.TransactionInstruction({
        keys: [
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: dummyKeypair.publicKey, isSigner: false, isWritable: false },
        ],
        programId: new web3.PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
        data: Buffer.from('Test multi-sig serialize approach', 'utf-8'),
      });
      
      transaction.add(memoInstruction);
      
      // Get recent blockhash
      addLog('Getting recent blockhash');
      const { blockhash } = await connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;
      
      // Partially sign with dummy keypair
      transaction.partialSign(dummyKeypair);
      addLog('Transaction partially signed with dummy keypair');
      
      // Serialize the partially signed transaction
      const serializedTx = transaction.serialize({ 
        requireAllSignatures: false,
        verifySignatures: false
      });
      addLog(`Serialized transaction size: ${serializedTx.length} bytes`);
      
      // Create a new transaction from the serialized one
      const recoveredTx = web3.Transaction.from(serializedTx);
      addLog('Re-created transaction from serialized data');
      
      // Sign and send with wallet
      let signature;
      if (wallet.adapter.name === 'Solflare') {
        addLog('Using Solflare-specific approach with signTransaction');
        // Use signTransaction from the hook directly
        const signedTx = await signTransaction(recoveredTx);
        signature = await connection.sendRawTransaction(signedTx.serialize());
      } else {
        addLog('Using standard sendTransaction approach');
        if (sendTransaction) {
          signature = await sendTransaction(recoveredTx, connection);
        } else {
          throw new Error('sendTransaction method not available on wallet');
        }
      }
      
      addLog(`Transaction sent: ${signature}`);
      
      // Confirm transaction
      const confirmation = await connection.confirmTransaction(signature, 'confirmed');
      
      if (confirmation.value.err) {
        throw new Error(`Transaction error: ${JSON.stringify(confirmation.value.err)}`);
      }
      
      setTxResult(`Transaction successful: ${signature}`);
      setTxStatus('success');
      addLog(`Transaction confirmed successfully: ${signature}`);
      
    } catch (err: any) {
      console.error('Transaction error:', err);
      setError(`Error: ${err.message || String(err)}`);
      setTxStatus('error');
      addLog(`ERROR: ${err.message || String(err)}`);
      
      // Add detailed error logging
      if (err.name) addLog(`Error name: ${err.name}`);
      if (err.code) addLog(`Error code: ${err.code}`);
      if (err.stack) addLog(`Stack: ${err.stack.slice(0, 200)}...`);
    }
  };
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Solflare Wallet Test Page</h1>
      
      <div className="flex justify-between items-center mb-4">
        <WalletMultiButton />
        <div>
          {txStatus === 'processing' && (
            <span className="badge badge-warning">Processing...</span>
          )}
          {txStatus === 'success' && (
            <span className="badge badge-success">Success!</span>
          )}
          {txStatus === 'error' && (
            <span className="badge badge-error">Error</span>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Wallet Information</h2>
            <pre className="bg-base-300 p-2 rounded-md text-xs overflow-auto h-40">
              {walletInfo}
            </pre>
          </div>
        </div>
        
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Connection Details</h2>
            <div>
              <p><strong>RPC Endpoint:</strong> {connection?.rpcEndpoint || 'Not connected'}</p>
              <p><strong>Commitment:</strong> {connection?.commitment || 'Not set'}</p>
            </div>
            <div className="card-actions justify-end mt-4">
              <button 
                className="btn btn-primary btn-sm"
                onClick={testSimpleTransfer}
                disabled={!connected || txStatus === 'processing'}
              >
                Test Simple Transfer
              </button>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={testSerializeReSign}
                disabled={!connected || txStatus === 'processing'}
              >
                Test Multi-Sig Approach
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {error && (
        <div className="alert alert-error mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span>{error}</span>
        </div>
      )}
      
      {txResult && (
        <div className="alert alert-success mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span>{txResult}</span>
        </div>
      )}
      
      <div className="card bg-base-200 shadow-xl mb-4">
        <div className="card-body">
          <div className="flex justify-between items-center">
            <h2 className="card-title">Transaction Logs</h2>
            <button 
              className="btn btn-sm btn-ghost"
              onClick={clearLog}
            >
              Clear
            </button>
          </div>
          <pre className="bg-base-300 p-2 rounded-md text-xs overflow-auto h-60">
            {log.join('\n')}
          </pre>
        </div>
      </div>
      
      <div className="card bg-neutral shadow-xl text-neutral-content mb-4">
        <div className="card-body">
          <h2 className="card-title">Troubleshooting Guide</h2>
          <ul className="list-disc pl-5">
            <li>If you're seeing WalletSendTransactionError, try the "Test Multi-Sig Approach" button, which uses a different signing technique.</li>
            <li>Make sure you have sufficient SOL in your wallet (at least 0.01 SOL).</li>
            <li>Try disconnecting and reconnecting your wallet.</li>
            <li>If using Solflare, ensure you're using the latest version of the extension.</li>
            <li>Check the browser console for additional error details.</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 