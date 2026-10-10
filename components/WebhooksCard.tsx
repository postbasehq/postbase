"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { createWebhook, deleteWebhook, testWebhook, type CreateWebhookState, type TestResult } from "@/app/(app)/webhook-actions";
import { CopyButton } from "@/components/McpClientConfig";

export type WebhookRow = {
  id: string;
  url: string;
  events: string[];
  description: string | null;
  secret_hint: string;
  canManage: boolean;
  last_delivery: { status: string; response_status: number | null; error: string | null; created_at: string } | null;
};

/** Passed in from the server so the event list lives in one place (lib/webhooks). */
type EventOption = { value: string; label: string };

function when(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function LastDelivery({ d }: { d: WebhookRow["last_delivery"] }) {
  if (!d) return <span className="text-xs text-muted">No deliveries yet</span>;
  const tone =
    d.status === "delivered"
      ? "bg-[#2b59d9] text-white"
      : d.status === "failed"
        ? "bg-[#d14a3e] text-white"
        : "border border-line text-ink";
  const label = d.status === "delivered" ? "Delivered" : d.status === "failed" ? "Failed" : "Retrying";
  return (
    <span className="flex min-w-0 items-center gap-2 text-xs text-muted">
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`}>{label}</span>
      <span className="truncate">
        {when(d.created_at)}
        {d.status !== "delivered" && d.error ? ` · ${d.error}` : d.response_status ? ` · HTTP ${d.response_status}` : ""}
      </span>
    </span>
  );
}

function Row({ w, last }: { w: WebhookRow; last: boolean }) {
  const [testing, startTest] = useTransition();
  const [result, setResult] = useState<TestResult | null>(null);
  const [confirming, setConfirming] = useState(false);
  return (
    <div className={`flex flex-col gap-2 px-5 py-3.5 ${last ? "" : "border-b border-line"}`}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate font-mono text-[13px] font-semibold">{w.url}</div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {w.events.map((e) => (
              <code key={e} className="rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-blue-ink">
                {e}
              </code>
            ))}
            <span className="text-[11px] text-muted">secret {w.secret_hint}</span>
          </div>
        </div>
        <button
          type="button"
          disabled={testing}
          onClick={() => startTest(async () => setResult(await testWebhook(w.id)))}
          className="rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-ink transition hover:bg-surface-2 disabled:opacity-60"
        >
          {testing ? "Sending" : "Send test"}
        </button>
        {w.canManage ? (
          confirming ? (
            <form action={deleteWebhook} className="flex items-center gap-1.5">
              <input type="hidden" name="id" value={w.id} />
              <button type="submit" className="rounded-lg bg-[#d14a3e] px-2.5 py-1.5 text-xs font-semibold text-white">
                Delete webhook
              </button>
              <button type="button" onClick={() => setConfirming(false)} className="rounded-lg px-2 py-1.5 text-xs font-semibold text-muted">
                Keep
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-muted transition hover:text-terra"
            >
              Delete
            </button>
          )
        ) : null}
      </div>
      {result ? (
        <p className="text-xs">
          {"delivered" in result && result.delivered ? (
            <span className="font-semibold text-blue-ink">Test delivered (HTTP {result.response_status}).</span>
          ) : (
            <span className="font-semibold text-terra">Test not delivered: {result.error}</span>
          )}
        </p>
      ) : (
        <LastDelivery d={w.last_delivery} />
      )}
    </div>
  );
}

export function WebhooksCard({ webhooks, events, workspace }: { webhooks: WebhookRow[]; events: EventOption[]; workspace: string }) {
  const [state, action, saving] = useActionState<CreateWebhookState, FormData>(createWebhook, {});
  const [adding, setAdding] = useState(false);
  // Added: close the form; the new secret shows above the list.
  useEffect(() => {
    if (state.secret) setAdding(false);
  }, [state.secret]);
  return (
    <section id="webhooks" className="scroll-mt-4 overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
      <div className="flex flex-wrap items-start gap-3 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">For developers</div>
          <h2 className="font-display text-[15px] font-semibold tracking-[-0.01em]">Webhooks</h2>
          <p className="mt-0.5 text-[13px] text-muted">
            Get a signed request at your URL when a post in {workspace} publishes or fails, or a channel needs reconnecting.
          </p>
        </div>
        <a
          href="https://docs.postbase.so/api/webhooks"
          target="_blank"
          rel="noreferrer"
          className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line px-3.5 py-2 text-[13px] font-semibold text-blue-ink transition hover:bg-surface-2"
        >
          Docs
        </a>
      </div>

      {state.secret ? (
        <div className="border-b border-line p-5">
          <div className="rounded-xl border border-blue bg-surface p-3.5">
            <p className="text-[13px] font-semibold text-blue-ink">Copy the signing secret now. You won&apos;t see it again.</p>
            <p className="mt-0.5 text-[12px] text-muted">Use it to check the Postbase-Signature header on requests to {state.url}.</p>
            <div className="mt-2.5 flex items-center justify-between gap-3 rounded-xl bg-[#12141a] px-4 py-2.5 ring-1 ring-white/10">
              <code className="min-w-0 truncate font-mono text-[12.5px] text-[#e6e8ef]">{state.secret}</code>
              <CopyButton text={state.secret} />
            </div>
          </div>
        </div>
      ) : null}

      {webhooks.length > 0 ? (
        <div>
          {webhooks.map((w, i) => (
            <Row key={w.id} w={w} last={i === webhooks.length - 1 && !adding} />
          ))}
        </div>
      ) : null}

      <div className={`p-5 ${webhooks.length ? "border-t border-line" : ""}`}>
        {adding || webhooks.length === 0 ? (
          <form action={action} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-muted">Endpoint URL</span>
              <input
                name="url"
                type="url"
                required
                placeholder="https://example.com/webhooks/postbase"
                className="rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-blue"
              />
            </label>
            <fieldset className="flex flex-col gap-1.5">
              <legend className="mb-1 text-[13px] font-medium text-muted">Events</legend>
              {events.map((e) => (
                <label key={e.value} className="flex items-center gap-2 text-[13px]">
                  <input type="checkbox" name="events" value={e.value} defaultChecked={e.value.startsWith("post.")} />
                  <code className="font-mono text-[12px] font-semibold">{e.value}</code>
                  <span className="text-muted">{e.label}</span>
                </label>
              ))}
            </fieldset>
            {state.error ? <p className="text-[13px] font-semibold text-terra">{state.error}</p> : null}
            <div className="flex justify-end gap-2">
              {webhooks.length > 0 ? (
                <button type="button" onClick={() => setAdding(false)} className="rounded-full px-4 py-2 text-[13px] font-semibold text-muted">
                  Cancel
                </button>
              ) : null}
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-blue px-4 py-2 text-[13px] font-semibold text-on-blue transition hover:shadow disabled:opacity-60"
              >
                {saving ? "Adding" : "Add webhook"}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="rounded-full border border-line px-4 py-2 text-[13px] font-semibold text-ink transition hover:bg-surface-2"
            >
              Add another
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
