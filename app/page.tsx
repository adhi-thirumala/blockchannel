'use client';
import Nav from "@/app/nav";
import { useState, useEffect } from "react"
import React from "react"
import PostCreationPopup from "./components/PostCreation"
import PostDisplayPopup from "./components/PostDisplay";
import { Post, AccountData } from "./objects";
import { GetWalletPDAs } from "./functions";

export default function Page() {
  // State for showing/hiding post creation popup
  const [displayPostCreation, setDisplayPostCreation] = useState(false);
  const toggleDisplayPostCreation = () => { setDisplayPostCreation(!displayPostCreation); };

  // State for showing/hiding post display popup
  const [displayPostDisplay, setDisplayPostDisplay] = useState(false);
  const toggleDisplayPostDisplay = () => { setDisplayPostDisplay(!displayPostDisplay); };

  // State for storing posts
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    setPosts(GetWalletPDAs);
    console.log(posts);
  }, []); // <-- EMPTY DEPENDENCY ARRAY -- runs once on mount

  // Handle new post creation
  const handlePostCreated = (newPost: Post) => {
    setPosts(GetWalletPDAs());
    console.log(posts);
  };

  // Create a dummy post for display if no posts exist
  const dummyPost: AccountData = {
    title: "Example Title",
    date: "Example Date",
    body: "Example Content",
    author: "exampleauthorwallet",
    votes: 0,
  };

  // Get the post to display - either the first post in the list or a dummy post
  const postToDisplay = posts.length > 0 ? posts[0] : dummyPost;

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
            // onCommentCreated={handleCommentCreated} 
            />
          <button
            className="absolute flex w-full h-full bg-base-100 opacity-50 z-99" 
            onClick={toggleDisplayPostDisplay}
          />
        </> : <></>}

{/* post display list starts here (popups above) */}
      
      <main className="h-screen w-full px-40 mt-5">
        <div>
          <ul className="list bg-base-100 rounded-box shadow-md"> 
            {/* Render posts from state if available */}
            {posts.length > 0 && posts.map((post, index) => (
              <li key={index} className="hover:bg-base-200">
                <a href="#" className="list-row">
                  <div></div>
                  <div>
                    <div className="uppercase font-semibold opacity-60">{post.title}</div>
                    <div>{post.date}: {post.author}</div>
                  </div>
                  <p className="list-col-wrap text-sm">{post.body}</p>
                  <div className="badge">{post.votes} votes</div>
                </a>
              </li>
            ))}
            {/* Original example post */}
            <li className="hover:bg-base-200">
              <a href="#" className="list-row">
                <div></div>
                <div>
                  <div className="uppercase font-semibold opacity-60">Title</div>
                  <div>12-30-2025: Author</div>
                </div>
                <p className="list-col-wrap text-sm">Body</p>
                <div className="badge">0 votes</div>
              </a>
            </li>
          </ul>
          <div className="absolute bottom-5 right-5">
            <button className="btn btn-lg btn-primary" onClick={() => {toggleDisplayPostCreation(); console.log("click")}}>Create Post</button>
          </div>
          <div className="absolute bottom-20 right-5">
            <button className="btn btn-lg btn-primary" onClick={toggleDisplayPostDisplay}>Display Post</button>
          </div>
        </div>
      </main>
    </div>
  );
}
