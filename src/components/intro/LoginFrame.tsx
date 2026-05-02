import { useState } from 'react';
import { useStore } from '../../lib/store';

type Mode = 'signin' | 'signup';

const NAME_RE = /^[a-zA-Z0-9_-]{3,20}$/;

export default function LoginFrame() {
  const signIn = useStore((s) => s.signIn);
  const signUp = useStore((s) => s.signUp);

  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [nameErr, setNameErr] = useState('');
  const [passErr, setPassErr] = useState('');
  const [confirmErr, setConfirmErr] = useState('');
  const [loading, setLoading] = useState(false);

  const clearErrors = () => { setNameErr(''); setPassErr(''); setConfirmErr(''); };

  const validate = (): boolean => {
    let ok = true;
    if (!NAME_RE.test(name)) {
      setNameErr('Name must be 3–20 characters: letters, numbers, _ or −');
      ok = false;
    }
    if (password.length < 8) {
      setPassErr('Password must be at least 8 characters');
      ok = false;
    }
    if (mode === 'signup' && password !== confirm) {
      setConfirmErr('Passwords do not match');
      ok = false;
    }
    return ok;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();
    if (!validate()) return;
    setLoading(true);
    const err = mode === 'signin'
      ? await signIn(name.trim(), password)
      : await signUp(name.trim(), password);
    setLoading(false);
    if (err) {
      if (err.toLowerCase().includes('name') || err.toLowerCase().includes('user')) setNameErr(err);
      else setPassErr(err);
    }
  };

  const toggleMode = () => {
    setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
    clearErrors();
    setPassword('');
    setConfirm('');
  };

  // Parchment card styling
  const parchment = '#1A1410';
  const borderBronze = '#B8924A';
  const textPrimary = '#E8DCC4';
  const textSecondary = 'rgba(232,220,196,0.55)';
  const textErr = '#C9663C';

  return (
    <div
      className="relative mx-auto"
      style={{
        width: 'min(310px, calc(100vw - 2rem))',
        // Outer bronze border + notched corners
        padding: '2px',
        background: `linear-gradient(135deg, ${borderBronze}, #8C6F3F, ${borderBronze})`,
        clipPath: 'polygon(10px 0%,calc(100% - 10px) 0%,100% 10px,100% calc(100% - 10px),calc(100% - 10px) 100%,10px 100%,0% calc(100% - 10px),0% 10px)',
      }}
    >
      {/* Inner parchment */}
      <div
        style={{
          backgroundColor: parchment,
          clipPath: 'polygon(10px 0%,calc(100% - 10px) 0%,100% 10px,100% calc(100% - 10px),calc(100% - 10px) 100%,10px 100%,0% calc(100% - 10px),0% 10px)',
          padding: '24px 28px 20px',
        }}
      >
        {/* Inner hairline border */}
        <div
          style={{
            position: 'absolute',
            inset: 5,
            border: `0.5px solid rgba(184,146,74,0.22)`,
            clipPath: 'polygon(8px 0%,calc(100% - 8px) 0%,100% 8px,100% calc(100% - 8px),calc(100% - 8px) 100%,8px 100%,0% calc(100% - 8px),0% 8px)',
            pointerEvents: 'none',
          }}
        />

        {/* Title */}
        <h1
          className="text-center mb-5"
          style={{
            fontFamily: 'Cinzel, Georgia, serif',
            fontWeight: 500,
            fontSize: 16,
            letterSpacing: '0.12em',
            color: '#D4A553',
          }}
        >
          {mode === 'signin' ? 'Enter the Tower' : 'Awaken'}
        </h1>

        <form onSubmit={handleSubmit} noValidate>
          {/* Player Name */}
          <div className="mb-3">
            <input
              type="text"
              placeholder="Player name"
              autoComplete="username"
              value={name}
              onChange={(e) => { setName(e.target.value); setNameErr(''); }}
              className="w-full px-3 py-2 text-sm focus:outline-none"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${nameErr ? textErr : 'rgba(184,146,74,0.28)'}`,
                borderRadius: 4,
                color: textPrimary,
              }}
            />
            {nameErr && (
              <p className="text-xs mt-1" style={{ color: textErr }}>{nameErr}</p>
            )}
          </div>

          {/* Password */}
          <div className="mb-3">
            <input
              type="password"
              placeholder="Password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setPassErr(''); }}
              className="w-full px-3 py-2 text-sm focus:outline-none"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${passErr ? textErr : 'rgba(184,146,74,0.28)'}`,
                borderRadius: 4,
                color: textPrimary,
              }}
            />
            {passErr && (
              <p className="text-xs mt-1" style={{ color: textErr }}>{passErr}</p>
            )}
          </div>

          {/* Confirm Password (sign-up only) */}
          {mode === 'signup' && (
            <div className="mb-3">
              <input
                type="password"
                placeholder="Confirm password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value); setConfirmErr(''); }}
                className="w-full px-3 py-2 text-sm focus:outline-none"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${confirmErr ? textErr : 'rgba(184,146,74,0.28)'}`,
                  borderRadius: 4,
                  color: textPrimary,
                }}
              />
              {confirmErr && (
                <p className="text-xs mt-1" style={{ color: textErr }}>{confirmErr}</p>
              )}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 text-sm font-medium mt-1 transition-opacity"
            style={{
              background: `linear-gradient(135deg, ${borderBronze}, #8C6F3F)`,
              color: '#0F0A06',
              borderRadius: 4,
              fontFamily: 'Cinzel, Georgia, serif',
              letterSpacing: '0.08em',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'One moment…' : 'Enter'}
          </button>
        </form>

        {/* Toggle mode */}
        <p className="text-center text-xs mt-4" style={{ color: textSecondary }}>
          {mode === 'signin' ? (
            <>
              First time?{' '}
              <button onClick={toggleMode} className="underline" style={{ color: '#D4A553' }}>
                Awaken →
              </button>
            </>
          ) : (
            <>
              Already climbing?{' '}
              <button onClick={toggleMode} className="underline" style={{ color: '#D4A553' }}>
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
