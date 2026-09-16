import { useState } from 'react';

export default function Avatar({ user, size = 40 }) {
  const [broken, setBroken] = useState(false);
  const initials = (user?.name || '?')
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  if (user?.photo && !broken) {
    return (
      <img
        className="avatar"
        src={user.photo}
        style={{ width: size, height: size }}
        onError={() => setBroken(true)}
        alt={user?.name}
      />
    );
  }
  return (
    <div
      className="avatar avatar-fallback"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
    >
      {initials}
    </div>
  );
}