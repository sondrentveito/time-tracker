"use client";

import { usePushNotifications } from "@/hooks/usePushNotifications";

export default function NotificationSettings() {
  const push = usePushNotifications();
  const enabled = push.status === "granted";

  return (
    <div className="glass-card p-5 space-y-4 animate-in stagger-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-medium" style={{ color: "var(--fg-muted)" }}>Varsler</h2>
          <p className="mt-2 text-xs leading-relaxed" style={{ color: "var(--fg-faint)" }}>
            tempo kan minne deg på å logge arbeidsdagen hvis ingen rad finnes etter arbeidsstart. Fungerer best når appen er installert på hjemskjermen.
          </p>
        </div>
        <span
          className="rounded-full px-2 py-1 text-[10px] font-medium"
          style={{ background: enabled ? "var(--accent-soft)" : "var(--input-bg)", color: enabled ? "var(--accent)" : "var(--fg-faint)" }}
        >
          {enabled ? "Aktiv" : push.status === "not-configured" ? "Mangler nøkler" : "Av"}
        </span>
      </div>

      {push.error && <p className="text-xs" style={{ color: "var(--danger)" }}>{push.error}</p>}
      {push.status === "denied" && (
        <p className="text-xs" style={{ color: "var(--danger)" }}>
          Varsler er blokkert i nettleseren. Endre tillatelsen i nettleserinnstillingene for å aktivere igjen.
        </p>
      )}
      {push.status === "not-configured" && (
        <p className="text-xs" style={{ color: "var(--fg-muted)" }}>
          Legg til VAPID-nøkler i miljøvariablene før push-varsler kan brukes.
        </p>
      )}
      {!push.supported && (
        <p className="text-xs" style={{ color: "var(--fg-muted)" }}>
          Denne nettleseren støtter ikke web push. På iPhone må appen installeres på hjemskjermen først.
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={enabled ? push.disable : push.enable}
          disabled={push.isPending || push.status === "denied" || !push.supported}
          className="btn-secondary text-sm disabled:opacity-50"
        >
          {push.isPending ? "Oppdaterer..." : enabled ? "Skru av varsler" : "Aktiver varsler"}
        </button>
      </div>
    </div>
  );
}
