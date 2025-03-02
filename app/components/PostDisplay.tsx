'use client';

import { useState, useEffect, FormEvent } from "react";
import { useWallet } from '@solana/wallet-adapter-react';
import { createComment, likePost } from "../solana";
import { Post, AccountData } from "../objects";

interface CommentCreationProps {
  data: AccountData;
  onClose: () => void;
  onCommentCreated?: (post: AccountData) => void;
  IncrementLike: () => void;
}

export default function PostDisplayPopup({ onClose, onCommentCreated, data, IncrementLike }:  CommentCreationProps) {
  const { publicKey, wallet, connected } = useWallet();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [errors, setErrors] = useState<{title?: string; content?: string; general?: string}>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [postStatus, setPostStatus] = useState<'idle' | 'validating' | 'confirming' | 'confirming-wallet' | 'processing' | 'success' | 'error'>('idle');
  const [transactionTimeoutId, setTransactionTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const [likeStatus, setLikeStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [commentContent, setCommentContent] = useState("");

  // Clear errors when input changes
    useEffect(() => {
      if (title) {
        setErrors(prev => ({ ...prev, title: undefined }));
      }
      if (content) {
        setErrors(prev => ({ ...prev, content: undefined }));
      }
    }, [title, content]);
  
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

    if (!content.trim()) {
      newErrors.content = 'Content is required';
      isValid = false;
    } else if (content.length > 2000) {
      newErrors.content = 'Content must be less than 2000 characters';
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
      
      // Create a wallet object that combines all necessary properties
      const walletForTransaction = {
        // Include the wallet's adapter for transaction signing
        adapter: wallet.adapter,
        // Make sure the publicKey is directly accessible
        publicKey: publicKey
      };
      
      // Step 4: Blockchain Transaction - use createComment instead of createPost
      const result = await createComment(
        walletForTransaction,
        data.seed || 'unknown', // Use the post ID (seed) to associate the comment with the post
        data.author, // The original post author's public key
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
      if (onCommentCreated) {
        const newComment: AccountData = {
          title: `Comment on ${data.title}`,
          body: content,
          date: new Date().toDateString(),
          author: publicKey.toString(),
          votes: 0,
          seed: result.commentId // Store the comment ID for future reference
        };
        onCommentCreated(newComment);
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
        
        // Specific error handling for common issues
        if (errorMsg.includes('cancelled') || errorMsg.includes('canceled') || errorMsg.includes('rejected')) {
          errorMsg = 'Transaction was cancelled. Please approve the transaction in your wallet.';
        } else if (errorMsg.includes('timeout') || errorMsg.includes('timed out')) {
          errorMsg = 'Transaction timed out. Please check your wallet and internet connection.';
        } else if (errorMsg.includes('insufficient funds')) {
          errorMsg = 'Insufficient funds in your wallet. You need at least 0.01 SOL to create a post.';
        } else if (errorMsg.includes('network') || errorMsg.includes('connection')) {
          errorMsg = 'Network error. Please check your internet connection and try again.';
        }
      }
      
      setErrors({
        general: errorMsg
      });
      setIsSubmitting(false);
      setPostStatus('error');
    }
  };

  // Function to handle liking the post
  const handleLikePost = async () => {
    if (!connected || !publicKey || !wallet) {
      alert("Please connect your wallet first");
      return;
    }
        // Create a wallet object that combines all necessary properties
        const walletForTransaction = {
          // Include the wallet's adapter for transaction signing
          adapter: wallet.adapter,
          // Make sure the publicKey is directly accessible
          publicKey: publicKey
        };

    setLikeStatus("processing");
    try {
      await likePost(walletForTransaction, "8kn1UgmqaKJ3dtzz4v9ur67USarDVW3utoVN1d6Duk1x", "8kn1UgmqaKJ3dtzz4v9ur67USarDVW3utoVN1d6Duk1x");
      setLikeStatus("success");
      IncrementLike();
      // Update local storage or state as needed
    } catch (error) {
      console.error("Error liking post:", error);
      setLikeStatus("idle");
    }
  };

  const handleCommentSubmit = async () => {
    if (!connected || !publicKey || !wallet) {
      alert("Please connect your wallet first");
      return;
    }

    try {
      await createComment(wallet, data.seed, commentContent);
      setCommentContent("");
      // Optionally refresh comments or update local storage
    } catch (error) {
      console.error("Error creating comment:", error);
    }
  };

  // Add a like button to the UI
  const renderLikeButton = () => {
    let buttonText = 'Like Post';
    let buttonClass = 'btn btn-primary';
    let disabled = false;
    
    if (likeStatus === 'processing') {
      buttonText = 'Processing...';
      disabled = true;
    } else if (likeStatus === 'success') {
      buttonText = 'Liked!';
      buttonClass = 'btn btn-success';
    } else if (likeStatus === 'error') {
      buttonText = 'Failed to Like';
      buttonClass = 'btn btn-error';
    }
    
    return (
      <button 
        className={buttonClass} 
        onClick={() => {handleLikePost();}}
        disabled={disabled || !connected}
      >
        {buttonText}
      </button>
    );
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
    <div className="flex w-full h-full justify-center my-3 absolute transition">
    <div className="card card-border bg-base-100 w-2/3 h-5/6 z-101 overflow-auto">
        <div className="card-body my-3 mx-5">
            <h2 className="card-title ml-15 ">{data.title}</h2>
            <div className="ml-20 font-semibold opacity-60">{data.date} • {data.author}</div>
            <div className="ml-5 mt-10 mb-10 font-normal h-fit">{data.body}</div>
            
            {/* Vote and action section */}
            <div className="flex items-center gap-4 mb-4">
                <div className="badge badge-lg">{data.votes} votes</div>
                {renderLikeButton()}
            </div>
        <hr />

        <form onSubmit={handleSubmit}>
          
          <label className="fieldset-label w-full text-sm text-base mt-3">Write a comment!</label>
          <textarea 
            className={`textarea h-70 my-3 w-full ${errors.content ? 'textarea-error' : ''}`} 
            placeholder="Share your thoughts"
            value={commentContent}
            onChange={(e) => setCommentContent(e.target.value)}
            disabled={isSubmitting}
          ></textarea>
          {errors.content && <p className="text-error text-xs mt-1">{errors.content}</p>}
          
          {errors.general && (
            <div className="alert alert-error mt-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span>{errors.general}</span>
            </div>
          )}
          
          {postStatus === 'success' && (
            <div className="alert alert-success mt-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span>Comment added successfully!</span>
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
      </form>

        </div>
    </div>
    </div>
)
}
