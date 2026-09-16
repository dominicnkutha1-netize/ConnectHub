import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, setToken } from '../api';
import { useAuth } from '../App';

export default function Register() {
  const [name, setName] = useState('');
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
      const res = await api('/api/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) });
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
        <p className="tagline">Create an account</p>
        <input className="input" type="text" placeholder="Full name" value={name} onChange={e => setName(e.target.value)} required />
        <input className="input" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
        <input className="input" type="password" placeholder="Password (6+ characters)" value={password} onChange={e => setPassword(e.target.value)} required />
        {error && <p className="error">{error}</p>}
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Signing up...' : 'Sign Up'}</button>
        <Link to="/login" className="btn btn-ghost btn-block">Already have an account? Log in</Link>
      </form>
    </div>
  );
}