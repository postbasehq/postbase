import { restartOnboarding } from "../onboarding-actions";

export default function SettingsPage() {
  const card = "rounded-2xl border border-line bg-surface shadow-sm";

  return (
    <div className="mx-auto max-w-[720px]">
      <p className="text-sm text-muted">Manage your workspace.</p>

      {/* Setup / onboarding */}
      <div className={`mt-6 ${card}`}>
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div>
            <div className="text-sm font-semibold">Setup guide</div>
            <div className="text-xs text-muted">
              Replay the welcome walkthrough — connect channels and hook up your AI agent.
            </div>
          </div>
          <form action={restartOnboarding} className="sm:ml-auto">
            <button
              type="submit"
              className="w-full rounded-full border border-line px-5 py-2.5 font-display text-sm font-semibold text-blue-ink hover:bg-surface-2 sm:w-auto"
            >
              Replay setup
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
