import { useEffect, useState } from 'react';
import { api } from '../api';
import PostCard from '../components/PostCard';
import { useAuth } from '../App';
import Avatar from '../components/Avatar';

export default function Feed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setPosts(await api('/api/posts'));
    } catch (e) {}
  }

  useEffect(() => { load(); }, []);

  async function submit(e) {
    e.preventDefault();
    if (!content.trim()) return;
    setBusy(true);
    setError('');
    try {
      const post = await api('/api/posts', { method: 'POST', body: JSON.stringify({ content }) });
      setPosts([post, ...posts]);
      setContent('');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function updatePost(updated) {
    setPosts(posts.map(p => (p.id === updated.id ? updated : p)));
  }

  return (
    <div className="feed">
      <form className="card composer" onSubmit={submit}>
        <div className="composer-row">
          <Avatar user={user} size={40} />
          <textarea
            className="input textarea"
            placeholder="What's on your mind?"
            value={content}
            onChange={e => setContent(e.target.value)}
          />
        </div>
        {error && <p className="error">{error}</p>}
        <div className="composer-actions">
          <button className="btn btn-primary" disabled={busy || !content.trim()}>{busy ? 'Posting...' : 'Post'}</button>
        </div>
      </form>
      {posts.length === 0 && (
        <div className="card empty-state">No posts yet. Add friends and share something!</div>
      )}
      {posts.map(p => <PostCard key={p.id} post={p} onChange={updatePost} />)}
    </div>
  );
}