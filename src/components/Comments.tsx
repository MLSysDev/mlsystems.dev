'use client';

import { useState } from 'react';

type Comment = {
  id: string;
  author: string;
  time: string;
  body: string;
};

const SEED: Comment[] = [
  {
    id: 'c1',
    author: 'priya',
    time: '3 hr ago',
    body: 'The flame graph point at the end is underrated. We saw a 2.4x speedup just by moving the projection up out of the inner loop.',
  },
  {
    id: 'c2',
    author: 'naoko',
    time: '5 hr ago',
    body: "Curious if you've run this on H200s — the bandwidth profile is different enough that some of the assumptions about memory-boundedness need to be re-validated.",
  },
  {
    id: 'c3',
    author: 'hugo',
    time: '1 day ago',
    body: 'Beautifully written. The bit about treating it as a scheduling problem first is exactly the framing I wish more vendors would adopt.',
  },
];

export default function Comments() {
  const [comments, setComments] = useState<Comment[]>(SEED);
  const [draft, setDraft] = useState('');

  const submit = () => {
    if (!draft.trim()) return;
    setComments([
      { id: `c${Date.now()}`, author: 'you', time: 'just now', body: draft.trim() },
      ...comments,
    ]);
    setDraft('');
  };

  return (
    <section className="comments">
      <h3>
        Discussion <span className="count">{comments.length} comments</span>
      </h3>

      <div className="comment-compose">
        <textarea
          placeholder="Add to the discussion — markdown supported, code blocks encouraged."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <div className="comment-compose-foot">
          <span>posting as @you · be kind, be specific</span>
          <button
            className="btn btn-primary"
            style={{ padding: '6px 14px', fontSize: 13 }}
            onClick={submit}
            disabled={!draft.trim()}
          >
            Post
          </button>
        </div>
      </div>

      {comments.map((c) => (
        <div key={c.id} className="comment">
          <div className="comment-head">
            <div className="comment-avatar">{c.author.slice(0, 2).toUpperCase()}</div>
            <div className="comment-author">@{c.author}</div>
            <div className="comment-time">· {c.time}</div>
          </div>
          <div className="comment-body">{c.body}</div>
          <div className="comment-actions">
            <button>♡ reply</button>
            <button>↗ share</button>
            <button>⚐ flag</button>
          </div>
        </div>
      ))}
    </section>
  );
}
