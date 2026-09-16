import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, setToken } from '../api';
import { useAuth } from '../App';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useAuth();

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      setToken(res.token);
      setUser(res.user);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="center-page">
      <form className="card form-card" onSubmit={submit}>
        <h1 className="brand-lg">ConnectHub</h1>
        <p className="tagline">Connect with friends and share your world</p>
        <input className="input" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
        <input className="input" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
        {error && <p className="error">{error}</p>}
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Logging in...' : 'Log In'}</button>
        <Link to="/register" className="btn btn-ghost btn-block">Create new account</Link>
      </form>
    </div>
  );
}