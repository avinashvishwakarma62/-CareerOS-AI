
"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import WorkspaceShell from "@/components/WorkspaceShell";
import {
  Bot,
  Send,
  Sparkles,
  Trash2,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";

const modes = [
  "Study Tutor",
  "Career Mentor",
  "Coding Buddy",
  "Exam Coach",
  "Accountability Coach",
  "Project Guide",
  "Daily Planner",
];

type Message = {
  id: string;
  mode: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

export default function PersonalAIPage() {
  const [userId, setUserId] = useState("");
  const [mode, setMode] = useState(modes[0]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const { data: auth } = await supabase.auth.getUser();

      if (!auth.user) {
        window.location.replace("/login");
        return;
      }

      setUserId(auth.user.id);

      const { data, error } = await supabase
        .from("ai_chats")
        .select("id,mode,role,content,created_at")
        .eq("user_id", auth.user.id)
        .eq("mode", modes[0])
        .order("created_at", { ascending: true });

      if (error) {
        setError(error.message);
      } else {
        setMessages((data || []) as Message[]);
      }

      setLoading(false);
    }

    load();
  }, []);

  async function changeMode(next: string) {
    if (sending || next === mode) return;

    setMode(next);
    setError("");
    setLoading(true);
    setMessages([]);

    const { data, error } = await supabase
      .from("ai_chats")
      .select("id,mode,role,content,created_at")
      .eq("user_id", userId)
      .eq("mode", next)
      .order("created_at", { ascending: true });

    if (error) {
      setError(error.message);
    } else {
      setMessages((data || []) as Message[]);
    }

    setLoading(false);
  }

  async function sendMessage(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const content = message.trim();

    if (!content || !userId || sending) return;

    setSending(true);
    setError("");
    setMessage("");

    // Save user message first.
    const { data: userMessage, error: saveError } = await supabase
      .from("ai_chats")
      .insert({
        user_id: userId,
        mode,
        role: "user",
        content,
      })
      .select("id,mode,role,content,created_at")
      .single();

    if (saveError || !userMessage) {
      setError(saveError?.message || "Could not save your message.");
      setMessage(content);
      setSending(false);
      return;
    }

    const updatedMessages = [...messages, userMessage as Message];
    setMessages(updatedMessages);

    try {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      const accessToken = sessionData.session?.access_token;

      if (sessionError || !accessToken) {
        throw new Error("Session expired. Please log in again.");
      }

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          mode,
          messages: updatedMessages.slice(-12).map((item) => ({
            role: item.role,
            content: item.content,
          })),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "AI request failed.");
      }

      if (!result.reply || typeof result.reply !== "string") {
        throw new Error("AI returned an empty response.");
      }

      // Save assistant response.
      const { data: assistantMessage, error: assistantError } =
        await supabase
          .from("ai_chats")
          .insert({
            user_id: userId,
            mode,
            role: "assistant",
            content: result.reply,
          })
          .select("id,mode,role,content,created_at")
          .single();

      if (assistantError || !assistantMessage) {
        throw new Error(
          "AI replied, but the reply could not be saved: " +
            (assistantError?.message || "Unknown error")
        );
      }

      setMessages((old) => [
        ...old,
        assistantMessage as Message,
      ]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setSending(false);
    }
  }

  async function clearHistory() {
    if (sending) return;

    if (!window.confirm(`Delete all ${mode} chat messages?`)) return;

    setError("");

    const { error } = await supabase
      .from("ai_chats")
      .delete()
      .eq("user_id", userId)
      .eq("mode", mode);

    if (error) {
      setError(error.message);
    } else {
      setMessages([]);
    }
  }

  return (
    <WorkspaceShell>
      <div className="space-y-6 text-white">

        <header>
          <div className="mb-3 flex items-center gap-2 text-[#20C8FF]">
            <Sparkles size={20} />
            PERSONAL AI WORKSPACE
          </div>

          <h1 className="text-3xl font-bold">AI Companion</h1>

          <p className="mt-2 text-gray-400">
            Your personal AI assistants for academics, coding and career growth.
          </p>
        </header>

        {/* AI Modes */}
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {modes.map((item) => (
            <button
              key={item}
              onClick={() => changeMode(item)}
              disabled={sending}
              className={`rounded-xl border p-4 text-left text-sm transition ${
                mode === item
                  ? "border-[#9855FF] bg-[#9855FF]/15 text-white"
                  : "border-white/10 bg-[#11111e] text-gray-400 hover:border-white/30"
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <Bot size={19} className="mb-3 text-[#B58AFF]" />
              <span className="font-semibold">{item}</span>
            </button>
          ))}
        </section>

        {/* Chat Window */}
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#11111e]">

          <div className="flex items-center justify-between border-b border-white/10 p-4">
            <div>
              <h2 className="font-semibold">{mode}</h2>
              <p className="text-xs text-gray-500">
                AI-powered conversation
              </p>
            </div>

            <button
              onClick={clearHistory}
              disabled={sending || messages.length === 0}
              className="text-gray-400 transition hover:text-red-400 disabled:opacity-30"
              aria-label="Clear chat history"
              title="Clear conversation"
            >
              <Trash2 size={18} />
            </button>
          </div>

          <div className="flex min-h-[380px] max-h-[600px] flex-col gap-4 overflow-y-auto p-5">

            {loading ? (
              <div className="m-auto flex items-center gap-2 text-sm text-gray-400">
                <RefreshCw size={17} className="animate-spin" />
                Loading conversations...
              </div>
            ) : messages.length === 0 ? (
              <div className="m-auto text-center">
                <Bot
                  size={45}
                  className="mx-auto mb-3 text-[#9855FF]"
                />

                <h3 className="font-semibold">
                  Start a conversation
                </h3>

                <p className="mt-2 text-sm text-gray-500">
                  Ask {mode} anything. Your conversations are saved.
                </p>
              </div>
            ) : (
              messages.map((item) => (
                <div
                  key={item.id}
                  className={`max-w-[90%] rounded-2xl p-4 text-sm md:max-w-[80%] ${
                    item.role === "user"
                      ? "ml-auto bg-[#9855FF]/20"
                      : "mr-auto border border-white/5 bg-white/5"
                  }`}
                >
                  <p className="mb-2 text-xs font-semibold text-[#20C8FF]">
                    {item.role === "user" ? "You" : "CareerOS AI"}
                  </p>

                  <p className="whitespace-pre-wrap leading-6 text-gray-200">
                    {item.content}
                  </p>
                </div>
              ))
            )}

            {sending && (
              <div className="mr-auto flex items-center gap-2 rounded-xl bg-white/5 p-4 text-sm text-gray-400">
                <LoaderCircle size={17} className="animate-spin text-[#20C8FF]" />
                CareerOS AI is thinking...
              </div>
            )}
          </div>

          {/* Message Input */}
          <form
            onSubmit={sendMessage}
            className="flex gap-3 border-t border-white/10 p-4"
          >
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={sending || loading}
              placeholder={`Message ${mode}...`}
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#080811] p-3 text-sm outline-none focus:border-[#9855FF] disabled:opacity-50"
            />

            <button
              type="submit"
              disabled={sending || loading || !message.trim()}
              aria-label="Send message"
              className="flex items-center justify-center rounded-xl bg-[#9855FF] px-4 transition hover:bg-[#8540f0] disabled:opacity-50"
            >
              {sending ? (
                <LoaderCircle size={18} className="animate-spin" />
              ) : (
                <Send size={18} />
              )}
            </button>
          </form>
        </section>

        {error && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-300">
            {error}
          </div>
        )}

        <p className="text-center text-xs text-gray-600">
          AI can make mistakes. Verify important academic and career information.
        </p>
      </div>
    </WorkspaceShell>
  );
}
