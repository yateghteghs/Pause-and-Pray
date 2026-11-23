import { useState } from 'react';
import { api } from '../api';
import { DailyColumns } from '../Chart';
import { Loading, naira, PageHead, useLoad } from '../ui';

export function Overview({ go }: { go: (section: string) => void }) {
  const { data, error } = useLoad(() => api.overview());
  const [table, setTable] = useState(false);
  if (!data) return <Loading error={error} />;

  const attention = [
    data.plan_requests_new ? { n: data.plan_requests_new, text: 'new plan requests to invoice', to: 'requests' } : null,
    data.reports_open ? { n: data.reports_open, text: 'open reports about groups', to: 'groups' } : null,
    data.organizations_expiring_30d ? { n: data.organizations_expiring_30d, text: 'plans ending within 30 days', to: 'organisations' } : null,
  ].filter(Boolean) as { n: number; text: string; to: string }[];

  return (
    <>
      <PageHead title="Overview">Totals across Pause & Pray. Individual prayers, intentions and history stay on people’s phones and are never shown here.</PageHead>

      {attention.length ? (
        <div className="panel">
          <h2>Needs your attention</h2>
          {attention.map((a) => (
            <div key={a.to} className="row">
              <span className="pill warn num">{a.n}</span>
              <span>{a.text}</span>
              <button className="btn ghost" onClick={() => go(a.to)}>
                Open
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="tiles">
        <Tile value={data.accounts.toLocaleString()} label={`accounts · ${data.accounts_new_7d.toLocaleString()} new this week`} />
        <Tile value={`${data.groups_active_7d.toLocaleString()} of ${data.groups.toLocaleString()}`} label="groups that prayed this week" />
        <Tile value={data.group_members.toLocaleString()} label="group members" />
        <Tile value={data.organizations_active.toLocaleString()} label="paid parish plans" attention={data.organizations_expiring_30d > 0} />
        <Tile value={naira(data.plan_revenue_naira)} label="plan revenue per year (active plans)" />
        <Tile value={data.reports_open.toLocaleString()} label="open reports" attention={data.reports_open > 0} />
      </div>

      <div className="panel">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <h2>Group members praying each day</h2>
            <p className="muted small">Last 30 days. A count of people, never who they are.</p>
          </div>
          <button className="btn ghost" onClick={() => setTable(!table)}>
            {table ? 'Show chart' : 'Show as table'}
          </button>
        </div>
        {table ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Day</th>
                  <th className="right">Members praying</th>
                </tr>
              </thead>
              <tbody>
                {[...data.praying_by_day].reverse().map((d) => (
                  <tr key={d.day}>
                    <td>{new Date(d.day + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}</td>
                    <td className="right num">{d.members.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <DailyColumns data={data.praying_by_day} valueLabel="Members praying" />
        )}
      </div>

      <div className="panel">
        <h2>Plus subscriptions</h2>
        <p className="muted">
          Subscribers, renewals and revenue for Plus are in RevenueCat, which handles the Google Play and App Store
          billing: <a href="https://app.revenuecat.com" target="_blank" rel="noreferrer">app.revenuecat.com</a>
        </p>
      </div>
    </>
  );
}

function Tile({ value, label, attention }: { value: string; label: string; attention?: boolean }) {
  return (
    <div className={`tile${attention ? ' attention' : ''}`}>
      <span className="value">{value}</span>
      <span className="label">{label}</span>
    </div>
  );
}
