'use client';

import { FC, useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { truncateAddress } from '@/utils';

const WalletButton: FC = () => {
  const { publicKey, wallet, disconnect, connecting, connected } = useWallet();
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionFailed, setConnectionFailed] = useState(false);

  // Reset connecting state whenever the connected state changes
  useEffect(() => {
    if (connected) {
      setIsConnecting(false);
      setConnectionFailed(false);
    }
  }, [connected]);

  // Handle the case where connecting is stuck
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (connecting) {
      setIsConnecting(true);
      setConnectionFailed(false);
      
      // If still connecting after 10 seconds, assume it's stuck
      timer = setTimeout(() => {
        if (connecting) {
          disconnect?.();
          setIsConnecting(false);
          setConnectionFailed(true);
        }
      }, 10000);
    } else if (!connecting && !connected) {
      setIsConnecting(false);
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [connecting, connected, disconnect]);

  // Custom component to replace the default WalletMultiButton behavior
  const CustomMultiButton = () => {
    if (connectionFailed) {
      return (
        <button 
          onClick={() => setConnectionFailed(false)}
          className="btn bg-error hover:bg-error-focus text-white"
        >
          Connection Failed
        </button>
      );
    }
    
    if (isConnecting) {
      return (
        <button className="btn bg-primary text-white loading">
          Connecting...
        </button>
      );
    }
    
    return (
      <WalletMultiButton className="btn bg-primary hover:bg-primary-focus text-white" />
    );
  };

  if (!publicKey) {
    return <CustomMultiButton />;
  }

  return (
    <div className="dropdown dropdown-end">
      <div tabIndex={0} role="button" className="btn m-1 bg-primary text-white">
        {wallet?.adapter.name || 'Wallet'}: {truncateAddress(publicKey.toString())}
      </div>
      <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
        <li>
          <button 
            onClick={() => navigator.clipboard.writeText(publicKey.toString())}
            className="text-sm"
          >
            Copy Address
          </button>
        </li>
        <li>
          <button 
            onClick={() => disconnect()}
            className="text-sm text-error"
          >
            Disconnect
          </button>
        </li>
      </ul>
    </div>
  );
};

export default WalletButton; 