"use client";

/**
 * Disconnect a channel, with a confirm guard (it's destructive — removes the
 * channel and its per-channel history). Wraps a server action.
 */
export function DisconnectButton({
  action,
  channelId,
  label,
}: {
  action: (formData: FormData) => Promise<void>;
  channelId: string;
  label: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(`Disconnect ${label}? This removes the channel and its post history.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="channel_id" value={channelId} />
      <button
        type="submit"
        className="rounded-full border border-line px-2.5 py-1 text-xs font-medium text-muted hover:border-terra hover:text-terra"
      >
        Disconnect
      </button>
    </form>
  );
}
