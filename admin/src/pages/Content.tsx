import { useState } from 'react';
import { api } from '../api';
import { errorText, Loading, PageHead, useLoad, useToast } from '../ui';

const CAMPAIGN_KEYS = ['advent', 'lent', `advent-${new Date().getFullYear()}`, `lent-${new Date().getFullYear() + 1}`];

export function Content() {
  return (
    <>
      <PageHead title="Content">Sponsor lines for seasonal campaigns, and recorded prayers that replace the phone’s voice. Changes reach the app without an update.</PageHead>
      <Sponsors />
      <Audio />
    </>
  );
}

function Sponsors() {
  const toast = useToast();
  const { data, error, reload } = useLoad(() => api.sponsors());
  const [form, setForm] = useState({ campaign_key: CAMPAIGN_KEYS[2], name: '', message: '', url: '' });
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="panel">
      <h2>Campaign sponsors</h2>
      <p className="muted small">Shown as “Made possible by …” on the Advent and Lent campaign cards. Use a year (lent-2027) for one season, or just “lent” for every year.</p>
      {!data ? (
        <Loading error={error} />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Sponsor</th>
                <th>Line</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.map((s) => (
                <tr key={s.campaign_key}>
                  <td className="num">{s.campaign_key}</td>
                  <td>{s.name}</td>
                  <td className="muted">{s.message ?? '—'}</td>
                  <td>
                    <button className="btn ghost" onClick={() => api.deleteSponsor(s.campaign_key).then(() => (toast('Sponsor removed'), reload()))}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <form
        className="row"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await api.saveSponsor({ campaign_key: form.campaign_key, name: form.name.trim(), message: form.message || null, url: form.url || null });
            toast('Sponsor saved');
            setForm({ ...form, name: '', message: '', url: '' });
            reload();
          } catch (x) {
            setErr(errorText(x));
          }
        }}
      >
        <label className="field">
          Campaign
          <input id="sponsor-key" list="campaign-keys" value={form.campaign_key} onChange={(e) => setForm({ ...form, campaign_key: e.target.value })} />
          <datalist id="campaign-keys">
            {CAMPAIGN_KEYS.map((k) => (
              <option key={k} value={k} />
            ))}
          </datalist>
        </label>
        <label className="field">
          Sponsor name
          <input id="sponsor-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>
        <label className="field">
          Line (optional)
          <input id="sponsor-message" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} maxLength={140} />
        </label>
        <label className="field">
          Website (optional, https://)
          <input id="sponsor-url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
        </label>
        <button className="btn" type="submit" disabled={form.name.trim().length < 2}>
          Save sponsor
        </button>
      </form>
      {err ? <p className="error">{err}</p> : null}
    </div>
  );
}

function Audio() {
  const toast = useToast();
  const { data, error, reload } = useLoad(() => api.audio());
  const [form, setForm] = useState({ key: 'prayer:our-father', language: 'en', url: '', credit: '' });
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="panel">
      <h2>Recorded prayers</h2>
      <p className="muted small">
        Upload the file to the “audio” bucket in Supabase Storage, then add its public address here. Keys and recording
        guidance: docs/AUDIO_RECORDING.md.
      </p>
      {!data ? (
        <Loading error={error} />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Prayer</th>
                <th>Language</th>
                <th>Credit</th>
                <th>File</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.map((t) => (
                <tr key={t.key + t.language}>
                  <td className="num">{t.key}</td>
                  <td>{t.language}</td>
                  <td>{t.credit ?? '—'}</td>
                  <td className="small" style={{ wordBreak: 'break-all' }}>
                    {t.url}
                  </td>
                  <td>
                    <button className="btn ghost" onClick={() => api.deleteAudio(t.key, t.language).then(() => (toast('Recording removed'), reload()))}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <form
        className="row"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await api.saveAudio({ key: form.key.trim(), language: form.language.trim(), url: form.url.trim(), credit: form.credit || null });
            toast('Recording saved');
            setForm({ ...form, url: '', credit: '' });
            reload();
          } catch (x) {
            setErr(errorText(x));
          }
        }}
      >
        <label className="field">
          Key
          <input id="audio-key" value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} />
        </label>
        <label className="field">
          Language
          <select id="audio-language" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
            {[['en', 'English'], ['ig', 'Igbo'], ['yo', 'Yoruba'], ['ha', 'Hausa'], ['tiv', 'Tiv'], ['fr', 'French'], ['sw', 'Swahili']].map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          File address (https://)
          <input id="audio-url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} style={{ minWidth: 260 }} />
        </label>
        <label className="field">
          Credit (optional)
          <input id="audio-credit" value={form.credit} onChange={(e) => setForm({ ...form, credit: e.target.value })} />
        </label>
        <button className="btn" type="submit" disabled={!form.url.trim() || !form.key.trim()}>
          Save recording
        </button>
      </form>
      {err ? <p className="error">{err}</p> : null}
    </div>
  );
}
