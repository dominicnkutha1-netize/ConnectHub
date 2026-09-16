import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../App';
import PostCard from '../components/PostCard';
import Avatar from '../components/Avatar';

export default function Profile() {
  const { id } = useParams();
  const { user: me, setUser } = useAuth();
  const isMe = !id || Number(id) === me.id;
  const profileId = isMe ? me.id : Number(id);

  const [profile, setProfile] = useState(isMe ? me : null);
  const [posts, setPosts] = useState([]);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(me.name);
  const [bio, setBio] = useState(me.bio || '');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isMe) {
      api(`/api/users/${profileId}`).then(setProfile).catch(() => {});
    }
    api(`/api/posts/user/${profileId}`).then(setPosts).catch(() => {});
  }, [profileId, isMe]);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const updated = await api('/api/users/me', { method: 'PUT', body: JSON.stringify({ name, bio }) });
      setUser(updated);
      setProfile(updated);
      setEditing(false);
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function uploadPhoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('photo', file);
    try {
      const res = await api('/api/users/me/photo', { method: 'POST', body: fd });
      setProfile({ ...profile, photo: res.photo });
      setUser({ ...me, photo: res.photo });
    } catch (err) {
      alert(err.message);
    }
  }

  function updatePost(updated) {
    setPosts(posts.map(p => (p.id === updated.id ? updated : p)));
  }

  return (
    <div className="container">
      <div className="card profile-card">
        <Avatar user={profile} size={90} />
        <h2>{profile?.name}</h2>
        <p className="muted">{profile?.bio || 'No bio yet'}</p>
        {isMe && !editing && (
          <button className="btn btn-ghost" onClick={() => setEditing(true)}>Edit Profile</button>
        )}
        {isMe && editing && (
          <form className="profile-edit" onSubmit={save}>
            <input className="input" value={name} onChange={e => setName(e.target.value)} required />
            <textarea className="input textarea" value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell people about yourself" />
            <label className="btn btn-ghost file-btn">
              Upload Photo
              <input type="file" accept="image/*" hidden onChange={uploadPhoto} />
            </label>
            <div className="row">
              <button className="btn btn-primary" disabled={busy}>Save</button>
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </form>
        )}
      </div>
      <h2 className="section-title">Posts</h2>
      {posts.map(p => <PostCard key={p.id} post={p} onChange={updatePost} />)}
      {posts.length === 0 && <p className="muted">No posts yet.</p>}
      {isMe && <p className="muted footer-note">This is your public profile: <Link to={`/profile/${me.id}`}>{`/profile/${me.id}`}</Link></p>}
    </div>
  );
}