import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../App';
import Avatar from './Avatar';

export default function Navbar() {
  const { user, logout } = useAuth();
  return (
    <nav className="navbar">
      <Link className="brand" to="/">ConnectHub</Link>
      <div className="nav-links">
        <NavLink to="/">Feed</NavLink>
        <NavLink to="/friends">Friends</NavLink>
        <NavLink to="/chat">Chat</NavLink>
      </div>
      <div className="nav-user">
        <Link className="nav-profile" to="/profile">
          <Avatar user={user} size={32} />
          <span>{user.name}</span>
        </Link>
        <button className="btn btn-danger btn-small" onClick={logout}>Logout</button>
      </div>
    </nav>
  );
}