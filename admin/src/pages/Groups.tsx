import { useState } from 'react';
import { api, Report } from '../api';
import { ConfirmWithReason, dateLabel, errorText, Loading, PageHead, Pill, useLoad, useToast } from '../ui';

export function Groups() {
  const toast = useToast();
  const reports = useLoad(() => api.reports('open'));
  const [search, setSearch] = useState('');
  const groups = useLoad(() => api.groups(search), [search]);
  const reloadAll = () => {
    reports.reload();
    groups.reload();
  };
  return (
    <>
      <PageHead title="Groups and reports">
        Reports from members about a group (the reporter’s name is never shown), and every group with its size and activity.
      </PageHead>

      <div className="panel">
        <h2>Open reports</h2>
        {!reports.data ? (
          <Loading error={reports.error} />
        ) : !reports.data.length ? (
          <p className="muted">No open reports.</p>
        ) : (
          reports.data.map((r) => <ReportItem key={r.id} r={r} onChange={reloadAll} />)
        )}
      </div>

      <div className="panel">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2>All groups</h2>
          <input id="group-search" placeholder="Search by name or invite code" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {!groups.data ? (
          <Loading error={groups.error} />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Group</th>
                  <th>Organisation</th>
                  <th className="right">Members</th>
                  <th>Last prayed together</th>
                  <th>Created</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {groups.data.map((g) => (
                  <tr key={g.id}>
                    <td>
                      <b>{g.name}</b> {g.open_reports ? <Pill tone="crit">{g.open_reports} reports</Pill> : null}
                      {g.intention ? <div className="muted small">Praying for: {g.intention}</div> : null}
                    </td>
                    <td>{g.org_name ?? <span className="muted">Free group</span>}</td>
                    <td className="right num">{g.members}</td>
                    <td>{g.last_active ? dateLabel(g.last_active) : <span className="muted">Not yet</span>}</td>
                    <td>{dateLabel(g.created_at)}</td>
                    <td>
                      <ConfirmWithReason
                        label="Remove"
                        confirmLabel={`Remove ${g.name}`}
                        warning={`This deletes the group for all ${g.members} members. It cannot be undone.`}
                        onConfirm={async (reason) => {
                          await api.deleteGroup(g.id, reason);
                          toast('Group removed');
                          reloadAll();
                        }}
                      />
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

function ReportItem({ r, onChange }: { r: Report; onChange: () => void }) {
  const toast = useToast();
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const resolve = async (status: 'resolved' | 'dismissed') => {
    try {
      await api.resolveReport(r.id, status, note);
      toast(status === 'dismissed' ? 'Report dismissed' : 'Report resolved');
      onChange();
    } catch (e) {
      setError(errorText(e));
    }
  };
  return (
    <div className="panel" style={{ borderColor: 'var(--crit)' }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <b>{r.group_name}</b>
        <span className="muted small">{dateLabel(r.created_at)}</span>
      </div>
      {r.group_intention ? <p className="muted small">Group intention: {r.group_intention}</p> : null}
      <p>“{r.reason}”</p>
      <label className="field">
        Note (kept in the audit log)
        <input id={`note-${r.id}`} value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      {error ? <p className="error">{error}</p> : null}
      <div className="row">
        <ConfirmWithReason
          label="Remove the group"
          confirmLabel="Remove the group"
          warning="This deletes the group for all its members and closes its reports."
          onConfirm={async (reason) => {
            await api.deleteGroup(r.group_id, reason);
            toast('Group removed');
            onChange();
          }}
        />
        <button className="btn secondary" onClick={() => resolve('resolved')}>
          Mark resolved
        </button>
        <button className="btn ghost" onClick={() => resolve('dismissed')}>
          Dismiss
        </button>
      </div>
    </div>
  );
}
