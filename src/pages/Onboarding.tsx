import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../lib/store';
import { V } from '../lib/voice';

const TOTAL_STEPS = 5;

const FOCUS_OPTIONS = ['Strength', 'Endurance', 'Mobility', 'Recovery', 'None of these'];
const AVOID_OPTIONS = ['Solitude', 'Discomfort', 'Vulnerability', 'Failure', 'None of these'];
const GENDER_OPTIONS = [
  { value: 'male',       label: 'He / Him' },
  { value: 'female',     label: 'She / Her' },
  { value: 'nonbinary',  label: 'They / Them' },
  { value: 'prefer_not', label: 'Prefer not to say' },
];

function toggle(arr: string[], val: string): string[] {
  if (val === 'None of these') return arr.includes(val) ? [] : [val];
  const withoutNone = arr.filter((v) => v !== 'None of these');
  return withoutNone.includes(val)
    ? withoutNone.filter((v) => v !== val)
    : [...withoutNone, val];
}

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:  (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
};

export default function Onboarding() {
  const completeOnboarding = useStore((s) => s.completeOnboarding);
  const user = useStore((s) => s.user);

  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [saving, setSaving] = useState(false);

  const [hunterPath, setHunterPath] = useState('');
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [avoidances, setAvoidances] = useState<string[]>([]);
  const [gender, setGender] = useState('');

  const playerName = user?.name ?? 'Hunter';

  const advance = () => { setDir(1); setStep((s) => s + 1); };
  const back    = () => { setDir(-1); setStep((s) => s - 1); };

  const finish = async (skipAll = false) => {
    setSaving(true);
    await completeOnboarding({
      hunterPath:  skipAll ? 'hunter' : (hunterPath || 'hunter'),
      focusAreas:  skipAll ? [] : focusAreas,
      avoidances:  skipAll ? [] : avoidances,
      gender:      skipAll ? 'prefer_not' : (gender || 'prefer_not'), // constraint: male|female|nonbinary|prefer_not
    });
    setSaving(false);
  };

  const stepContent = [
    /* 0 — Confirm name */
    <div key="name" className="flex flex-col items-center text-center gap-6">
      <p className="text-2xl font-medium" style={{ color: 'var(--accent-gold)', fontFamily: 'var(--font-display)', letterSpacing: '0.06em' }}>
        {V.onboardingNameQ}
      </p>
      <p className="text-4xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)', letterSpacing: '0.08em' }}>
        {playerName}
      </p>
      <p className="text-sm" style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-body)' }}>
        This is how the Tower will know you.
      </p>
      <PrimaryButton onClick={advance}>Continue</PrimaryButton>
    </div>,

    /* 1 — Hunter path */
    <div key="path" className="flex flex-col gap-6">
      <p className="text-xl font-medium text-center" style={{ color: 'var(--accent-gold)', fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}>
        {V.onboardingPathQ}
      </p>
      <div className="grid grid-cols-2 gap-3">
        {[
          { value: 'hunter',   name: V.onboardingPathHunterName,   desc: V.onboardingPathHunterDesc },
          { value: 'vanguard', name: V.onboardingPathVanguardName, desc: V.onboardingPathVanguardDesc },
        ].map((p) => (
          <button
            key={p.value}
            onClick={() => setHunterPath(p.value)}
            className="rounded-xl p-4 text-left transition-all"
            style={{
              backgroundColor: hunterPath === p.value ? 'var(--bg-elevated)' : 'var(--bg-surface)',
              border: `1px solid ${hunterPath === p.value ? 'var(--accent-gold)' : 'var(--border-subtle)'}`,
            }}
          >
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
              {p.name}
            </p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-body)' }}>
              {p.desc}
            </p>
          </button>
        ))}
      </div>
      <div className="flex gap-2 mt-2">
        <SecondaryButton onClick={back}>Back</SecondaryButton>
        <PrimaryButton onClick={advance} disabled={!hunterPath}>Continue</PrimaryButton>
      </div>
    </div>,

    /* 2 — Focus areas */
    <div key="focus" className="flex flex-col gap-6">
      <p className="text-xl font-medium text-center" style={{ color: 'var(--accent-gold)', fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}>
        {V.onboardingFocusQ}
      </p>
      <ChipGroup options={FOCUS_OPTIONS} selected={focusAreas} onToggle={(v) => setFocusAreas(toggle(focusAreas, v))} />
      <div className="flex gap-2">
        <SecondaryButton onClick={back}>Back</SecondaryButton>
        <PrimaryButton onClick={advance} disabled={focusAreas.length === 0}>Continue</PrimaryButton>
      </div>
    </div>,

    /* 3 — Mind avoidances */
    <div key="avoid" className="flex flex-col gap-6">
      <p className="text-xl font-medium text-center" style={{ color: 'var(--accent-gold)', fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}>
        {V.onboardingAvoidQ}
      </p>
      <ChipGroup options={AVOID_OPTIONS} selected={avoidances} onToggle={(v) => setAvoidances(toggle(avoidances, v))} />
      <div className="flex gap-2">
        <SecondaryButton onClick={back}>Back</SecondaryButton>
        <PrimaryButton onClick={advance} disabled={avoidances.length === 0}>Continue</PrimaryButton>
      </div>
    </div>,

    /* 4 — Gender */
    <div key="gender" className="flex flex-col gap-6">
      <p className="text-xl font-medium text-center" style={{ color: 'var(--accent-gold)', fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}>
        {V.onboardingGenderQ}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {GENDER_OPTIONS.map((g) => (
          <button
            key={g.value}
            onClick={() => setGender(g.value)}
            className="rounded-lg py-3 text-sm font-medium transition-all"
            style={{
              backgroundColor: gender === g.value ? 'var(--bg-elevated)' : 'var(--bg-surface)',
              border: `1px solid ${gender === g.value ? 'var(--accent-gold)' : 'var(--border-subtle)'}`,
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-body)',
            }}
          >
            {g.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <SecondaryButton onClick={back}>Back</SecondaryButton>
        <PrimaryButton onClick={() => finish(false)} disabled={!gender || saving}>
          {saving ? 'Entering…' : V.onboardingBegin}
        </PrimaryButton>
      </div>
    </div>,
  ];

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: 'var(--bg-base)', zIndex: 100 }}
    >
      {/* Progress dots */}
      <div className="flex gap-2 mb-10">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full transition-all"
            style={{ backgroundColor: i <= step ? 'var(--accent-gold)' : 'var(--border-strong)' }}
          />
        ))}
      </div>

      <div className="w-full max-w-sm overflow-hidden">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={step}
            custom={dir}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            {stepContent[step]}
          </motion.div>
        </AnimatePresence>
      </div>

      <button
        className="absolute bottom-8 right-6 text-xs"
        style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-body)' }}
        onClick={() => finish(true)}
      >
        {V.onboardingSkip}
      </button>
    </div>
  );
}

function PrimaryButton({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex-1 py-3 rounded-lg text-sm font-medium transition-opacity"
      style={{
        backgroundColor: 'var(--accent-gold)',
        color: 'var(--text-on-gold)',
        opacity: disabled ? 0.4 : 1,
        fontFamily: 'var(--font-body)',
      }}
    >
      {children}
    </button>
  );
}

function SecondaryButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="py-3 px-5 rounded-lg text-sm font-medium"
      style={{
        backgroundColor: 'var(--bg-elevated)',
        color: 'var(--text-secondary)',
        fontFamily: 'var(--font-body)',
      }}
    >
      {children}
    </button>
  );
}

function ChipGroup({ options, selected, onToggle }: { options: string[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onToggle(opt)}
          className="px-4 py-2 rounded-full text-sm font-medium transition-all"
          style={{
            backgroundColor: selected.includes(opt) ? 'var(--bg-elevated)' : 'var(--bg-surface)',
            border: `1px solid ${selected.includes(opt) ? 'var(--accent-gold)' : 'var(--border-subtle)'}`,
            color: selected.includes(opt) ? 'var(--text-primary)' : 'var(--text-tertiary)',
            fontFamily: 'var(--font-body)',
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
