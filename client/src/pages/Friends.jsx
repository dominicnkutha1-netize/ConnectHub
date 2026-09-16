import { useEffect, useState } from 'react';
import { api } from '../api';
import Avatar from '../components/Avatar';

export default function Friends() {
  const [requests, setRequests] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [friends, setFriends] = useState([]);

  async function load() {
    try {
      const [r, s, f] = await Promise.all([
        api('/api/friends/requests'),
        api('/api/friends/suggestions'),
        api('/api/friends')
      ]);
      setRequests(r);
      setSuggestions(s);
      setFriends(f);
    } catch (e) {}
  }

  useEffect(() => { load(); }, []);

  async function act(path) {
    try {
      await api(path, { method: 'POST' });
      load();
    } catch (e) {
      alert(e.message);
    }
  }

  return (
    <div className="container">
      <h2 className="section-title">Friend Requests</h2>
      {requests.length === 0 && <p className="muted">No pending requests.</p>}
      {requests.map(u => (
        <div className="card row-card" key={u.id}>
          <Avatar user={u} size={40} />
          <span className="name">{u.name}</span>
          <button className="btn btn-primary btn-small" onClick={() => act(`/api/friends/${u.id}/accept`)}>Accept</button>
          <button className="btn btn-ghost btn-small" onClick={() => act(`/api/friends/${u.id}/decline`)}>Decline</button>
        </div>
      ))}

      <h2 className="section-title">People You May Know</h2>
      {suggestions.map(u => (
        <div className="card row-card" key={u.id}>
          <Avatar user={u} size={40} />
          <span className="name">{u.name}</span>
          {u.status
            ? <span className="muted">{u.status}</span>
            : <button className="btn btn-primary btn-small" onClick={() => act(`/api/friends/${u.id}/request`)}>Add Friend</button>}
        </div>
      ))}

      <h2 className="section-title">My Friends ({friends.length})</h2>
      {friends.map(u => (
        <div className="card row-card" key={u.id}>
          <Avatar user={u} size={40} />
          <span className="name">{u.name}</span>
          <button className="btn btn-danger btn-small" onClick={() => act(`/api/friends/${u.id}/unfriend`)}>Unfriend</button>
        </div>
      ))}
      {friends.length === 0 && <p className="muted">No friends yet. Add some above!</p>}
    </div>
  );
}