import { useEffect, useState, createContext, useContext } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Feed from './pages/Feed';
import Profile from './pages/Profile';
import Friends from './pages/Friends';
import Chat from './pages/Chat';
import Navbar from './components/Navbar';
import { api, getToken, setToken } from './api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    api('/api/users/me')
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  function logout() {
    setToken(null);
    setUser(null);
    navigate('/login');
  }

  if (loading) return <div className="center-page">Loading...</div>;

  return (
    <AuthContext.Provider value={{ user, setUser, logout }}>
      <div className="app">
        {user && <Navbar />}
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
          <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />
          <Route path="/" element={user ? <Feed /> : <Navigate to="/login" />} />
          <Route path="/profile" element={user ? <Profile /> : <Navigate to="/login" />} />
          <Route path="/profile/:id" element={user ? <Profile /> : <Navigate to="/login" />} />
          <Route path="/friends" element={user ? <Friends /> : <Navigate to="/login" />} />
          <Route path="/chat" element={user ? <Chat /> : <Navigate to="/login" />} />
        </Routes>
      </div>
    </AuthContext.Provider>
  );
}