"use client";

import { useState, useRef, useEffect } from "react";
import { apiFetch } from "@/lib/api";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
}

const SUGGESTED_QUESTIONS = [
  "What does this company do?",
  "Is it trustworthy?",
  "What are its weaknesses?",
  "How does it make money?",
];

export function ChatPanel({
  siteId,
  initialHistory,
}: {
  siteId: string;
  initialHistory: ChatMessage[];
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialHistory);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text: string) {
    if (!text.trim() || sending) return;
    setError(null);
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setSending(true);

    try {
      const { ok, data } = await apiFetch<{ answer: string; sources: string[]; error?: string }>(
        `/api/sites/${siteId}/chat`,
        { method: "POST", json: { message: text } }
      );
      if (!ok) {
        setError(data.error || "Something went wrong.");
        setSending(false);
        return;
      }
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.answer, sources: data.sources },
      ]);
    } catch {
      setError("Couldn't reach the server. Try again.");
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  return (
    <div className="panel flex h-[600px] flex-col">
      <div className="border-b border-border px-5 py-4">
        <h3 className="font-display text-sm font-semibold text-ivory">Ask SiteMind AI</h3>
        <p className="readout-label mt-1">Grounded in crawled page content</p>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <p className="text-sm text-muted">Ask anything about this site.</p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="rounded-full border border-border bg-surface-raised px-3 py-1.5 text-xs text-muted hover:text-ivory"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm ${
                m.role === "user"
                  ? "bg-signal text-ink"
                  : "panel-raised text-ivory"
              }`}
            >
              <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
              {m.sources && m.sources.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5 border-t border-border/50 pt-2">
                  {m.sources.map((s) => (
                    <span
                      key={s}
                      className="truncate rounded bg-ink/40 px-1.5 py-0.5 font-mono text-[10px] text-muted"
                      title={s}
                    >
                      {new URL(s).pathname || "/"}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="panel-raised flex items-center gap-1.5 rounded-xl px-4 py-3">
              <span className="h-1.5 w-1.5 animate-pulse_dot rounded-full bg-signal" />
              <span
                className="h-1.5 w-1.5 animate-pulse_dot rounded-full bg-signal"
                style={{ animationDelay: "0.2s" }}
              />
              <span
                className="h-1.5 w-1.5 animate-pulse_dot rounded-full bg-signal"
                style={{ animationDelay: "0.4s" }}
              />
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="mx-5 mb-2 rounded-lg border border-alert/30 bg-alert/10 px-3 py-1.5 text-xs text-alert">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2 border-t border-border p-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about this site…"
          disabled={sending}
          className="input-field flex-1"
        />
        <button type="submit" disabled={sending || !input.trim()} className="btn-primary shrink-0 px-4">
          Send
        </button>
      </form>
    </div>
  );
}
