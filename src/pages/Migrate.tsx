import { useState } from 'react';
import { useStore } from '../lib/store';

const NAME_RE = /^[a-zA-Z0-9_-]{3,20}$/;

export default function Migrate() {
  const user = useStore((s) => s.user);
  const migrateLocalData = useStore((s) => s.migrateLocalData);

  const [name, setName] = useState(user?.name ?? '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [nameErr, setNameErr] = useState('');
  const [passErr, setPassErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameErr(''); setPassErr('');
    if (!NAME_RE.test(name)) { setNameErr('Name must be 3–20 characters: letters, numbers, _ or −'); return; }
    if (password.length < 8) { setPassErr('Password must be at least 8 characters'); return; }
    if (password !== confirm) { setPassErr('Passwords do not match'); return; }

    setLoading(true);
    const err = await migrateLocalData(name.trim(), password);
    setLoading(false);
    if (err) {
      if (err.toLowerCase().includes('name') || err.toLowerCase().includes('user')) setNameErr(err);
      else setPassErr(err);
    } else {
      setDone(true);
    }
  };

  const bronze = '#B8924A';
  const textErr = '#C9663C';
  const textPrimary = '#E8DCC4';

  if (done) {
    return (
      <div className="fixed inset-0 flex items-center justify-center px-6" style={{ backgroundColor: '#07090E' }}>
        <div className="text-center max-w-xs">
          <p style={{ fontFamily: 'Cinzel, Georgia, serif', fontSize: 18, color: '#D4A553', letterSpacing: '0.08em' }}>
            The Tower has claimed your progress.
          </p>
          <p className="mt-3 text-sm" style={{ color: 'rgba(232,220,196,0.6)' }}>
            Your climb continues.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center px-6" style={{ backgroundColor: '#07090E' }}>
      <div className="max-w-sm w-full">
        <h1
          className="text-center mb-2"
          style={{ fontFamily: 'Cinzel, Georgia, serif', fontWeight: 500, fontSize: 20, letterSpacing: '0.06em', color: '#D4A553' }}
        >
          The Tower has expanded.
        </h1>
        <p className="text-center text-sm mb-8" style={{ color: 'rgba(232,220,196,0.55)' }}>
          Claim your account to bring your progress. Nothing is lost.
        </p>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
          <div>
            <input
              type="text"
              placeholder="Claim your name"
              value={name}
              onChange={(e) => { setName(e.target.value); setNameErr(''); }}
              className="w-full px-3 py-2.5 text-sm focus:outline-none rounded"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${nameErr ? textErr : 'rgba(184,146,74,0.28)'}`,
                color: textPrimary,
              }}
            />
            {nameErr && <p className="text-xs mt-1" style={{ color: textErr }}>{nameErr}</p>}
          </div>

          <div>
            <input
              type="password"
              placeholder="Set a password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setPassErr(''); }}
              className="w-full px-3 py-2.5 text-sm focus:outline-none rounded"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${passErr ? textErr : 'rgba(184,146,74,0.28)'}`,
                color: textPrimary,
              }}
            />
          </div>

          <div>
            <input
              type="password"
              placeholder="Confirm password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-3 py-2.5 text-sm focus:outline-none rounded"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid rgba(184,146,74,0.28)`,
                color: textPrimary,
              }}
            />
            {passErr && <p className="text-xs mt-1" style={{ color: textErr }}>{passErr}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 text-sm font-medium mt-1 rounded transition-opacity"
            style={{
              background: `linear-gradient(135deg, ${bronze}, #8C6F3F)`,
              color: '#0F0A06',
              fontFamily: 'Cinzel, Georgia, serif',
              letterSpacing: '0.08em',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Claiming…' : 'Claim your progress'}
          </button>
        </form>
      </div>
    </div>
  );
}
