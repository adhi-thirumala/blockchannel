import * as web3 from '@solana/web3.js';
import * as borsh from 'borsh';
import BN from 'bn.js';
import { Buffer } from 'buffer';

// Replace with your deployed program ID after deployment
export const PROGRAM_ID = new web3.PublicKey('bWbGoUe1QUVfy2uUTcMgq8jrQjn6uHKzDr9EdwhNWtf');

// Fee recipient wallet - replace with your fee wallet
export const FEE_WALLET = new web3.PublicKey('A3zCw8i5c4dEV5NRCeqPgwbZKCe1dpjxYsp699Hj19sh');

// Connect to Solana devnet with increased timeout and commitment
export const connection = new web3.Connection(
  'https://api.devnet.solana.com',
  {
    commitment: 'confirmed',
    confirmTransactionInitialTimeout: 60000, // Increase timeout to 60 seconds
    disableRetryOnRateLimit: false
  }
);

// Cost constants (in lamports)
export const COSTS = {
  CREATE_POST: 10_000_000, // 0.01 SOL
  CREATE_COMMENT: 5_000_000, // 0.005 SOL
  LIKE_POST: 1_000_000, // 0.001 SOL
};

// Instruction types
export enum InstructionType {
  CreatePost = 0,
  CreateComment = 1,
  LikePost = 2,
}

// Modify the schema definitions in the classes to be borsh-compliant
class CreatePostSchema {
  title: string;
  content: string;

  constructor(props: { title: string; content: string }) {
    this.title = props.title;
    this.content = props.content;
  }
}

// Schema for serializing CreatePost data
const CREATE_POST_SCHEMA = new Map([
  [
    CreatePostSchema,
    {
      kind: 'struct',
      fields: [
        ['title', 'string'],
        ['content', 'string'],
      ],
    },
  ],
]);

// Comment schema for serialization
class CreateCommentSchema {
  postId: string;
  content: string;

  constructor(props: { postId: string; content: string }) {
    this.postId = props.postId;
    this.content = props.content;
  }
}

// Schema for serializing CreateComment data
const CREATE_COMMENT_SCHEMA = new Map([
  [
    CreateCommentSchema,
    {
      kind: 'struct',
      fields: [
        ['postId', 'string'],
        ['content', 'string'],
      ],
    },
  ],
]);

// Like post schema for serialization
class LikePostSchema {
  postId: string;

  constructor(props: { postId: string }) {
    this.postId = props.postId;
  }
}

// Schema for serializing LikePost data
const LIKE_POST_SCHEMA = new Map([
  [
    LikePostSchema,
    {
      kind: 'struct',
      fields: [
        ['postId', 'string'],
      ],
    },
  ],
]);

// Post data schema for deserialization
class PostData {
  creator: Uint8Array;
  title: string;
  content: string;
  votes: number;
  commentCount: number;
  createdAt: BN;

  constructor(props: {
    creator: Uint8Array;
    title: string;
    content: string;
    votes: number;
    commentCount: number;
    createdAt: BN;
  }) {
    this.creator = props.creator;
    this.title = props.title;
    this.content = props.content;
    this.votes = props.votes;
    this.commentCount = props.commentCount;
    this.createdAt = props.createdAt;
  }

  static schema = {
    struct: {
      creator: { array: { type: 'u8', len: 32 } },
      title: 'string',
      content: 'string',
      votes: 'i32',
      commentCount: 'u32',
      createdAt: 'u64',
    }
  };
}

// Comment data schema for deserialization
class CommentData {
  postId: string;
  creator: Uint8Array;
  content: string;
  createdAt: BN;

  constructor(props: {
    postId: string;
    creator: Uint8Array;
    content: string;
    createdAt: BN;
  }) {
    this.postId = props.postId;
    this.creator = props.creator;
    this.content = props.content;
    this.createdAt = props.createdAt;
  }

  static schema = {
    struct: {
      postId: 'string',
      creator: { array: { type: 'u8', len: 32 } },
      content: 'string',
      createdAt: 'u64',
    }
  };
}

// Serialize create post instruction
export function serializeCreatePostInstruction(title: string, content: string): Buffer {
  console.log(`Serializing CreatePost instruction with title length: ${title.length} bytes, content length: ${content.length} bytes`);
  console.log(`Title: ${title}`);
  console.log(`Content (first 50 chars): ${content.substring(0, 50)}`);

  try {
    // Step 1: Create instruction type buffer (one byte for instruction type)
    const instructionTypeBuffer = Buffer.alloc(1);
    instructionTypeBuffer.writeUInt8(InstructionType.CreatePost);
    
    // Step 2: Create manual serialization for the data
    // Format: [title length (4 bytes)][title bytes][content length (4 bytes)][content bytes]
    
    // Convert strings to UTF-8 byte arrays
    const titleBytes = Buffer.from(title, 'utf8');
    const contentBytes = Buffer.from(content, 'utf8');
    
    // Create buffers for length prefixes (4 bytes each, little endian)
    const titleLengthBuffer = Buffer.alloc(4);
    titleLengthBuffer.writeUInt32LE(titleBytes.length, 0);
    
    const contentLengthBuffer = Buffer.alloc(4);
    contentLengthBuffer.writeUInt32LE(contentBytes.length, 0);
    
    // Concatenate all parts to form the data buffer
    const serializedData = Buffer.concat([
      titleLengthBuffer,
      titleBytes,
      contentLengthBuffer,
      contentBytes
    ]);
    
    console.log(`Serialized data length: ${serializedData.length} bytes`);
    console.log(`Instruction type hex: ${instructionTypeBuffer.toString('hex')}`);
    console.log(`Serialized data hex: ${serializedData.toString('hex')}`);
    
    // Concatenate instruction type and serialized data
    const instructionData = Buffer.concat([instructionTypeBuffer, serializedData]);
    console.log(`Total instruction data length: ${instructionData.length} bytes`);
    
    return instructionData;
  } catch (error) {
    console.error('Error serializing CreatePost instruction data:', error);
    throw new Error(`Failed to serialize data: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function serializeCreateCommentInstruction(postId: string, content: string): Buffer {
  console.log(`Serializing CreateComment instruction with postId: ${postId}`);
  console.log(`Content length: ${content.length} bytes`);
  
  try {
    // Step 1: Create instruction type buffer
    const instructionTypeBuffer = Buffer.alloc(1);
    instructionTypeBuffer.writeUInt8(InstructionType.CreateComment);
    
    // Step 2: Create manual serialization for the data
    // Format: [postId length (4 bytes)][postId bytes][content length (4 bytes)][content bytes]
    
    // Convert strings to UTF-8 byte arrays
    const postIdBytes = Buffer.from(postId, 'utf8');
    const contentBytes = Buffer.from(content, 'utf8');
    
    // Create buffers for length prefixes (4 bytes each, little endian)
    const postIdLengthBuffer = Buffer.alloc(4);
    postIdLengthBuffer.writeUInt32LE(postIdBytes.length, 0);
    
    const contentLengthBuffer = Buffer.alloc(4);
    contentLengthBuffer.writeUInt32LE(contentBytes.length, 0);
    
    // Concatenate all parts to form the data buffer
    const serializedData = Buffer.concat([
      postIdLengthBuffer,
      postIdBytes,
      contentLengthBuffer,
      contentBytes
    ]);
    
    console.log(`Serialized data length: ${serializedData.length} bytes`);
    
    // Concatenate instruction type and serialized data
    const instructionData = Buffer.concat([instructionTypeBuffer, serializedData]);
    console.log(`Total instruction data length: ${instructionData.length} bytes`);
    
    return instructionData;
  } catch (error) {
    console.error('Error serializing CreateComment instruction data:', error);
    throw new Error(`Failed to serialize data: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function serializeLikePostInstruction(postId: string): Buffer {
  console.log(`Serializing LikePost instruction with postId: ${postId}`);
  
  try {
    // Step 1: Create instruction type buffer
    const instructionTypeBuffer = Buffer.alloc(1);
    instructionTypeBuffer.writeUInt8(InstructionType.LikePost);
    
    // Step 2: Create manual serialization for the data
    // Format: [postId length (4 bytes)][postId bytes]
    
    // Convert string to UTF-8 byte array
    const postIdBytes = Buffer.from(postId, 'utf8');
    
    // Create buffer for length prefix (4 bytes, little endian)
    const postIdLengthBuffer = Buffer.alloc(4);
    postIdLengthBuffer.writeUInt32LE(postIdBytes.length, 0);
    
    // Concatenate parts to form the data buffer
    const serializedData = Buffer.concat([
      postIdLengthBuffer,
      postIdBytes
    ]);
    
    console.log(`Serialized data length: ${serializedData.length} bytes`);
    
    // Concatenate instruction type and serialized data
    const instructionData = Buffer.concat([instructionTypeBuffer, serializedData]);
    console.log(`Total instruction data length: ${instructionData.length} bytes`);
    
    return instructionData;
  } catch (error: unknown) {
    console.error('Error serializing LikePost instruction data:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to serialize data: ${errorMessage}`);
  }
}

// Helper function for Borsh deserialization
function borshDeserialize(schema: any, buffer: Buffer): any {
  try {
    // The third parameter should be the class/type to instantiate
    // Since we're using custom schema objects, we'll pass the schema itself as the class
    const classType = schema.constructor || schema;
    return borsh.deserialize(schema, buffer, classType);
  } catch (error: any) {
    console.error('Deserialization error:', error);
    throw new Error(`Failed to deserialize data: ${error.message}`);
  }
}

// Generate post account seed
function generatePostAccountSeed(): string {
  // Combine prefix, timestamp, and random value for maximum uniqueness
  const timestamp = Date.now().toString();
  const randomBytes = Math.random().toString(36).substring(2, 15);
  return `post_${timestamp}_${randomBytes}`;
}

// Generate comment account seed
function generateCommentAccountSeed(): string {
  // Also update comment seed generation for consistency
  const timestamp = Date.now().toString();
  const randomBytes = Math.random().toString(36).substring(2, 15);
  return `comment_${timestamp}_${randomBytes}`;
}

/**
 * Create a new post
 * @param walletInfo Wallet from wallet adapter or with publicKey and signTransaction
 * @param title Post title
 * @param content Post content
 * @returns Transaction signature and post ID
 * 
 * This function creates a new post on the blockchain with:
 * - A unique seed based on timestamp and random values for client-side traceability
 * - The seed is NOT included in the instruction data to maintain compatibility
 *   with the existing blockchain program
 */
export async function createPost(
  walletInfo: any, // Accept any wallet type and handle internally
  title: string,
  content: string
): Promise<{ signature: string; postId: string; seed: string }> {
  try {
    // Validate that wallet has a publicKey
    if (!walletInfo.publicKey) {
      throw new Error("Transaction fee payer required");
    }

    console.log("Creating post with wallet:", JSON.stringify({
      hasPublicKey: !!walletInfo.publicKey,
      hasAdapter: !!walletInfo.adapter,
      adapterName: walletInfo.adapter?.name,
      connected: walletInfo.adapter?.connected,
      readyState: walletInfo.adapter?.readyState
    }));
    
    // Extract publicKey from wallet
    let publicKeyObj;
    
    // Handle different wallet types
    if (walletInfo.publicKey) {
      // Direct publicKey property (standard case)
      publicKeyObj = walletInfo.publicKey;
    } else if (walletInfo.adapter && walletInfo.adapter.publicKey) {
      // Wallet adapter case
      publicKeyObj = walletInfo.adapter.publicKey;
    } else {
      console.error("Invalid wallet object:", walletInfo);
      throw new Error("Transaction fee payer required - wallet must have a publicKey");
    }
    
    // Convert publicKey to proper PublicKey object if it's a string
    const publicKey = typeof publicKeyObj === 'string' 
      ? new web3.PublicKey(publicKeyObj)
      : publicKeyObj;
      
    // Use the connection provided with the wallet if available, otherwise use the default connection
    const currentConnection = walletInfo.connection || connection;
    console.log("Using connection with endpoint:", currentConnection.rpcEndpoint || "default");
    
    // Generate a unique seed for this post - for client-side tracking only
    const postSeed = generatePostAccountSeed();
    console.log("Generated unique post seed:", postSeed);
    
    // Create a new keypair for the post account with identifiable log
    const postAccount = web3.Keypair.generate();
    console.log("Generated post account:", postAccount.publicKey.toString(), "with seed:", postSeed);
    
    // Create transaction
    const transaction = new web3.Transaction();
    
    // Create transfer instruction for post creation fee
    const transferIx = web3.SystemProgram.transfer({
      fromPubkey: publicKey,
      toPubkey: FEE_WALLET,
      lamports: COSTS.CREATE_POST,
    });
    
    // Create post instruction
    const instructionData = serializeCreatePostInstruction(title, content);
    console.log("Instruction data length:", instructionData.length, "bytes");
    
    // Log account details for better debugging
    console.log("Accounts configuration for createPostIx:");
    console.log("- User/Signer:", publicKey.toString());
    console.log("- Post Account:", postAccount.publicKey.toString(), "(isSigner: true - REQUIRED for program to create it)");
    console.log("- System Program:", web3.SystemProgram.programId.toString());
    console.log("- Fee Wallet:", FEE_WALLET.toString());
    
    const createPostIx = new web3.TransactionInstruction({
      keys: [
        // The user is the fee payer and the one creating the post
        { pubkey: publicKey, isSigner: true, isWritable: true },
        
        // Post account MUST be a signer because the program is going to create it
        // The program uses SystemProgram.createAccount which requires the new account to sign
        { pubkey: postAccount.publicKey, isSigner: true, isWritable: true },
        
        // System program for the inner create account call in the Rust program
        { pubkey: web3.SystemProgram.programId, isSigner: false, isWritable: false },
        
        // Fee wallet to receive the post creation fee
        { pubkey: FEE_WALLET, isSigner: false, isWritable: true },
      ],
      programId: PROGRAM_ID,
      data: instructionData,
    });
    
    // Add instructions to transaction - note we're removing the createAccountIx
    // since the Rust program will handle creating the account
    transaction.add(transferIx);
    transaction.add(createPostIx);
    
    console.log("Transaction instructions added:", transaction.instructions.length);
    
    // Get latest blockhash with retry mechanism
    let blockhash;
    try {
      const { blockhash: latestBlockhash } = await currentConnection.getLatestBlockhash('finalized');
      blockhash = latestBlockhash;
      console.log("Got blockhash:", blockhash);
    } catch (err) {
      console.error("Error getting blockhash, retrying...", err);
      // Retry once after a short delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      const { blockhash: retryBlockhash } = await currentConnection.getLatestBlockhash('finalized');
      blockhash = retryBlockhash;
    }
    
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = publicKey;
    
    // Sign with post account - this is now critical since the post account needs to sign
    // for the Rust program to create it
    transaction.partialSign(postAccount);
    console.log("Transaction partially signed with post account");
    console.log("Transaction has", transaction.signatures.length, "signatures");
    
    // Log detailed transaction information
    console.log("Transaction fee payer:", transaction.feePayer?.toString());
    console.log("Transaction blockhash:", transaction.recentBlockhash);
    console.log("Transaction instructions:", transaction.instructions.map(ix => ix.programId.toString()));
    
    // This part is critical - let's try the direct approach first
    let signature: string;
    let rawErrorMessage: string = '';

    console.log('Available wallet methods:', Object.keys(walletInfo).join(', '), 
                walletInfo.adapter ? `Adapter methods: ${Object.keys(walletInfo.adapter).join(', ')}` : '');
    
    try {
      // SOLFLARE SPECIFIC APPROACH
      const wallet = walletInfo.adapter || walletInfo;
      console.log(`Attempting to sign transaction with wallet adapter: ${wallet.name || 'Unknown'}`);
      console.log("Instruction data details:", {
        instructionType: InstructionType.CreatePost,
        titleLength: title.length,
        contentLength: content.length,
      });

      // Special handling for Solflare and other wallets that prefer signTransaction over sendTransaction
      if (wallet.name === 'Solflare' || wallet.name === 'Phantom') {
        console.log('Using Solflare/Phantom specific signing approach');
        
        // First, serialize the transaction after partial signing with post account
        const serializedTransaction = transaction.serialize({
          requireAllSignatures: false,
          verifySignatures: false
        });
        
        // Create a new Transaction object from the serialized transaction
        const newTransaction = web3.Transaction.from(serializedTransaction);
        
        // Sign the new transaction with the wallet
        const signedTransaction = await wallet.signTransaction(newTransaction);
        
        // Send the fully signed transaction
        console.log("About to send transaction with both wallet and post account signatures");
        signature = await currentConnection.sendRawTransaction(signedTransaction.serialize());
        console.log('Transaction signed and sent successfully:', signature);
      }
      // For other wallets, try sendTransaction directly
      else if (typeof wallet.sendTransaction === 'function') {
        console.log('Using adapter.sendTransaction method');
        signature = await wallet.sendTransaction(transaction, currentConnection);
        console.log('Transaction sent with signature:', signature);
      }
      // Fallback to standard signTransaction approach
      else if (typeof wallet.signTransaction === 'function') {
        console.log('Using standard wallet signTransaction');
        const signedTx = await wallet.signTransaction(transaction);
        signature = await currentConnection.sendRawTransaction(signedTx.serialize());
        console.log('Transaction sent with signature:', signature);
      }
      else {
        throw new Error('No compatible wallet method found. The wallet must support sendTransaction or signTransaction.');
      }
    } catch (err: any) {
      // Save the raw error for debugging
      rawErrorMessage = err.message || String(err);
      console.error('DETAILED ERROR:', err);
      console.error('Error raw message:', rawErrorMessage);
      console.error('Error object keys:', Object.keys(err).join(', '));
      
      // Rethrow with original error to preserve error handling
      throw err;
    }
    
    // Confirm transaction with increased timeout and better handling
    console.log("Waiting for transaction confirmation...");
    try {
      const confirmation = await currentConnection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight: (await currentConnection.getBlockHeight()) + 150
      }, 'confirmed');
      
      // Check for timeout or failure
      if (confirmation.value.err) {
        throw new Error(`Transaction confirmed but has errors: ${JSON.stringify(confirmation.value.err)}`);
      }
      
      console.log("Transaction confirmed successfully");
    } catch (err: any) {
      console.error("Error confirming transaction:", err);
      
      // Check if transaction was actually successful despite confirmation error
      try {
        const signatureStatus = await currentConnection.getSignatureStatus(signature);
        if (signatureStatus.value && signatureStatus.value.confirmationStatus === 'confirmed') {
          console.log("Transaction actually confirmed despite confirmation error");
          // Transaction succeeded, continue
        } else {
          throw new Error(`Transaction may have failed: ${err.message}`);
        }
      } catch (statusErr) {
        throw new Error(`Failed to confirm transaction: ${err.message}`);
      }
    }
    
    // Log the post ID and associated seed for future reference
    console.log(`Post created with ID: ${postAccount.publicKey.toString()}, Seed: ${postSeed}`);
    
    return {
      signature,
      postId: postAccount.publicKey.toString(),
      seed: postSeed // Include the seed in the response for client-side traceability
    };
  } catch (error: any) {
    console.error('Error creating post:', error);
    
    // Enhanced error reporting
    let errorMsg = 'Failed to create post';
    const rawError = error.message || String(error);
    
    // Common wallet errors
    if (rawError.includes('cancelled') || rawError.includes('canceled') || rawError.includes('rejected') || 
        rawError.includes('reject') || rawError.includes('user rejected')) {
      errorMsg = 'Transaction was cancelled by the wallet. Please try again and approve the transaction promptly.';
    }
    // Timeout errors
    else if (rawError.includes('timeout') || rawError.includes('timed out')) {
      errorMsg = 'Transaction timed out. Please check your wallet and internet connection, then try again.';
    }
    // Network errors
    else if (rawError.includes('network') || rawError.includes('connection')) {
      errorMsg = 'Network error while processing transaction. Please check your internet connection and try again.';
    }
    // Insufficient funds
    else if (rawError.includes('insufficient') || rawError.includes('funds')) {
      errorMsg = 'Insufficient funds to complete the transaction. Please add more SOL to your wallet.';
    }
    // Method not found errors
    else if (rawError.includes('is not a function') || rawError.includes('method not found')) {
      errorMsg = 'Your wallet does not support the required transaction methods. Please try a different wallet.';
    }
    // Add raw error for debugging
    errorMsg += ` (Debug: ${rawError})`;
    
    throw new Error(errorMsg);
  }
}

/**
 * Create a comment on a post
 * @param wallet Connected wallet
 * @param postId Post ID to comment on
 * @param postOwner Public key of post owner
 * @param content Comment content
 * @returns Transaction signature and comment account ID
 */
export async function createComment(
  wallet: any,
  postId: string,
  postOwner: string,
  content: string
): Promise<{ signature: string; commentId: string }> {
  try {
    // Create a new keypair for the comment account
    const commentAccount = web3.Keypair.generate();
    const commentSeed = generateCommentAccountSeed();
    
    // Convert string IDs to PublicKey objects
    const postPubkey = new web3.PublicKey(postId);
    const postOwnerPubkey = new web3.PublicKey(postOwner);
    
    // Calculate minimum balance for rent exemption
    const space = 8 + 4 + postId.length + 32 + 4 + content.length + 8;
    const rentExemption = await connection.getMinimumBalanceForRentExemption(space);
    
    // Create transaction
    const transaction = new web3.Transaction();
    
    // Create system program instruction to create comment account
    const createAccountIx = web3.SystemProgram.createAccount({
      fromPubkey: wallet.publicKey,
      newAccountPubkey: commentAccount.publicKey,
      lamports: rentExemption,
      space: space,
      programId: PROGRAM_ID,
    });
    
    // Create transfer instruction for comment fee
    const transferIx = web3.SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: postOwnerPubkey,
      lamports: COSTS.CREATE_COMMENT,
    });
    
    // Create comment instruction
    const createCommentIx = new web3.TransactionInstruction({
      keys: [
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: commentAccount.publicKey, isSigner: false, isWritable: true },
        { pubkey: postPubkey, isSigner: false, isWritable: true },
        { pubkey: postOwnerPubkey, isSigner: false, isWritable: true },
        { pubkey: web3.SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: PROGRAM_ID,
      data: serializeCreateCommentInstruction(postId, content),
    });
    
    // Add instructions to transaction
    transaction.add(createAccountIx);
    transaction.add(transferIx);
    transaction.add(createCommentIx);
    
    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = wallet.publicKey;
    
    // Sign with comment account
    transaction.partialSign(commentAccount);
    
    // Handle different wallet types
    let signature: string;
    
    console.log('Attempting to sign transaction...');
    try {
      // Handle wallet adapter from @solana/wallet-adapter-react
      if (wallet.adapter && typeof wallet.adapter.signTransaction === 'function') {
        console.log('Using wallet adapter signTransaction');
        const signedTx = await wallet.adapter.signTransaction(transaction);
        signature = await connection.sendRawTransaction(signedTx.serialize());
      }
      // Check for direct signTransaction method
      else if (typeof wallet.signTransaction === 'function') {
        console.log('Using wallet signTransaction directly');
        const signedTx = await wallet.signTransaction(transaction);
        signature = await connection.sendRawTransaction(signedTx.serialize());
      }
      // Handle sendTransaction method (common in newer wallet adapters)
      else if (wallet.adapter && typeof wallet.adapter.sendTransaction === 'function') {
        console.log('Using wallet adapter sendTransaction');
        signature = await wallet.adapter.sendTransaction(transaction, connection);
      }
      // Check for direct sendTransaction method
      else if (typeof wallet.sendTransaction === 'function') {
        console.log('Using wallet sendTransaction directly');
        signature = await wallet.sendTransaction(transaction, connection);
      }
      // Check if it's a Keypair (unlikely in browser but possible in Node environment)
      else if (wallet instanceof web3.Keypair) {
        console.log('Using keypair signing');
        transaction.sign(wallet, commentAccount);
        signature = await connection.sendRawTransaction(transaction.serialize());
      }
      // If we don't have any supported signing method
      else {
        console.error('No valid signing method found on wallet:', wallet);
        throw new Error('Wallet must have ability to sign transactions');
      }
      
      console.log('Transaction sent successfully with signature:', signature);
    } catch (err: any) {
      console.error("Error during transaction signing/sending:", err);
      let errorMessage = "Failed to sign/send transaction with wallet";
      if (err.message) {
        errorMessage += `: ${err.message}`;
      }
      throw new Error(errorMessage);
    }
    
    await connection.confirmTransaction(signature);
    
    return {
      signature,
      commentId: commentAccount.publicKey.toString(),
    };
  } catch (error: unknown) {
    console.error('Error creating comment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to create comment: ${errorMessage}`);
  }
}

/**
 * Like a post
 * @param wallet Connected wallet
 * @param postId Post ID to like
 * @param postOwner Public key of post owner
 * @returns Transaction signature
 */
export async function likePost(
  wallet: any,
  postId: string,
  postOwner: string
): Promise<string> {
  try {
    // Convert string IDs to PublicKey objects
    const postPubkey = new web3.PublicKey(postId);
    const postOwnerPubkey = new web3.PublicKey(postOwner);
    
    // Create transaction
    const transaction = new web3.Transaction();
    
    // Create transfer instruction for like fee
    const transferIx = web3.SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: postOwnerPubkey,
      lamports: COSTS.LIKE_POST,
    });
    
    // Create like post instruction
    const likePostIx = new web3.TransactionInstruction({
      keys: [
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: postPubkey, isSigner: false, isWritable: true },
        { pubkey: postOwnerPubkey, isSigner: false, isWritable: true },
        { pubkey: web3.SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: PROGRAM_ID,
      data: serializeLikePostInstruction(postId),
    });
    
    // Add instructions to transaction
    transaction.add(transferIx);
    transaction.add(likePostIx);
    
    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = wallet.publicKey;
    
    // Handle different wallet types
    let signature: string;
    
    console.log('Attempting to sign transaction...');
    try {
      // Handle wallet adapter from @solana/wallet-adapter-react
      if (wallet.adapter && typeof wallet.adapter.signTransaction === 'function') {
        console.log('Using wallet adapter signTransaction');
        const signedTx = await wallet.adapter.signTransaction(transaction);
        signature = await connection.sendRawTransaction(signedTx.serialize());
      }
      // Check for direct signTransaction method
      else if (typeof wallet.signTransaction === 'function') {
        console.log('Using wallet signTransaction directly');
        const signedTx = await wallet.signTransaction(transaction);
        signature = await connection.sendRawTransaction(signedTx.serialize());
      }
      // Handle sendTransaction method (common in newer wallet adapters)
      else if (wallet.adapter && typeof wallet.adapter.sendTransaction === 'function') {
        console.log('Using wallet adapter sendTransaction');
        signature = await wallet.adapter.sendTransaction(transaction, connection);
      }
      // Check for direct sendTransaction method
      else if (typeof wallet.sendTransaction === 'function') {
        console.log('Using wallet sendTransaction directly');
        signature = await wallet.sendTransaction(transaction, connection);
      }
      // Check if it's a Keypair (unlikely in browser but possible in Node environment)
      else if (wallet instanceof web3.Keypair) {
        console.log('Using keypair signing');
        transaction.sign(wallet);
        signature = await connection.sendRawTransaction(transaction.serialize());
      }
      // If we don't have any supported signing method
      else {
        console.error('No valid signing method found on wallet:', wallet);
        throw new Error('Wallet must have ability to sign transactions');
      }
      
      console.log('Transaction sent successfully with signature:', signature);
    } catch (err: any) {
      console.error("Error during transaction signing/sending:", err);
      let errorMessage = "Failed to sign/send transaction with wallet";
      if (err.message) {
        errorMessage += `: ${err.message}`;
      }
      throw new Error(errorMessage);
    }
    
    await connection.confirmTransaction(signature);
    
    return signature;
  } catch (error: unknown) {
    console.error('Error liking post:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to like post: ${errorMessage}`);
  }
}

/**
 * Type definition for a post
 */
export interface Post {
  id: string;
  title: string;
  content: string;
  creator: string;
  votes: number;
  commentCount: number;
  createdAt: number;
}

/**
 * Type definition for a comment
 */
export interface Comment {
  id: string;
  postId: string;
  creator: string;
  content: string;
  createdAt: number;
}

/**
 * Fetch all posts from the blockchain
 * @param sortBy Sort method - 'recent' or 'votes'
 * @returns Array of posts
 */
export async function fetchPosts(sortBy: 'recent' | 'votes' = 'recent'): Promise<Post[]> {
  try {
    // Get all program accounts
    const accounts = await connection.getProgramAccounts(PROGRAM_ID);
    
    // Process accounts to identify and parse posts
    const posts: Post[] = [];
    
    for (const account of accounts) {
      try {
        // Skip accounts that are too small to be posts
        if (account.account.data.length < 50) continue;
        
        // Try to parse as post data
        // This is a simplified approach - in production you'd need more robust differentiation between post and comment accounts
        const data = Buffer.from(account.account.data);
        
        // Skip first 8 bytes (account discriminator)
        const postData = borshDeserialize(PostData.schema, data.slice(8)) as PostData;
        
        posts.push({
          id: account.pubkey.toString(),
          title: postData.title,
          content: postData.content,
          creator: new web3.PublicKey(postData.creator).toString(),
          votes: postData.votes,
          commentCount: postData.commentCount,
          createdAt: postData.createdAt.toNumber(),
        });
      } catch (error: unknown) {
        // Skip accounts that fail to parse as posts
        continue;
      }
    }
    
    // Sort posts
    if (sortBy === 'recent') {
      posts.sort((a, b) => b.createdAt - a.createdAt);
    } else {
      posts.sort((a, b) => b.votes - a.votes);
    }
    
    return posts;
  } catch (error: unknown) {
    console.error('Error fetching posts:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to fetch posts: ${errorMessage}`);
  }
}

/**
 * Fetch comments for a specific post
 * @param postId Post ID to fetch comments for
 * @returns Array of comments
 */
export async function fetchComments(postId: string): Promise<Comment[]> {
  try {
    // Get all program accounts
    const accounts = await connection.getProgramAccounts(PROGRAM_ID);
    
    // Process accounts to identify and parse comments for the given post
    const comments: Comment[] = [];
    
    for (const account of accounts) {
      try {
        // Skip accounts that are too small to be comments
        if (account.account.data.length < 50) continue;
        
        // Try to parse as comment data
        const data = Buffer.from(account.account.data);
        
        // Skip first 8 bytes (account discriminator)
        const commentData = borshDeserialize(CommentData.schema, data.slice(8)) as CommentData;
        
        // Only include comments for the requested post
        if (commentData.postId === postId) {
          comments.push({
            id: account.pubkey.toString(),
            postId: commentData.postId,
            creator: new web3.PublicKey(commentData.creator).toString(),
            content: commentData.content,
            createdAt: commentData.createdAt.toNumber(),
          });
        }
      } catch (error: unknown) {
        // Skip accounts that fail to parse as comments
        continue;
      }
    }
    
    // Sort comments by creation time (newest first)
    comments.sort((a, b) => b.createdAt - a.createdAt);
    
    return comments;
  } catch (error: unknown) {
    console.error('Error fetching comments:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to fetch comments: ${errorMessage}`);
  }
}

/**
 * Get the balance of a wallet
 * @param publicKey Wallet public key
 * @returns Balance in SOL
 */
export async function getBalance(publicKey: web3.PublicKey): Promise<number> {
  try {
    const balance = await connection.getBalance(publicKey);
    return balance / web3.LAMPORTS_PER_SOL;
  } catch (error: unknown) {
    console.error('Error getting balance:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to get balance: ${errorMessage}`);
  }
}

/**
 * Request an airdrop for testing purposes
 * @param publicKey Wallet public key
 * @param amount Amount in SOL
 * @returns Transaction signature
 */
export async function requestAirdrop(publicKey: web3.PublicKey, amount: number): Promise<string> {
  try {
    const signature = await connection.requestAirdrop(
      publicKey,
      amount * web3.LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(signature);
    return signature;
  } catch (error: unknown) {
    console.error('Error requesting airdrop:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Airdrop failed: ${errorMessage}`);
  }
}

/**
 * Function to get all posts associated with the connected wallet
 * This fetches all posts where the connected wallet is the creator
 * @returns Promise resolving to an array of Post objects
 */
export async function GetWalletPDAs(walletPublicKey?: web3.PublicKey): Promise<Post[]> {
  try {
    // Get all program accounts
    const accounts = await connection.getProgramAccounts(PROGRAM_ID);
    
    // Process accounts to identify and parse posts created by the connected wallet
    const posts: Post[] = [];
    
    for (const account of accounts) {
      try {
        // Skip accounts that are too small to be posts
        if (account.account.data.length < 50) continue;
        
        // Try to parse as post data
        const data = Buffer.from(account.account.data);
        
        // Skip first 8 bytes (account discriminator)
        const postData = borshDeserialize(PostData.schema, data.slice(8)) as PostData;
        
        // Only include posts created by the specified wallet
        // If no wallet is provided, return all posts (same as fetchPosts)
        const creatorPubkey = new web3.PublicKey(postData.creator);
        
        if (!walletPublicKey || creatorPubkey.equals(walletPublicKey)) {
          posts.push({
            id: account.pubkey.toString(),
            title: postData.title,
            content: postData.content,
            creator: creatorPubkey.toString(),
            votes: postData.votes,
            commentCount: postData.commentCount,
            createdAt: postData.createdAt.toNumber(),
          });
        }
      } catch (error: unknown) {
        // Skip accounts that fail to parse as posts
        continue;
      }
    }
    
    // Sort posts by creation time (newest first)
    posts.sort((a, b) => b.createdAt - a.createdAt);
    
    return posts;
  } catch (error: unknown) {
    console.error('Error fetching wallet posts:', error);
    return []; // Return empty array on error to prevent app crashes
  }
}
