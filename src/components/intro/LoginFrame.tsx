import { useState } from 'react';
import { useStore } from '../../lib/store';
import { cleanAuthError } from '../../lib/supabase';

type Mode = 'signin' | 'signup';

const NAME_RE = /^[a-zA-Z0-9_-]{3,20}$/;

function EyeIcon({ visible }: { visible: boolean }) {
  return visible ? (
    // Eye open — filled style
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M8 3C4.5 3 1.5 5.5 1 8c.5 2.5 3.5 5 7 5s6.5-2.5 7-5c-.5-2.5-3.5-5-7-5zm0 8a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/>
      <circle cx="8" cy="8" r="1.5"/>
    </svg>
  ) : (
    // Eye with slash — outline style
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M2 2l12 12M6.5 6.6A3 3 0 0 0 11.4 11.4M4.2 4.3C2.8 5.2 1.8 6.5 1 8c.5 2.5 3.5 5 7 5 1.4 0 2.7-.4 3.8-1M7 3.1C7.3 3 7.7 3 8 3c3.5 0 6.5 2.5 7 5-.3 1.3-1 2.5-1.9 3.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function PasswordInput({
  placeholder,
  autoComplete,
  value,
  onChange,
  hasError,
  textPrimary,
  textErr,
}: {
  placeholder: string;
  autoComplete: string;
  value: string;
  onChange: (v: string) => void;
  hasError: boolean;
  textPrimary: string;
  textErr: string;
}) {
  const [shown, setShown] = useState(false);

  return (
    <div className="relative">
      <input
        type={shown ? 'text' : 'password'}
        placeholder={placeholder}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full py-2 text-sm focus:outline-none"
        style={{
          paddingLeft: 12,
          paddingRight: 40, // room for the toggle
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${hasError ? textErr : 'rgba(184,146,74,0.28)'}`,
          borderRadius: 4,
          color: textPrimary,
        }}
      />
      <button
        type="button"
        aria-label={shown ? 'Hide password' : 'Show password'}
        onClick={() => setShown((s) => !s)}
        className="absolute right-0 top-0 bottom-0 flex items-center justify-center transition-colors"
        style={{
          width: 36,
          color: shown ? '#D4A553' : 'rgba(232,220,196,0.4)',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#D4A553'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = shown ? '#D4A553' : 'rgba(232,220,196,0.4)'; }}
      >
        <EyeIcon visible={shown} />
      </button>
    </div>
  );
}

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
      const clean = cleanAuthError(err);
      if (clean.toLowerCase().includes('password')) setPassErr(clean);
      else setNameErr(clean);
    }
  };

  const toggleMode = () => {
    setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
    clearErrors();
    setPassword('');
    setConfirm('');
  };

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
        padding: '2px',
        background: `linear-gradient(135deg, ${borderBronze}, #8C6F3F, ${borderBronze})`,
        clipPath: 'polygon(10px 0%,calc(100% - 10px) 0%,100% 10px,100% calc(100% - 10px),calc(100% - 10px) 100%,10px 100%,0% calc(100% - 10px),0% 10px)',
      }}
    >
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
            border: '0.5px solid rgba(184,146,74,0.22)',
            clipPath: 'polygon(8px 0%,calc(100% - 8px) 0%,100% 8px,100% calc(100% - 8px),calc(100% - 8px) 100%,8px 100%,0% calc(100% - 8px),0% 8px)',
            pointerEvents: 'none',
          }}
        />

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
            {nameErr && <p className="text-xs mt-1" style={{ color: textErr }}>{nameErr}</p>}
          </div>

          {/* Password */}
          <div className="mb-3">
            <PasswordInput
              placeholder="Password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(v) => { setPassword(v); setPassErr(''); }}
              hasError={!!passErr}
              textPrimary={textPrimary}
              textErr={textErr}
            />
            {passErr && <p className="text-xs mt-1" style={{ color: textErr }}>{passErr}</p>}
          </div>

          {/* Confirm Password (sign-up only) */}
          {mode === 'signup' && (
            <div className="mb-3">
              <PasswordInput
                placeholder="Confirm password"
                autoComplete="new-password"
                value={confirm}
                onChange={(v) => { setConfirm(v); setConfirmErr(''); }}
                hasError={!!confirmErr}
                textPrimary={textPrimary}
                textErr={textErr}
              />
              {confirmErr && <p className="text-xs mt-1" style={{ color: textErr }}>{confirmErr}</p>}
            </div>
          )}

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
