import { useState } from 'react';
import { api, Organization, TierId } from '../api';
import { dateLabel, errorText, Loading, naira, PageHead, PlanStatus, useLoad, useToast } from '../ui';
import { PARISH_TIERS, tierById } from '../../../src/core/pricing';

export function Organisations() {
  const [search, setSearch] = useState('');
  const { data, error, reload } = useLoad(() => api.organizations(search), [search]);
  return (
    <>
      <PageHead title="Organisations">Parishes, schools, chaplaincies and groups on a paid plan. Renew, change plan, or check usage.</PageHead>
      <input id="org-search" placeholder="Search by name" value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 320 }} />
      {!data ? (
        <Loading error={error} />
      ) : (
        <div className="panel table-wrap">
          <table>
            <thead>
              <tr>
                <th>Organisation</th>
                <th>Plan</th>
                <th>Paid until</th>
                <th className="right">Groups</th>
                <th className="right">Members</th>
                <th>Leaders</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.map((o) => (
                <OrgRow key={o.id} o={o} onChange={reload} />
              ))}
            </tbody>
          </table>
          {!data.length ? <p className="muted">No organisations match.</p> : null}
        </div>
      )}
    </>
  );
}

function OrgRow({ o, onChange }: { o: Organization; onChange: () => void }) {
  const toast = useToast();
  const tier = tierById(o.tier);
  const [editing, setEditing] = useState(false);
  const [newTier, setNewTier] = useState<TierId>(o.tier);
  const [until, setUntil] = useState((o.plan_active_until ?? new Date().toISOString()).slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const over = (n: number, max: number | null | undefined) => max !== null && max !== undefined && n > max;
  return (
    <>
      <tr>
        <td>
          <b>{o.name}</b>
          <div className="muted small">{o.kind}</div>
        </td>
        <td>
          {tier?.name}
          <div className="muted small num">{naira(o.price_naira)} / year</div>
        </td>
        <td>
          {dateLabel(o.plan_active_until)}
          <div>
            <PlanStatus until={o.plan_active_until} />
          </div>
        </td>
        <td className={`right num${over(o.groups, tier?.maxGroups) ? ' error' : ''}`}>
          {o.groups}
          {tier?.maxGroups ? <span className="muted"> / {tier.maxGroups}</span> : null}
        </td>
        <td className={`right num${over(o.members, tier?.maxMembers) ? ' error' : ''}`}>
          {o.members.toLocaleString()}
          {tier?.maxMembers ? <span className="muted"> / {tier.maxMembers}</span> : null}
        </td>
        <td className="small">{o.leaders ?? '—'}</td>
        <td>
          <button className="btn secondary" onClick={() => setEditing(!editing)}>
            {editing ? 'Close' : 'Renew or change'}
          </button>
        </td>
      </tr>
      {editing ? (
        <tr>
          <td colSpan={7}>
            <div className="row">
              <label className="field">
                Plan
                <select id={`tier-${o.id}`} value={newTier} onChange={(e) => setNewTier(e.target.value as TierId)}>
                  {PARISH_TIERS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} · {naira(t.naira)} / year
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Paid until
                <input id={`until-${o.id}`} type="date" value={until} onChange={(e) => setUntil(e.target.value)} />
              </label>
              <button
                className="btn"
                onClick={async () => {
                  try {
                    await api.updateOrganization(o.id, newTier, until);
                    toast(`${o.name} updated`);
                    setEditing(false);
                    onChange();
                  } catch (e) {
                    setError(errorText(e));
                  }
                }}
              >
                Save
              </button>
              {error ? <span className="error">{error}</span> : null}
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}
