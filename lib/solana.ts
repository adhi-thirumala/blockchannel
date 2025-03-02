import * as web3 from '@solana/web3.js';
import * as borsh from 'borsh';
import BN from 'bn.js';
import { Buffer } from 'buffer';

// Program ID for the deployed smart contract
export const PROGRAM_ID = new web3.PublicKey('bWbGoUe1QUVfy2uUTcMgq8jrQjn6uHKzDr9EdwhNWtf');

// Fee recipient wallet
export const FEE_WALLET = new web3.PublicKey('A3zCw8i5c4dEV5NRCeqPgwbZKCe1dpjxYsp699Hj19sh');

// Connect to Solana devnet
export const connection = new web3.Connection(
  'https://api.devnet.solana.com',
  'confirmed'
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

// Post schema for serialization
class CreatePostSchema {
  title: string;
  content: string;

  constructor(props: { title: string; content: string }) {
    this.title = props.title;
    this.content = props.content;
  }

  static schema = {
    struct: {
      title: 'string',
      content: 'string',
    }
  };
}

// Comment schema for serialization
class CreateCommentSchema {
  postId: string;
  content: string;

  constructor(props: { postId: string; content: string }) {
    this.postId = props.postId;
    this.content = props.content;
  }

  static schema = {
    struct: {
      postId: 'string',
      content: 'string',
    }
  };
}

// Like post schema for serialization
class LikePostSchema {
  postId: string;

  constructor(props: { postId: string }) {
    this.postId = props.postId;
  }

  static schema = {
    struct: {
      postId: 'string',
    }
  };
}

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
function serializeCreatePostInstruction(title: string, content: string): Buffer {
  const schema = new CreatePostSchema({ title, content });
  
  const instructionType = Buffer.alloc(1);
  instructionType.writeUInt8(InstructionType.CreatePost);
  
  const serializedData = borshSerialize(CreatePostSchema.schema, schema);
  
  return Buffer.concat([instructionType, serializedData]);
}

// Serialize create comment instruction
function serializeCreateCommentInstruction(postId: string, content: string): Buffer {
  const schema = new CreateCommentSchema({ postId, content });
  
  const instructionType = Buffer.alloc(1);
  instructionType.writeUInt8(InstructionType.CreateComment);
  
  const serializedData = borshSerialize(CreateCommentSchema.schema, schema);
  
  return Buffer.concat([instructionType, serializedData]);
}

// Serialize like post instruction
function serializeLikePostInstruction(postId: string): Buffer {
  const schema = new LikePostSchema({ postId });
  
  const instructionType = Buffer.alloc(1);
  instructionType.writeUInt8(InstructionType.LikePost);
  
  const serializedData = borshSerialize(LikePostSchema.schema, schema);
  
  return Buffer.concat([instructionType, serializedData]);
}

// Helper function for Borsh serialization
function borshSerialize(schema: any, obj: any): Buffer {
  const buffer = Buffer.alloc(1000); // Preallocate buffer
  const length = borsh.serialize(schema, obj, buffer);
  return buffer.slice(0, length);
}

// Helper function for Borsh deserialization
function borshDeserialize(schema: any, buffer: Buffer): any {
  try {
    return borsh.deserialize(schema, buffer);
  } catch (error) {
    console.error('Deserialization error:', error);
    throw new Error(`Failed to deserialize data: ${(error as Error).message}`);
  }
}

// Generate post account seed
function generatePostAccountSeed(): string {
  return 'post_' + Math.random().toString(36).substring(2, 15);
}

// Generate comment account seed
function generateCommentAccountSeed(): string {
  return 'comment_' + Math.random().toString(36).substring(2, 15);
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
 * Create a new post on the blockchain
 * @param wallet Connected wallet
 * @param title Post title
 * @param content Post content
 * @returns Transaction signature and post account ID
 */
export async function createPost(
  wallet: any,
  title: string,
  content: string
): Promise<{ signature: string; postId: string }> {
  try {
    // Create a new keypair for the post account
    const postAccount = web3.Keypair.generate();
    
    // Calculate minimum balance for rent exemption
    const space = 8 + 32 + 4 + title.length + 4 + content.length + 4 + 4 + 8;
    const rentExemption = await connection.getMinimumBalanceForRentExemption(space);
    
    // Create transaction
    const transaction = new web3.Transaction();
    
    // Create system program instruction to create post account
    const createAccountIx = web3.SystemProgram.createAccount({
      fromPubkey: wallet.publicKey,
      newAccountPubkey: postAccount.publicKey,
      lamports: rentExemption,
      space: space,
      programId: PROGRAM_ID,
    });
    
    // Create transfer instruction for post creation fee
    const transferIx = web3.SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: FEE_WALLET,
      lamports: COSTS.CREATE_POST,
    });
    
    // Create post instruction
    const createPostIx = new web3.TransactionInstruction({
      keys: [
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: postAccount.publicKey, isSigner: false, isWritable: true },
        { pubkey: web3.SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: FEE_WALLET, isSigner: false, isWritable: true },
      ],
      programId: PROGRAM_ID,
      data: serializeCreatePostInstruction(title, content),
    });
    
    // Add instructions to transaction
    transaction.add(createAccountIx);
    transaction.add(transferIx);
    transaction.add(createPostIx);
    
    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = wallet.publicKey;
    
    // Sign with post account
    transaction.partialSign(postAccount);
    
    // Handle different wallet types (browser wallet adapter vs. direct keypair)
    let signature: string;
    
    if ('signTransaction' in wallet) {
      // Web wallet (Phantom, Solflare, etc.)
      const signedTx = await wallet.signTransaction(transaction);
      signature = await connection.sendRawTransaction(signedTx.serialize());
    } else if (wallet instanceof web3.Keypair) {
      // Local keypair
      transaction.sign(wallet, postAccount);
      signature = await connection.sendRawTransaction(transaction.serialize());
    } else {
      throw new Error('Unsupported wallet type');
    }
    
    await connection.confirmTransaction(signature);
    
    return {
      signature,
      postId: postAccount.publicKey.toString(),
    };
  } catch (error) {
    console.error('Error creating post:', error);
    throw new Error(`Failed to create post: ${(error as Error).message}`);
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
    
    if ('signTransaction' in wallet) {
      // Web wallet (Phantom, Solflare, etc.)
      const signedTx = await wallet.signTransaction(transaction);
      signature = await connection.sendRawTransaction(signedTx.serialize());
    } else if (wallet instanceof web3.Keypair) {
      // Local keypair
      transaction.sign(wallet, commentAccount);
      signature = await connection.sendRawTransaction(transaction.serialize());
    } else {
      throw new Error('Unsupported wallet type');
    }
    
    await connection.confirmTransaction(signature);
    
    return {
      signature,
      commentId: commentAccount.publicKey.toString(),
    };
  } catch (error) {
    console.error('Error creating comment:', error);
    throw new Error(`Failed to create comment: ${(error as Error).message}`);
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
    
    if ('signTransaction' in wallet) {
      // Web wallet (Phantom, Solflare, etc.)
      const signedTx = await wallet.signTransaction(transaction);
      signature = await connection.sendRawTransaction(signedTx.serialize());
    } else if (wallet instanceof web3.Keypair) {
      // Local keypair
      transaction.sign(wallet);
      signature = await connection.sendRawTransaction(transaction.serialize());
    } else {
      throw new Error('Unsupported wallet type');
    }
    
    await connection.confirmTransaction(signature);
    
    return signature;
  } catch (error) {
    console.error('Error liking post:', error);
    throw new Error(`Failed to like post: ${(error as Error).message}`);
  }
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
      } catch (error) {
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
  } catch (error) {
    console.error('Error fetching posts:', error);
    throw new Error(`Failed to fetch posts: ${(error as Error).message}`);
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
      } catch (error) {
        // Skip accounts that fail to parse as comments
        continue;
      }
    }
    
    // Sort comments by creation time (newest first)
    comments.sort((a, b) => b.createdAt - a.createdAt);
    
    return comments;
  } catch (error) {
    console.error('Error fetching comments:', error);
    throw new Error(`Failed to fetch comments: ${(error as Error).message}`);
  }
}

/**
 * Get the balance of a wallet
 * @param publicKey Wallet public key
 * @returns Balance in lamports
 */
export async function getBalance(publicKey: web3.PublicKey): Promise<number> {
  try {
    return await connection.getBalance(publicKey);
  } catch (error) {
    console.error('Error getting balance:', error);
    throw new Error(`Failed to get balance: ${(error as Error).message}`);
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
  } catch (error) {
    console.error('Error requesting airdrop:', error);
    throw new Error(`Airdrop failed: ${(error as Error).message}`);
  }
} 