'use client';
import Nav from "@/app/nav";
import { useState, useEffect, MouseEvent } from "react"
import React from "react"
import PostCreationPopup from "./components/PostCreation"
import PostDisplayPopup from "./components/PostDisplay";
import { Post, AccountData } from "./objects";
import { GetWalletPDAs } from "./solana";
import * as solanaTypes from "./solana";

// Function to convert solana Post type to our app Post type
const convertSolanaPostToAppPost = (solanaPost: solanaTypes.Post): Post => {
  return {
    title: solanaPost.title,
    body: solanaPost.content,
    date: new Date(solanaPost.createdAt * 1000).toDateString(), // Convert timestamp to readable date
    author: solanaPost.creator,
    votes: solanaPost.votes,
    seed: solanaPost.id
  };
};

export default function Page() {
  // State for showing/hiding post creation popup
  const [displayPostCreation, setDisplayPostCreation] = useState(false);
  const toggleDisplayPostCreation = () => { setDisplayPostCreation(!displayPostCreation); };

  // State for showing/hiding post display popup
  const [displayPostDisplay, setDisplayPostDisplay] = useState(false);
  
  // Function to display a post
  function toggleDisplayPostDisplay(post?: AccountData | Post) {
    if (post) {
      console.log("Displaying post:", post);
      setPostToDisplay(post as AccountData);
    }
    setDisplayPostDisplay(!displayPostDisplay);
  }

  // State for storing posts
  const [posts, setPosts] = useState<Post[]>([]);

   // Create a dummy post for display if no posts exist
   const dummyPost: AccountData = {
    title: "Example Title",
    date: "Example Date",
    body: "Example Content",
    author: "exampleauthorwallet",
    votes: 0,
  };

  const [postToDisplay, setPostToDisplay] = useState(dummyPost);

  // Load posts when the component mounts
  /* useEffect(() => {
    // Handle async function
    const fetchPosts = async () => {
      try {
        console.log("Fetching posts from blockchain...");
        const solanaPosts = await GetWalletPDAs();
        console.log("Initial load, posts:", solanaPosts);
        
        // Handle the case of no posts gracefully
        if (!solanaPosts || solanaPosts.length === 0) {
          
          setPosts([]);
          return;
        }
        
        // Convert Solana posts to app posts
        const appPosts = solanaPosts.map(convertSolanaPostToAppPost);
        setPosts(appPosts);
      } catch (error) {
        console.error("Error loading posts:", error);
        // Set an empty array to show the "No Posts" message
        setPosts([]);
        // You could also set some error state here to show an error message to the user
      }
    };
    
    fetchPosts();

    // Set up listener for post updates from blockchain
    const handlePostsUpdated = (event: CustomEvent<Post[]>) => {
      console.log("Posts updated from blockchain:", event.detail);
      setPosts(event.detail);
    };

    // Add event listener for post updates
    window.addEventListener('postsUpdated', handlePostsUpdated as EventListener);

    // Clean up the event listener when component unmounts
    return () => {
      window.removeEventListener('postsUpdated', handlePostsUpdated as EventListener);
    };
  }, []); */

  // Handle new post creation
  const handlePostCreated = (newPost: Post) => {
    // Refetch all posts from the blockchain instead of manually adding
    setPosts([...posts, newPost]);
    console.log("Posts refreshed after new post creation");
  };

  const reloadPostsList = () => {
    // Handle async function
    const fetchPosts = async () => {
      try {
        console.log("Reloading posts from blockchain...");
        const solanaPosts = await GetWalletPDAs();
        console.log("Loaded posts:", solanaPosts);
        
        // Handle the case of no posts gracefully
        if (!solanaPosts || solanaPosts.length === 0) {
          console.log("No posts found or error occurred during reload - displaying empty state");
          setPosts([]);
          return;
        }
        
        // Convert Solana posts to app posts
        const appPosts = solanaPosts.map(convertSolanaPostToAppPost);
        setPosts(appPosts);
      } catch (error) {
        console.error("Error reloading posts:", error);
        // You could set some error state here to show an error message to the user
      }
    };
    
    fetchPosts();
  }

  // Handler for clicking the close button
  const handleCloseClick = (e: MouseEvent) => {
    e.stopPropagation();
    toggleDisplayPostDisplay();
  };

  // Render messages when there are no posts
  const NoPostsMessage = () => (
    <div className="text-center p-10">
      <h2 className="text-xl font-semibold mb-2">No Posts Found</h2>
      <p className="mb-4">There are currently no posts on the blockchain.</p>
      <p className="text-sm opacity-70">Click "Create Post" to add the first post!</p>
    </div>
  );

  return (
    <div className="z-10">
      <Nav />
      {displayPostCreation ? 
      <>
          <PostCreationPopup 
            onClose={toggleDisplayPostCreation} 
            onPostCreated={handlePostCreated} 
          />
           <button 
            className="absolute flex w-full h-full bg-base-100 opacity-50 z-99" 
            onClick={toggleDisplayPostCreation}
          />
      </> : <></> }
      {displayPostDisplay ? 
        <>
          <PostDisplayPopup
            data={postToDisplay}
            onClose={toggleDisplayPostDisplay} 
            IncrementLike={() => {postToDisplay.votes++;}}
            // onCommentCreated={handleCommentCreated} 
            />
          <button
            className="absolute flex w-full h-full bg-base-100 opacity-50 z-99" 
            onClick={handleCloseClick}
          />
        </> : <></>}

{/* post display list starts here (popups above) */}
      
      <main className="h-screen w-full px-40 mt-5">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Recent Posts</h1>
          <button 
            className="btn btn-primary"
            onClick={toggleDisplayPostCreation}
          >
            Create Post
          </button>
      
        </div>
        <div>
          <ul className="list bg-base-100 rounded-box shadow-md"> 
            {/* Render posts from state if available */}
            {posts.length > 0 ? posts.map((post, index) => (
              <li 
                key={index} 
                className="hover:bg-base-200 rounded-box shadow-md p-2 mb-2" 
                onClick={() => toggleDisplayPostDisplay(post)}
              >
                  <div className="list-row cursor-pointer">
                  <div>
                    <div className="uppercase font-semibold mb-2">{post.title}</div>
                    <div className="uppercase opacity-70">{post.date} • Posted by: {post.author}</div>
                  </div>
                  <p className="list-col-wrap text-sm">{post.body}</p>
                  <div className="badge">{post.votes} votes</div>
                  </div>
              </li>
            )) : (
              // Show this when no posts are available
              <NoPostsMessage />
            )}
          </ul>
        </div>
      </main>
    </div>
  );
}
