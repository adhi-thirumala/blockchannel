use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
  account_info::{next_account_info, AccountInfo},
  entrypoint,
  entrypoint::ProgramResult,
  msg,
  program::{invoke, invoke_signed},
  program_error::ProgramError,
  pubkey::Pubkey,
  rent::Rent,
  system_instruction,
  sysvar::Sysvar,
};

// Program entrypoint
entrypoint!(process_instruction);

// Program instructions
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub enum BlockchanInstruction {
  // Create a new post
  CreatePost { title: String, content: String },

  // Add a comment to an existing post
  CreateComment { post_id: String, content: String },

  // Like a post
  LikePost { post_id: String },
}

// Post data structure
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct PostData {
  pub creator: Pubkey,
  pub title: String,
  pub content: String,
  pub votes: i32,
  pub comment_count: u32,
  pub created_at: u64,
}

// Comment data structure
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct CommentData {
  pub post_id: String,
  pub creator: Pubkey,
  pub content: String,
  pub created_at: u64,
}

pub fn process_instruction(
  program_id: &Pubkey,
  accounts: &[AccountInfo],
  instruction_data: &[u8],
) -> ProgramResult {
  // Unpack instruction data
  let instruction = BlockchanInstruction::try_from_slice(instruction_data)?;

  match instruction {
    BlockchanInstruction::CreatePost { title, content } => {
      process_create_post(program_id, accounts, title, content)
    }
    BlockchanInstruction::CreateComment { post_id, content } => {
      process_create_comment(program_id, accounts, post_id, content)
    }
    BlockchanInstruction::LikePost { post_id } => process_like_post(program_id, accounts, post_id),
  }
}

fn process_create_post(
  program_id: &Pubkey,
  accounts: &[AccountInfo],
  title: String,
  content: String,
) -> ProgramResult {
  let accounts_iter = &mut accounts.iter();

  // Get accounts
  let user = next_account_info(accounts_iter)?;
  let post_account = next_account_info(accounts_iter)?;
  let system_program = next_account_info(accounts_iter)?;
  let fee_receiver = next_account_info(accounts_iter)?;

  // Verify signer
  if !user.is_signer {
    return Err(ProgramError::MissingRequiredSignature);
  }

  // Fee for creating post: 0.01 SOL = 10,000,000 lamports
  let post_fee = 10_000_000;

  // Transfer fee from user to fee receiver
  invoke(
    &system_instruction::transfer(user.key, fee_receiver.key, post_fee),
    &[user.clone(), fee_receiver.clone(), system_program.clone()],
  )?;

  // Get rent exemption amount
  let rent = Rent::get()?;
  let rent_lamports =
    rent.minimum_balance(std::mem::size_of::<PostData>() + title.len() + content.len());

  // Create post account
  invoke(
    &system_instruction::create_account(
      user.key,
      post_account.key,
      rent_lamports,
      (std::mem::size_of::<PostData>() + title.len() + content.len()) as u64,
      program_id,
    ),
    &[user.clone(), post_account.clone(), system_program.clone()],
  )?;

  // Create and serialize post data
  let post_data = PostData {
    creator: *user.key,
    title,
    content,
    votes: 0,
    comment_count: 0,
    created_at: solana_program::clock::Clock::get()?.unix_timestamp as u64,
  };

  post_data.serialize(&mut &mut post_account.data.borrow_mut()[..])?;

  msg!("Post created successfully");
  Ok(())
}

fn process_create_comment(
  program_id: &Pubkey,
  accounts: &[AccountInfo],
  post_id: String,
  content: String,
) -> ProgramResult {
  let accounts_iter = &mut accounts.iter();

  // Get accounts
  let user = next_account_info(accounts_iter)?;
  let comment_account = next_account_info(accounts_iter)?;
  let post_account = next_account_info(accounts_iter)?;
  let post_owner = next_account_info(accounts_iter)?;
  let system_program = next_account_info(accounts_iter)?;

  // Verify signer
  if !user.is_signer {
    return Err(ProgramError::MissingRequiredSignature);
  }

  // Deserialize post data to verify it exists and update comment count
  let mut post_data = PostData::try_from_slice(&post_account.data.borrow())?;
  if post_data.creator != *post_owner.key {
    return Err(ProgramError::InvalidArgument);
  }

  // Fee for creating comment: 0.005 SOL = 5,000,000 lamports
  let comment_fee = 5_000_000;

  // Transfer fee from user to post owner
  invoke(
    &system_instruction::transfer(user.key, post_owner.key, comment_fee),
    &[user.clone(), post_owner.clone(), system_program.clone()],
  )?;

  // Get rent for comment account
  let rent = Rent::get()?;
  let rent_lamports =
    rent.minimum_balance(std::mem::size_of::<CommentData>() + post_id.len() + content.len());

  // Create comment account
  invoke(
    &system_instruction::create_account(
      user.key,
      comment_account.key,
      rent_lamports,
      (std::mem::size_of::<CommentData>() + post_id.len() + content.len()) as u64,
      program_id,
    ),
    &[
      user.clone(),
      comment_account.clone(),
      system_program.clone(),
    ],
  )?;

  // Create comment data
  let comment_data = CommentData {
    post_id,
    creator: *user.key,
    content,
    created_at: solana_program::clock::Clock::get()?.unix_timestamp as u64,
  };

  comment_data.serialize(&mut &mut comment_account.data.borrow_mut()[..])?;

  // Update post comment count
  post_data.comment_count += 1;
  post_data.serialize(&mut &mut post_account.data.borrow_mut()[..])?;

  msg!("Comment added successfully");
  Ok(())
}

fn process_like_post(
  program_id: &Pubkey,
  accounts: &[AccountInfo],
  post_id: String,
) -> ProgramResult {
  let accounts_iter = &mut accounts.iter();

  // Get accounts
  let user = next_account_info(accounts_iter)?;
  let post_account = next_account_info(accounts_iter)?;
  let post_owner = next_account_info(accounts_iter)?;
  let system_program = next_account_info(accounts_iter)?;

  // Verify signer
  if !user.is_signer {
    return Err(ProgramError::MissingRequiredSignature);
  }

  // Deserialize post data to update votes
  let mut post_data = PostData::try_from_slice(&post_account.data.borrow())?;
  if post_data.creator != *post_owner.key {
    return Err(ProgramError::InvalidArgument);
  }

  // Fee for liking post: 0.001 SOL = 1,000,000 lamports
  let like_fee = 1_000_000;

  // Transfer fee from user to post owner
  invoke(
    &system_instruction::transfer(user.key, post_owner.key, like_fee),
    &[user.clone(), post_owner.clone(), system_program.clone()],
  )?;

  // Update post votes
  post_data.votes += 1;
  post_data.serialize(&mut &mut post_account.data.borrow_mut()[..])?;

  msg!("Post liked successfully");
  Ok(())
}
