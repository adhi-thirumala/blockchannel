import React from "react";

// post
export type Post = {
    title: string;
    date: string;
    body: string;
    author: string;
    votes: number;
    seed?: string; // Optional seed for traceability
  };

export type PostTransaction = {

}

export type PostReplyRecord = {
    author: string;
    hash: string;
    date: string; // copilot says "transaction record" ?
    votes: number;
    remaining_balance: number; // is it transferred directly to wallet? (like immediately?)
}
  
// comment
export type Reply = {
    votes: string;
    body: string;
    author: string;
    date: string;
  };

export class AccountData {
  title: string;
  date: string;
  body: string;
  author: string;
  votes: number;
  seed?: string; // Optional seed field for client-side tracking

  constructor(title: string, date: string, body: string, author: string, votes: number, seed?: string) {
    this.title = title;
    this.date = date;
    this.body = body;
    this.author = author;
    this.votes = votes;
    this.seed = seed;
  }

  static schema = new Map([
    [
      AccountData,
      {
        kind: 'struct',
        fields: [
          ['title', 'string'],
          ['date', 'string'],
          ['body', 'string'],
          ['author', 'string'],
          ['votes', 'u64']
        ],
      },
    ],
  ]);
}


