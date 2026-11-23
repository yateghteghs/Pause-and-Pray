import { useState } from 'react';
import { api } from '../api';
import { dateLabel, errorText, Loading, PageHead, useLoad, useToast } from '../ui';

export function Admins() {
  const toast = useToast();
  const admins = useLoad(() => api.admins());
  const audit = useLoad(() => api.audit(200));
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <PageHead title="Admins and audit log">Who can use this console, and everything they have changed.</PageHead>
      <div className="panel">
        <h2>Administrators</h2>
        {!admins.data ? (
          <Loading error={admins.error} />
        ) : (
          admins.data.map((a) => (
            <div key={a.user_id} className="row" style={{ justifyContent: 'space-between' }}>
              <span>
                {a.email} <span className="muted small">since {dateLabel(a.added_at)}</span>
              </span>
              <button
                className="btn ghost"
                onClick={async () => {
                  try {
                    await api.removeAdmin(a.user_id);
                    toast(`${a.email} is no longer an admin`);
                    admins.reload();
                    audit.reload();
                  } catch (e) {
                    setError(errorText(e));
                  }
                }}
              >
                Remove
              </button>
            </div>
          ))
        )}
        <form
          className="row"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await api.addAdmin(email);
              toast(`${email} is now an admin`);
              setEmail('');
              admins.reload();
              audit.reload();
            } catch (x) {
              setError(errorText(x));
            }
          }}
        >
          <input id="admin-email" type="email" placeholder="Their account email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ minWidth: 260 }} />
          <button className="btn" type="submit" disabled={!email.includes('@')}>
            Add admin
          </button>
        </form>
        <p className="muted small">They must have signed up in the app first. Only add people who need to run the system.</p>
        {error ? <p className="error">{error}</p> : null}
      </div>

      <div className="panel">
        <h2>Audit log</h2>
        {!audit.data ? (
          <Loading error={audit.error} />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Admin</th>
                  <th>Action</th>
                  <th>What</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {audit.data.map((l, i) => (
                  <tr key={i}>
                    <td className="num">{new Date(l.at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</td>
                    <td>{l.admin_email ?? '—'}</td>
                    <td className="num">{l.action}</td>
                    <td>{l.target ?? '—'}</td>
                    <td className="small muted">
                      {Object.entries(l.details)
                        .map(([k, v]) => `${k}: ${String(v)}`)
                        .join(' · ') || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
