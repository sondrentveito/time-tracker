"use client";

import { useState } from "react";

type PushStatus = "unsupported" | "not-configured" | "default" | "granted" | "denied";

function readPermission(): PushStatus {
  if (typeof window === "undefined") return "unsupported";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission as PushStatus;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

async function getPublicKey() {
  const response = await fetch("/api/push/vapid-public-key");
  if (!response.ok) throw new Error("Kunne ikke hente push-konfigurasjon");
  const data = await response.json();
  return data.publicKey as string | null;
}

async function getSubscription(registration: ServiceWorkerRegistration, publicKey: string) {
  const existing = await registration.pushManager.getSubscription();
  if (existing) return existing;

  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });
}

export function usePushNotifications() {
  const [status, setStatus] = useState<PushStatus>(readPermission);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enable() {
    setIsPending(true);
    setError(null);

    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setStatus("unsupported");
        return;
      }

      const publicKey = await getPublicKey();
      if (!publicKey) {
        setStatus("not-configured");
        return;
      }

      const permission = await Notification.requestPermission();
      setStatus(permission as PushStatus);
      if (permission !== "granted") return;

      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription = await getSubscription(registration, publicKey);

      const response = await fetch("/api/push/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });

      if (!response.ok) throw new Error("Kunne ikke lagre push-abonnement");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke aktivere varsler");
    } finally {
      setIsPending(false);
    }
  }

  async function disable() {
    setIsPending(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.getRegistration("/sw.js");
      const subscription = await registration?.pushManager.getSubscription();

      if (subscription) {
        await fetch("/api/push/subscriptions", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }

      setStatus(readPermission());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke skru av varsler");
    } finally {
      setIsPending(false);
    }
  }

  return {
    status,
    isPending,
    error,
    enable,
    disable,
    supported: status !== "unsupported",
  };
}
