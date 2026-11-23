import { useState } from 'react';
import { api, PlanRequest, RequestStatus } from '../api';
import { dateLabel, errorText, Loading, naira, PageHead, Pill, useLoad, useToast } from '../ui';
import { tierById } from '../../../src/core/pricing';

const FILTERS: { value: RequestStatus | undefined; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'invoiced', label: 'Invoiced' },
  { value: 'active', label: 'Active' },
  { value: 'declined', label: 'Declined' },
  { value: undefined, label: 'All' },
];

export function Requests() {
  const [status, setStatus] = useState<RequestStatus | undefined>('new');
  const { data, error, reload } = useLoad(() => api.planRequests(status), [status]);
  return (
    <>
      <PageHead title="Plan requests">
        Parishes, schools and groups asking for a plan. Invoice them, then activate the plan once it is paid.
      </PageHead>
      <div className="row" role="tablist">
        {FILTERS.map((f) => (
          <button key={f.label} role="tab" aria-selected={status === f.value} className={`btn ${status === f.value ? '' : 'secondary'}`} onClick={() => setStatus(f.value)}>
            {f.label}
          </button>
        ))}
      </div>
      {!data ? (
        <Loading error={error} />
      ) : !data.length ? (
        <p className="muted">No {status ?? ''} requests.</p>
      ) : (
        data.map((r) => <RequestCard key={r.id} r={r} onChange={reload} />)
      )}
    </>
  );
}

function RequestCard({ r, onChange }: { r: PlanRequest; onChange: () => void }) {
  const toast = useToast();
  const yearFromNow = new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10);
  const [until, setUntil] = useState(yearFromNow);
  const [error, setError] = useState<string | null>(null);
  const act = async (fn: () => Promise<void>, done: string) => {
    try {
      await fn();
      toast(done);
      onChange();
    } catch (e) {
      setError(errorText(e));
    }
  };
  return (
    <div className="panel">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2>{r.org_name}</h2>
        <div className="row">
          <Pill tone={r.status === 'new' ? 'warn' : r.status === 'active' ? 'good' : r.status === 'declined' ? 'crit' : 'plain'}>{r.status[0].toUpperCase() + r.status.slice(1)}</Pill>
          <span className="pill plain">
            {tierById(r.tier)?.name} · <span className="num">{naira(r.price_naira)}</span> / year
          </span>
        </div>
      </div>
      <p>
        {r.contact_name} · <span style={{ userSelect: 'all' }}>{r.contact_email}</span>
        {r.country ? ` · ${r.country}` : ''}
        {r.expected_members ? ` · about ${r.expected_members.toLocaleString()} members` : ''} · {r.org_kind}
      </p>
      {r.message ? <p className="muted">“{r.message}”</p> : null}
      <p className="muted small">Received {dateLabel(r.created_at)}</p>
      {error ? <p className="error">{error}</p> : null}
      {r.status === 'new' || r.status === 'invoiced' ? (
        <div className="row">
          {r.status === 'new' ? (
            <button className="btn secondary" onClick={() => act(() => api.setRequestStatus(r.id, 'invoiced'), `${r.org_name} marked as invoiced`)}>
              Mark as invoiced
            </button>
          ) : null}
          <label className="field">
            Paid until
            <input id={`until-${r.id}`} type="date" value={until} onChange={(e) => setUntil(e.target.value)} />
          </label>
          <button className="btn" onClick={() => act(() => api.activateRequest(r.id, until), `Plan activated for ${r.org_name}`)}>
            Payment received: activate plan
          </button>
          <button className="btn ghost" onClick={() => act(() => api.setRequestStatus(r.id, 'declined'), 'Request declined')}>
            Decline
          </button>
        </div>
      ) : null}
    </div>
  );
}
