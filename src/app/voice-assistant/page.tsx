
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import WorkspaceShell from "@/components/WorkspaceShell";
import { supabase } from "@/lib/supabase";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  Trash2,
  Bot,
  User,
} from "lucide-react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type SpeechRecognitionResultItem = {
  transcript: string;
};

type SpeechRecognitionEventLike = {
  results: ArrayLike<ArrayLike<SpeechRecognitionResultItem>>;
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export default function VoiceAssistantPage() {
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [language, setLanguage] = useState("en-IN");
  const [error, setError] = useState("");

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      recognitionRef.current?.stop();
      recognitionRef.current = null;

      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
  }, []);

  function startListening() {
    setError("");

    if (listening) return;

    const Recognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!Recognition) {
      setError(
        "Speech recognition is not supported in this browser. Try Chrome."
      );
      return;
    }

    recognitionRef.current?.stop();

    const recognition = new Recognition();

    recognition.lang = language;
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();

      if (transcript && mountedRef.current) {
        setInput((previous) =>
          previous ? `${previous} ${transcript}` : transcript
        );
      }
    };

    recognition.onerror = () => {
      if (!mountedRef.current) return;

      setError(
        "Microphone recognition failed. Check browser microphone permission."
      );
      setListening(false);
    };

    recognition.onend = () => {
      if (mountedRef.current) {
        setListening(false);
      }

      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      setListening(true);
    } catch {
      recognitionRef.current = null;
      setError("Could not start microphone. Try again.");
      setListening(false);
    }
  }

  function speak(text: string) {
    if (!("speechSynthesis" in window)) {
      setError("Speech playback is not supported by this browser.");
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    utterance.lang = language;
    utterance.rate = 1;
    utterance.pitch = 1;

    utterance.onstart = () => {
      if (mountedRef.current) setSpeaking(true);
    };

    utterance.onend = () => {
      if (mountedRef.current) setSpeaking(false);
    };

    utterance.onerror = () => {
      if (mountedRef.current) setSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  }

  function stopSpeaking() {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    setSpeaking(false);
  }

  async function sendMessage(e?: FormEvent<HTMLFormElement>) {
    e?.preventDefault();

    const text = input.trim();

    if (!text || loading) return;

    setError("");
    setInput("");

    const nextMessages: Message[] = [
      ...messages,
      { role: "user", content: text },
    ];

    setMessages(nextMessages);
    setLoading(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      if (!session?.access_token) {
        router.replace("/login");
        throw new Error("Please log in again.");
      }

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          mode: "Study Tutor",
          messages: nextMessages.slice(-12),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "AI could not respond.");
      }

      if (typeof result.reply !== "string" || !result.reply.trim()) {
        throw new Error("AI returned an empty response. Try again.");
      }

      const reply = result.reply.trim();

      setMessages((previous) => [
        ...previous,
        { role: "assistant", content: reply },
      ]);

      if (voiceEnabled) {
        speak(reply);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Voice assistant failed."
      );
    } finally {
      setLoading(false);
    }
  }

  function clearConversation() {
    stopListening();
    stopSpeaking();
    setMessages([]);
    setError("");
    setInput("");
  }

  function toggleVoice() {
    if (voiceEnabled && speaking) {
      stopSpeaking();
    }

    setVoiceEnabled((previous) => !previous);
  }

  return (
    <WorkspaceShell>
      <div className="mx-auto flex max-w-5xl flex-col gap-6 text-white">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-violet-400">
              <Mic size={20} />
              <span className="text-sm font-semibold">HANDS-FREE AI</span>
            </div>

            <h1 className="mt-2 text-3xl font-bold">
              AI Voice Assistant
            </h1>

            <p className="mt-2 text-sm text-gray-400">
              Talk to CareerOS AI using your microphone.
            </p>
          </div>

          <button
            type="button"
            onClick={clearConversation}
            className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-xs text-gray-400 hover:text-white"
          >
            <Trash2 size={15} />
            Clear conversation
          </button>
        </header>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300"
          >
            {error}
          </div>
        )}

        <section className="rounded-2xl border border-white/10 bg-[#11111e] p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs text-gray-400">
              Voice language

              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#181827] px-4 py-3 text-sm text-white"
              >
                <option value="en-IN">English (India)</option>
                <option value="hi-IN">Hindi (India)</option>
              </select>
            </label>

            <div className="flex items-end">
              <button
                type="button"
                onClick={toggleVoice}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm"
              >
                {voiceEnabled ? (
                  <Volume2 size={17} />
                ) : (
                  <VolumeX size={17} />
                )}

                Voice replies {voiceEnabled ? "On" : "Off"}
              </button>
            </div>
          </div>
        </section>

        <section className="flex min-h-[430px] flex-col rounded-2xl border border-white/10 bg-[#11111e]">
          <div className="flex items-center gap-3 border-b border-white/10 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15">
              <Bot className="text-violet-300" />
            </div>

            <div>
              <p className="text-sm font-semibold">CareerOS Voice AI</p>
              <p className="text-xs text-gray-500">
                {listening
                  ? "Listening..."
                  : speaking
                    ? "Speaking..."
                    : "Ready to help"}
              </p>
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {messages.length === 0 && (
              <div className="flex min-h-64 flex-col items-center justify-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-violet-500/15">
                  <Mic className="text-violet-300" size={28} />
                </div>

                <p className="mt-5 font-semibold">
                  Hey! I&apos;m listening.
                </p>

                <p className="mt-2 max-w-sm text-sm text-gray-500">
                  Ask me about your studies, DSA, exams, projects or
                  placement preparation.
                </p>
              </div>
            )}

            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`flex gap-3 ${
                  message.role === "user"
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/15">
                    <Bot size={17} className="text-violet-300" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-4 text-sm leading-6 ${
                    message.role === "user"
                      ? "bg-violet-600/20 text-violet-100"
                      : "bg-white/5 text-gray-300"
                  }`}
                >
                  <p className="whitespace-pre-wrap">
                    {message.content}
                  </p>

                  {message.role === "assistant" && (
                    <button
                      type="button"
                      onClick={() => speak(message.content)}
                      aria-label="Read response aloud"
                      className="mt-3 text-gray-500 hover:text-violet-300"
                    >
                      <Volume2 size={15} />
                    </button>
                  )}
                </div>

                {message.role === "user" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/15">
                    <User size={17} className="text-blue-300" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <p className="text-sm text-gray-500">
                CareerOS AI is thinking...
              </p>
            )}

            <div ref={bottomRef} />
          </div>

          <form
            onSubmit={sendMessage}
            className="border-t border-white/10 p-4"
          >
            <div className="flex gap-2">
              <button
                type="button"
                onClick={listening ? stopListening : startListening}
                className={`rounded-xl p-3 ${
                  listening
                    ? "bg-red-500/20 text-red-300"
                    : "border border-white/10 text-gray-300"
                }`}
                aria-label={
                  listening ? "Stop listening" : "Start voice input"
                }
              >
                {listening ? <MicOff size={19} /> : <Mic size={19} />}
              </button>

              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Speak or type your message..."
                maxLength={8000}
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none focus:border-violet-500"
              />

              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 p-3 disabled:opacity-40"
                aria-label="Send message"
              >
                <Send size={19} />
              </button>
            </div>

            <p className="mt-2 text-[10px] leading-4 text-gray-600">
              Microphone access requires browser permission. Speech
              recognition availability and accuracy depend on your
              browser and device.
            </p>
          </form>
        </section>
      </div>
    </WorkspaceShell>
  );
}
