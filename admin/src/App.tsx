import { useEffect, useState } from 'react';
import { api } from './api';
import { Accounts } from './pages/Accounts';
import { Admins } from './pages/Admins';
import { Content } from './pages/Content';
import { Groups } from './pages/Groups';
import { Organisations } from './pages/Organisations';
import { Overview } from './pages/Overview';
import { Requests } from './pages/Requests';
import { errorText, useLoad } from './ui';

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'requests', label: 'Plan requests' },
  { id: 'organisations', label: 'Organisations' },
  { id: 'groups', label: 'Groups and reports' },
  { id: 'accounts', label: 'Accounts' },
  { id: 'content', label: 'Content' },
  { id: 'admins', label: 'Admins and audit' },
] as const;
type Section = (typeof SECTIONS)[number]['id'];

const fromHash = (): Section => {
  const h = location.hash.replace('#', '');
  return (SECTIONS.find((s) => s.id === h)?.id ?? 'overview') as Section;
};

export function App() {
  const [state, setState] = useState<'checking' | 'signed-out' | 'not-admin' | 'ready'>('checking');
  const [email, setEmail] = useState<string | null>(null);

  async function check() {
    const who = await api.currentEmail();
    setEmail(who);
    if (!who) return setState('signed-out');
    setState((await api.isAdmin()) ? 'ready' : 'not-admin');
  }
  useEffect(() => {
    check().catch(() => setState('signed-out'));
  }, []);

  if (state === 'checking') return <p className="muted" style={{ padding: 24 }}>Loading…</p>;
  if (state === 'signed-out') return <SignIn onDone={check} />;
  if (state === 'not-admin')
    return (
      <div className="login">
        <div className="panel">
          <h1>Not an administrator</h1>
          <p>{email} is signed in but is not on the admin list. Ask an existing admin to add you.</p>
          <button className="btn secondary" onClick={() => api.signOut().then(check)}>
            Sign out
          </button>
        </div>
      </div>
    );
  return <Console email={email!} onSignOut={() => api.signOut().then(check)} />;
}

function Console({ email, onSignOut }: { email: string; onSignOut: () => void }) {
  const [section, setSection] = useState<Section>(fromHash);
  useEffect(() => {
    const on = () => setSection(fromHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const go = (s: string) => {
    location.hash = s;
    setSection(s as Section);
  };
  const counts = useLoad(() => api.overview(), [section]);
  const badge: Partial<Record<Section, number>> = {
    requests: counts.data?.plan_requests_new,
    groups: counts.data?.reports_open,
  };

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">
          <b>Pause & Pray</b>
          <span className="muted small">Admin console</span>
        </div>
        <nav className="nav" aria-label="Sections">
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} aria-current={section === s.id ? 'page' : undefined} onClick={() => setSection(s.id)}>
              {s.label}
              {badge[s.id] ? <span className="count num">{badge[s.id]}</span> : null}
            </a>
          ))}
        </nav>
        <div className="foot">
          <span className="muted small">{email}</span>
          <button className="btn secondary" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      </aside>
      <main>
        {api.mode === 'demo' ? (
          <div className="banner">Demo with sample data. Nothing here is real, and changes reset when you reload.</div>
        ) : null}
        {section === 'overview' && <Overview go={go} />}
        {section === 'requests' && <Requests />}
        {section === 'organisations' && <Organisations />}
        {section === 'groups' && <Groups />}
        {section === 'accounts' && <Accounts />}
        {section === 'content' && <Content />}
        {section === 'admins' && <Admins />}
      </main>
    </div>
  );
}

function SignIn({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="login">
      <form
        className="panel"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            await api.signIn(email, password);
            onDone();
          } catch (x) {
            setError(/invalid login/i.test(errorText(x)) ? 'That email and password do not match.' : errorText(x));
          }
          setBusy(false);
        }}
      >
        <h1>Pause & Pray admin</h1>
        <p className="muted">Sign in with your Pause & Pray account. Only administrators can continue.</p>
        <label className="field">
          Email
          <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">
          Password
          <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button className="btn" type="submit" disabled={busy || !email || !password}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
