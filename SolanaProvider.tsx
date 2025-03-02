'use client';

import { FC, ReactNode, useMemo, useState, useCallback } from 'react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { 
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  CloverWalletAdapter,
  CoinbaseWalletAdapter,
  LedgerWalletAdapter,
  TorusWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';

// Default styles that can be overridden by your app
import '@solana/wallet-adapter-react-ui/styles.css';

interface SolanaProviderProps {
  children: ReactNode;
}

const SolanaProvider: FC<SolanaProviderProps> = ({ children }) => {
  // The network can be set to 'devnet', 'testnet', or 'mainnet-beta'
  const network = WalletAdapterNetwork.Devnet;

  // You can also provide a custom RPC endpoint
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  
  // Enable autoConnect to ensure wallet is properly initialized
  const [autoConnect, setAutoConnect] = useState(true);

  // Define wallet connection error handler
  const onError = useCallback((error: any) => {
    console.error('Wallet connection error:', error);
    // You could add toast notifications or other error displays here
  }, []);

  // @solana/wallet-adapter-wallets includes all the adapters but supports tree shaking and lazy loading
  // Only the wallets you configure here will be compiled into your application
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter({
        network // Explicitly specify the network for Solflare to ensure proper configuration
      }),
      new CloverWalletAdapter(),
      new CoinbaseWalletAdapter(),
      new LedgerWalletAdapter(),
      new TorusWalletAdapter(),
    ],
    [network]
  );

  return (
    <ConnectionProvider 
      endpoint={endpoint}
      config={{ 
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: 60000,
        wsEndpoint: network === WalletAdapterNetwork.Devnet 
          ? 'wss://api.devnet.solana.com/' 
          : undefined // Add WebSocket endpoint for better transaction confirmations
      }}
    >
      <WalletProvider 
        wallets={wallets} 
        autoConnect={autoConnect} 
        onError={onError}
      >
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

export default SolanaProvider; 