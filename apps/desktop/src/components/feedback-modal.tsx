import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { Modal } from "@/components/modal";
import { Button, Spinner } from "@/components/ui";
import { api } from "@/lib/api";

/**
 * One form for "help", "feedback" and "contact us", wherever it is opened
 * from. The topic names the surface — the sidebar, a seats refusal — so the
 * message lands in the channel with its context and the reply can start
 * from there. `openFeedback("seats")` is what a "contact us" link does.
 */

export type FeedbackTopic = "help" | "seats" | "billing";

const COPY: Record<FeedbackTopic, { title: string; intro: string; placeholder: string }> = {
  help: {
    title: "Help & feedback",
    intro: "Stuck, found a bug, or want something the app doesn't do yet? Tell us — a person reads every message.",
    placeholder: "What's on your mind?",
  },
  seats: {
    title: "More seats",
    intro: "Max covers five people. Tell us how many you need and we'll set it up.",
    placeholder: "How many seats, and for which team?",
  },
  billing: {
    title: "Billing",
    intro: "A question about your plan, an invoice, or a charge? Ask here.",
    placeholder: "What can we help with?",
  },
};

interface FeedbackContextValue {
  openFeedback: (topic?: FeedbackTopic) => void;
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [topic, setTopic] = useState<FeedbackTopic | null>(null);
  const openFeedback = useCallback((t: FeedbackTopic = "help") => setTopic(t), []);
  const value = useMemo(() => ({ openFeedback }), [openFeedback]);
  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <FeedbackModal topic={topic} onClose={() => setTopic(null)} />
    </FeedbackContext.Provider>
  );
}

export function useFeedback(): FeedbackContextValue {
  return useContext(FeedbackContext) ?? { openFeedback: () => {} };
}

function FeedbackModal({ topic, onClose }: { topic: FeedbackTopic | null; onClose: () => void }) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const copy = topic ? COPY[topic] : null;

  function close() {
    if (sending) return;
    onClose();
    // Reset after the close animation would have run; the next open is fresh.
    setTimeout(() => {
      setMessage("");
      setSent(false);
      setError(null);
    }, 200);
  }

  async function send() {
    if (!message.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      await api("/api/feedback", { method: "POST", json: { message: message.trim(), topic } });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send your message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal open={Boolean(copy)} onClose={close} dismissible={!sending} labelledBy="feedback-title">
      {copy && (
        <form
          className="w-[28rem] max-w-full p-6"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <h2 id="feedback-title" className="font-display text-lg font-semibold tracking-tight">
            {copy.title}
          </h2>
          {sent ? (
            <>
              <p className="mt-2 text-[0.9rem] text-text-secondary">
                Sent. We&rsquo;ll get back to you by email, usually within a day.
              </p>
              <div className="mt-6 flex justify-end">
                <Button type="button" variant="primary" onClick={close} className="h-9">
                  Done
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="mt-1 text-[0.9rem] text-text-secondary">{copy.intro}</p>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={copy.placeholder}
                rows={5}
                autoFocus
                maxLength={4000}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    void send();
                  }
                }}
                className="mt-4 w-full resize-y rounded-md border border-border bg-surface px-3 py-2 text-[0.929rem] text-text-primary outline-none placeholder:text-text-tertiary focus:border-accent/60"
              />
              {error && <p className="mt-2 text-[0.857rem] text-danger">{error}</p>}
              <div className="mt-5 flex items-center justify-between gap-2">
                <span className="text-[0.786rem] text-text-tertiary">⌘↩ to send</span>
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" onClick={close} disabled={sending} className="h-9">
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" disabled={sending || !message.trim()} className="h-9">
                    {sending && <Spinner className="size-3.5 text-background" />}
                    Send
                  </Button>
                </div>
              </div>
            </>
          )}
        </form>
      )}
    </Modal>
  );
}
