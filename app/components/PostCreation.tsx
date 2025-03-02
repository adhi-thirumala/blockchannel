'use client';

import { useState, useEffect, FormEvent } from "react";
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { createPost } from "../solana";
import { Post } from "../objects";

interface PostCreationProps {
  onClose: () => void;
  onPostCreated?: (post: Post) => void;
}

export default function PostCreationPopup({ onClose, onPostCreated }: PostCreationProps) {
  const { publicKey, wallet, connected } = useWallet();
  const { connection } = useConnection();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [errors, setErrors] = useState<{title?: string; content?: string; general?: string}>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [postStatus, setPostStatus] = useState<'idle' | 'validating' | 'confirming' | 'confirming-wallet' | 'processing' | 'success' | 'error'>('idle');
  const [transactionTimeoutId, setTransactionTimeoutId] = useState<NodeJS.Timeout | null>(null);

  // Clear errors when input changes
  useEffect(() => {
    if (title) {
      setErrors(prev => ({ ...prev, title: undefined }));
    }
    if (content) {
      setErrors(prev => ({ ...prev, content: undefined }));
    }
  }, [title, content]);

  // Inform user about post creation benefits
  const postCreationInfo = (
    <div className="alert alert-info mt-3 mb-3">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
      <span>Each post is created with a unique identifier to help you track your content in your wallet transactions history.</span>
    </div>
  );

  // Clear any timeouts on unmount
  useEffect(() => {
    return () => {
      if (transactionTimeoutId) {
        clearTimeout(transactionTimeoutId);
      }
    };
  }, [transactionTimeoutId]);

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: {title?: string; content?: string} = {};
    let isValid = true;

    if (!title.trim()) {
      newErrors.title = 'Title is required';
      isValid = false;
    } else if (title.length > 100) {
      newErrors.title = 'Title must be less than 100 characters';
      isValid = false;
    }

    if (!content.trim()) {
      newErrors.content = 'Content is required';
      isValid = false;
    } else if (content.length > 1000) {
      newErrors.content = 'Content must be less than 1000 characters';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Step 1: Initial UI Response
    setIsSubmitting(true);
    setPostStatus('validating');
    
    // Step 2: Client-Side Validation
    if (!validateForm()) {
      setIsSubmitting(false);
      setPostStatus('idle');
      return;
    }

    // Verify wallet connection
    if (!connected || !publicKey || !wallet) {
      setErrors({
        general: 'Please connect your wallet first'
      });

      setIsSubmitting(false);
      setPostStatus('error');
      return;
    }

    try {
      // Step 3: Prepare for wallet interaction
      setPostStatus('confirming-wallet');
      
      // Set a timeout to detect if the wallet popup is missed or doesn't appear
      const timeoutId = setTimeout(() => {
        if (postStatus === 'confirming-wallet') {
          setErrors({
            general: "Wallet approval timeout. Please check if your wallet popup appeared and try again."
          });
          setIsSubmitting(false);
          setPostStatus('error');
        }
      }, 30000); // 30 second timeout
      
      setTransactionTimeoutId(timeoutId);
      
      console.log('Using wallet for transaction:', wallet?.adapter?.name || 'unknown');
      
      // Add debug logs about the wallet state
      console.log('Wallet connection details:', {
        connected: wallet?.adapter?.connected,
        connecting: wallet?.adapter?.connecting,
        publicKey: publicKey?.toString(),
        protocol: typeof window !== 'undefined' ? window.location.protocol : 'unknown',
        rpcEndpoint: connection?.rpcEndpoint || 'not available'
      });
      
      // Pass the adapter directly for more reliable transaction handling
      const result = await createPost(
        wallet.adapter,
        title,
        content
      );
      
      // Clear the timeout since we got past the wallet confirmation
      if (transactionTimeoutId) {
        clearTimeout(transactionTimeoutId);
        setTransactionTimeoutId(null);
      }
      
      // Step 5: Transaction Processing
      setPostStatus('processing');
      
      // Step 6: Success Path
      setPostStatus('success');
      
      // Create a Post object to pass back to the parent component
      if (onPostCreated) {
        const newPost: Post = {
          title,
          body: content,
          date: new Date().toDateString(),
          author: publicKey.toString(),
          votes: 0,
          seed: result.seed
        };
        onPostCreated(newPost);
      }
      
      // Close the popup after a short delay to show success message
      setTimeout(() => {
        onClose();
        // Reset form
        setTitle('');
        setContent('');
        setIsSubmitting(false);
        setPostStatus('idle');
      }, 1500); // Slightly longer to show success message
      
    } catch (error) {
      // Clear any pending timeouts
      if (transactionTimeoutId) {
        clearTimeout(transactionTimeoutId);
        setTransactionTimeoutId(null);
      }
      
      // Step 7: Error Handling with better user feedback
      console.error('Error creating post:', error);
      
      let errorMsg = 'Failed to create post';
      
      if (error instanceof Error) {
        errorMsg = error.message;
        
        // Remove technical debug information that might confuse users
        if (errorMsg.includes('(Debug:')) {
          errorMsg = errorMsg.split('(Debug:')[0].trim();
        }
      }
      
      setErrors({
        general: errorMsg
      });
      setIsSubmitting(false);
      setPostStatus('error');
    }
  };

  // Determine button text based on status
  const getButtonText = () => {
    switch (postStatus) {
      case 'validating': return 'Validating...';
      case 'confirming-wallet': return 'Awaiting Wallet Approval...';
      case 'confirming': return 'Confirming...';
      case 'processing': return 'Processing...';
      case 'success': return 'Posted!';
      case 'error': return 'Retry';
      default: return 'Post!';
    }
  };

  // Determine if the button should have loading animation
  const isButtonLoading = 
    postStatus === 'validating' || 
    postStatus === 'confirming' || 
    postStatus === 'confirming-wallet' || 
    postStatus === 'processing';

  return (
    <div className="flex w-full h-full transition justify-center absolute">
      <form 
        className="w-1/2 absolute top-sm my-10 transition hover:scale-101 border-primary z-101"
        onSubmit={handleSubmit}
      >
        <fieldset className="fieldset w-full bg-base-200 border border-base-300 p-4 rounded-box">
          <legend className="fieldset-legend w-md text-base">Create Post</legend>
          
          <label className="fieldset-label w-full text-sm text-base">Title</label>
          <input 
            type="text" 
            className={`input w-full ${errors.title ? 'input-error' : ''}`} 
            placeholder="Title" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isSubmitting}
          />
          {errors.title && <p className="text-error text-xs mt-1">{errors.title}</p>}
          
          <label className="fieldset-label w-full text-sm text-base mt-3">Content</label>
          <textarea 
            className={`textarea h-70 w-full ${errors.content ? 'textarea-error' : ''}`} 
            placeholder="Share your post :D"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={isSubmitting}
          ></textarea>
          {errors.content && <p className="text-error text-xs mt-1">{errors.content}</p>}
          
          {postCreationInfo}
          
          {errors.general && (
            <div className="alert alert-error mt-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span>{errors.general}</span>
            </div>
          )}
          
          {postStatus === 'success' && (
            <div className="alert alert-success mt-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span>Post created successfully!</span>
            </div>
          )}
          
          {postStatus === 'confirming-wallet' && (
            <div className="alert alert-info mt-3">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <span>Please check your wallet extension and approve the transaction</span>
            </div>
          )}
          
          {postStatus === 'processing' && (
            <div className="alert alert-info mt-3">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <span>Processing transaction on the Solana blockchain...</span>
            </div>
          )}
          
          <div className="flex justify-between mt-4">
            <button 
              type="button" 
              className="btn btn-ghost"
              onClick={onClose}
              disabled={isSubmitting && (postStatus === 'confirming' || postStatus === 'processing')}
            >
              Cancel
            </button>
            
            <button 
              type="submit" 
              className={`btn ${postStatus === 'error' ? 'btn-error' : postStatus === 'success' ? 'btn-success' : 'btn-primary'} ${isButtonLoading ? 'loading' : ''}`}
              disabled={isSubmitting}
            >
              {getButtonText()}
            </button>
          </div>
          
          {(postStatus === 'confirming-wallet' || postStatus === 'confirming') && (
            <div className="text-center mt-2 text-sm">
              <p>Please confirm the transaction in your wallet</p>
              <p className="text-xs opacity-70">Transaction fee: 0.01 SOL</p>
              <p className="text-xs mt-1 opacity-70">If you don't see a wallet popup, check your browser extensions</p>
            </div>
          )}
        </fieldset>
      </form>
    </div>
  );
}