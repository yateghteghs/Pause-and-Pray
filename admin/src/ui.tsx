import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

export const naira = (n: number) => `₦${n.toLocaleString('en-NG')}`;
export const dateLabel = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
export const daysFromNow = (iso: string | null) => (iso ? Math.round((Date.parse(iso) - Date.now()) / 86_400_000) : null);
export const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Loads data, with a reload function for after changes. */
export function useLoad<T>(load: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(() => {
    load().then(
      (d) => {
        setData(d);
        setError(null);
      },
      (e) => setError(errorText(e)),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(reload, [reload]);
  return { data, error, reload };
}

const ToastContext = createContext<(msg: string) => void>(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 2600);
    return () => clearTimeout(t);
  }, [msg]);
  return (
    <ToastContext.Provider value={setMsg}>
      {children}
      {msg ? (
        <div className="toast" role="status">
          {msg}
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}

export function PageHead({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="head">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <h1>{title}</h1>
        {children ? <p className="muted">{children}</p> : null}
      </div>
    </div>
  );
}

export function Pill({ tone, children }: { tone: 'good' | 'warn' | 'crit' | 'plain'; children: ReactNode }) {
  return <span className={`pill ${tone}`}>{children}</span>;
}

/** Paid-until status: active, expiring within 30 days, or lapsed. */
export function PlanStatus({ until }: { until: string | null }) {
  const d = daysFromNow(until);
  if (d === null) return <Pill tone="plain">No plan</Pill>;
  if (d < 0) return <Pill tone="crit">Lapsed {-d} days ago</Pill>;
  if (d <= 30) return <Pill tone="warn">Ends in {d} days</Pill>;
  return <Pill tone="good">Active</Pill>;
}

/**
 * Two-step confirmation for anything that removes data (the console never uses browser dialogs).
 * Asks for a reason, which goes into the audit log.
 */
export function ConfirmWithReason({
  label,
  confirmLabel,
  warning,
  onConfirm,
}: {
  label: string;
  confirmLabel: string;
  warning: string;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!open)
    return (
      <button className="btn secondary" onClick={() => setOpen(true)}>
        {label}
      </button>
    );
  return (
    <div className="confirm">
      <span>{warning}</span>
      <label className="field">
        Reason (kept in the audit log)
        <input value={reason} onChange={(e) => setReason(e.target.value)} />
      </label>
      {error ? <span className="error">{error}</span> : null}
      <div className="row">
        <button
          className="btn danger"
          disabled={busy || reason.trim().length < 3}
          onClick={async () => {
            setBusy(true);
            try {
              await onConfirm(reason.trim());
              setOpen(false);
            } catch (e) {
              setError(errorText(e));
            }
            setBusy(false);
          }}
        >
          {confirmLabel}
        </button>
        <button className="btn ghost" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export function Loading({ error }: { error?: string | null }) {
  return error ? <p className="error">{error}</p> : <p className="muted">Loading…</p>;
}
