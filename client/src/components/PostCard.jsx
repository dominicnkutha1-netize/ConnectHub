import { useState } from 'react';
import { api } from '../api';
import { useAuth } from '../App';
import Avatar from './Avatar';

export default function PostCard({ post, onChange }) {
  const { user } = useAuth();
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [showComments, setShowComments] = useState(false);

  async function toggleLike() {
    try {
      onChange(await api(`/api/posts/${post.id}/like`, { method: 'POST' }));
    } catch (e) {}
  }

  async function addComment(e) {
    e.preventDefault();
    if (!comment.trim()) return;
    setBusy(true);
    try {
      onChange(await api(`/api/posts/${post.id}/comment`, { method: 'POST', body: JSON.stringify({ content: comment }) }));
      setComment('');
    } catch (e) {} finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm('Delete this post?')) return;
    try {
      await api(`/api/posts/${post.id}`, { method: 'DELETE' });
      window.location.reload();
    } catch (e) {}
  }

  const isMine = user.id === post.author?.id;

  return (
    <div className="card post">
      <div className="post-header">
        <Avatar user={post.author} size={44} />
        <div className="post-meta">
          <span className="post-author">{post.author?.name}</span>
          <span className="post-time">{new Date(post.createdAt).toLocaleString()}</span>
        </div>
        {isMine && <button className="btn btn-small btn-ghost" onClick={remove}>Delete</button>}
      </div>
      <p className="post-content">{post.content}</p>
      <div className="post-actions">
        <button
          className={`btn btn-like ${post.likedByMe ? 'liked' : ''}`}
          onClick={toggleLike}
        >
          {post.likedByMe ? 'Liked' : 'Like'} ({post.likeCount})
        </button>
        <button className="btn btn-ghost" onClick={() => setShowComments(!showComments)}>
          Comments ({post.comments.length})
        </button>
      </div>
      {showComments && (
        <div className="comments">
          {post.comments.map(c => (
            <div className="comment" key={c.id}>
              <Avatar size={30} />
              <div className="comment-body">
                <span className="comment-name">{c.user}</span>
                <span>{c.content}</span>
              </div>
            </div>
          ))}
          <form className="comment-form" onSubmit={addComment}>
            <input
              className="input"
              placeholder="Write a comment..."
              value={comment}
              onChange={e => setComment(e.target.value)}
              disabled={busy}
            />
            <button className="btn btn-primary btn-small" disabled={busy || !comment.trim()}>Post</button>
          </form>
        </div>
      )}
    </div>
  );
}