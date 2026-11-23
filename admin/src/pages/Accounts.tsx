import { useState } from 'react';
import { Account, api } from '../api';
import { ConfirmWithReason, dateLabel, errorText, PageHead, useToast } from '../ui';

export function Accounts() {
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Account[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function search(e?: React.FormEvent) {
    e?.preventDefault();
    try {
      setResults(await api.findAccounts(query));
      setError(null);
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <>
      <PageHead title="Accounts">
        Find an account by email to help someone or to delete it on request. Searches are logged. There is no prayer data
        here to see: it stays on people’s phones.
      </PageHead>
      <form className="row" onSubmit={search}>
        <input id="account-search" type="search" placeholder="Email, or part of it" value={query} onChange={(e) => setQuery(e.target.value)} style={{ minWidth: 260 }} />
        <button className="btn" type="submit" disabled={query.trim().length < 3}>
          Find
        </button>
      </form>
      {error ? <p className="error">{error}</p> : null}
      {results ? (
        <div className="panel table-wrap">
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Joined</th>
                <th>Last signed in</th>
                <th className="right">Groups</th>
                <th>Leads</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {results.map((a) => (
                <tr key={a.id}>
                  <td style={{ userSelect: 'all' }}>{a.email}</td>
                  <td>{dateLabel(a.created_at)}</td>
                  <td>{dateLabel(a.last_sign_in_at)}</td>
                  <td className="right num">{a.groups}</td>
                  <td>{a.leads ?? '—'}</td>
                  <td>
                    <div className="row">
                      <button
                        className="btn ghost"
                        onClick={async () => {
                          try {
                            await api.sendPasswordReset(a.email);
                            toast(`Password reset email sent to ${a.email}`);
                          } catch (err) {
                            setError(errorText(err));
                          }
                        }}
                      >
                        Send password reset
                      </button>
                      <ConfirmWithReason
                        label="Delete account"
                        confirmLabel="Delete account"
                        warning={`This deletes ${a.email}, removes them from their groups, and cannot be undone. Use it when the person asks.`}
                        onConfirm={async (reason) => {
                          await api.deleteAccount(a.id, reason);
                          toast('Account deleted');
                          setResults((r) => r?.filter((x) => x.id !== a.id) ?? null);
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!results.length ? <p className="muted">No accounts match.</p> : null}
        </div>
      ) : null}
    </>
  );
}
