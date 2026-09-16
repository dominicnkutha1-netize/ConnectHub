import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { api, getToken } from '../api';
import { useAuth } from '../App';
import Avatar from '../components/Avatar';

export default function Chat() {
  const { user: me } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState('');
  const [friends, setFriends] = useState([]);
  const socketRef = useRef(null);
  const activeRef = useRef(null);
  const bottomRef = useRef(null);

  async function loadConversations() {
    try {
      setConversations(await api('/api/chat/conversations'));
    } catch (e) {}
  }

  useEffect(() => {
    const socket = io('/', { auth: { token: getToken() } });
    socketRef.current = socket;

    socket.on('chat:receive', msg => {
      loadConversations();
      if (activeRef.current && (msg.fromId === activeRef.current || msg.toId === activeRef.current)) {
        setMessages(prev => [...prev, msg]);
      }
    });
    socket.on('chat:sent', msg => {
      if (activeRef.current && (msg.fromId === activeRef.current || msg.toId === activeRef.current)) {
        setMessages(prev => [...prev, msg]);
      }
    });

    loadConversations();
    api('/api/friends').then(setFriends).catch(() => {});
    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function open(user) {
    activeRef.current = user.id;
    setActive(user);
    api(`/api/chat/with/${user.id}`).then(setMessages).catch(() => setMessages([]));
  }

  function send(e) {
    e.preventDefault();
    if (!content.trim()) return;
    const text = content;
    const optimistic = { id: 'tmp-' + Date.now(), fromId: me.id, toId: active.id, content: text, createdAt: Date.now() };
    socketRef.current.emit('chat:send', { toId: active.id, content: text });
    setMessages(prev => [...prev, optimistic]);
    setContent('');
    loadConversations();
  }

  const inConvo = id => conversations.some(c => c.user.id === id);

  return (
    <div className="chat">
      <div className="chat-side">
        <h3 className="chat-title">Messages</h3>
        {conversations.map(c => (
          <div
            className={`chat-user ${active?.id === c.user.id ? 'active' : ''}`}
            key={c.user.id}
            onClick={() => open(c.user)}
          >
            <Avatar user={c.user} size={36} />
            <div className="chat-user-meta">
              <span>{c.user.name}</span>
              <small>{c.lastMessage ? c.lastMessage.content.slice(0, 40) : ''}</small>
            </div>
          </div>
        ))}
        {conversations.length === 0 && <p className="muted">No conversations yet.</p>}

        <h4 className="chat-subtitle">Start a chat</h4>
        {friends.filter(f => !inConvo(f.id)).map(f => (
          <div className="chat-user" key={f.id} onClick={() => open(f)}>
            <Avatar user={f} size={36} />
            <span>{f.name}</span>
          </div>
        ))}
        {friends.length === 0 && <p className="muted">Add friends to start chatting.</p>}
      </div>
      <div className="chat-main">
        {!active ? (
          <div className="chat-placeholder">Select a conversation to start chatting</div>
        ) : (
          <>
            <div className="chat-header">
              <Avatar user={active} size={32} />
              <span>{active.name}</span>
            </div>
            <div className="chat-messages">
              {messages.map(m => (
                <div key={m.id} className={`bubble ${m.fromId === me.id ? 'mine' : 'theirs'}`}>
                  {m.content}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <form className="chat-input" onSubmit={send}>
              <input
                className="input"
                placeholder="Type a message..."
                value={content}
                onChange={e => setContent(e.target.value)}
              />
              <button className="btn btn-primary" disabled={!content.trim()}>Send</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}