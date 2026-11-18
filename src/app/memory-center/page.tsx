
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import WorkspaceShell from "@/components/WorkspaceShell";
import {
  BrainCircuit,
  Search,
  MessageSquare,
  BookOpen,
  Code2,
  RefreshCw,
} from "lucide-react";

type Memory = {
  id: string;
  mode: string;
  role: string;
  content: string;
  created_at: string;
};

export default function MemoryCenterPage() {
  const router = useRouter();

  const [memories, setMemories] = useState<Memory[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadMemories = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace("/login");
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("ai_chats")
        .select("id, mode, role, content, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (fetchError) throw fetchError;

      setMemories(data || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load your memories."
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadMemories();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadMemories]);

  const filteredMemories = memories.filter((item) =>
    `${item.content} ${item.mode}`
      .toLowerCase()
      .includes(search.trim().toLowerCase())
  );

  const userMessages = memories.filter(
    (item) => item.role === "user"
  ).length;

  return (
    <WorkspaceShell>
      <main className="min-h-screen bg-[#080811] p-5 text-white md:p-8">
        <div className="mx-auto max-w-6xl space-y-8">
          <header>
            <div className="mb-3 flex items-center gap-3">
              <div className="rounded-xl bg-purple-500/15 p-3 text-purple-400">
                <BrainCircuit size={26} />
              </div>

              <span className="text-sm font-medium text-purple-400">
                PERSONAL KNOWLEDGE
              </span>
            </div>

            <h1 className="text-3xl font-bold md:text-4xl">
              Memory Center
            </h1>

            <p className="mt-2 text-gray-400">
              Your saved AI conversations and learning history in one place.
            </p>
          </header>

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-[#11111e] p-5">
              <div className="flex items-center justify-between">
                <MessageSquare className="text-purple-400" />
                <span className="text-xs text-gray-500">
                  TOTAL RECORDS
                </span>
              </div>

              <p className="mt-4 text-3xl font-bold">
                {memories.length}
              </p>

              <p className="mt-1 text-sm text-gray-400">
                Stored AI messages
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#11111e] p-5">
              <div className="flex items-center justify-between">
                <BookOpen className="text-cyan-400" />
                <span className="text-xs text-gray-500">
                  YOUR INPUTS
                </span>
              </div>

              <p className="mt-4 text-3xl font-bold">
                {userMessages}
              </p>

              <p className="mt-1 text-sm text-gray-400">
                Questions and prompts
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#11111e] p-5">
            <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-lg font-semibold">
                  Knowledge History
                </h2>

                <p className="mt-1 text-sm text-gray-400">
                  Search through your saved AI conversations.
                </p>
              </div>

              <button
                type="button"
                onClick={() => void loadMemories()}
                disabled={loading}
                className="flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/5 disabled:opacity-50"
              >
                <RefreshCw
                  size={15}
                  className={loading ? "animate-spin" : ""}
                />
                Refresh
              </button>
            </div>

            <div className="relative mb-5">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
              />

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations..."
                className="w-full rounded-xl border border-white/10 bg-[#080811] py-3 pl-11 pr-4 text-sm outline-none focus:border-purple-500"
              />
            </div>

            {loading ? (
              <p className="py-10 text-center text-gray-400">
                Loading your memories...
              </p>
            ) : error ? (
              <div className="rounded-xl bg-red-500/10 p-4 text-sm text-red-400">
                {error}
              </div>
            ) : filteredMemories.length === 0 ? (
              <div className="py-12 text-center">
                <BrainCircuit
                  size={38}
                  className="mx-auto mb-3 text-gray-600"
                />

                <p className="font-medium">
                  No memories found
                </p>

                <p className="mt-2 text-sm text-gray-500">
                  {search
                    ? "Try a different search term."
                    : "Your saved AI conversations will appear here."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredMemories.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-xl border border-white/10 bg-[#0b0b16] p-4"
                  >
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Code2
                          size={15}
                          className="text-purple-400"
                        />

                        <span className="text-sm font-medium capitalize text-purple-300">
                          {item.mode || "AI Companion"}
                        </span>

                        <span className="rounded-md bg-white/5 px-2 py-1 text-xs text-gray-400">
                          {item.role}
                        </span>
                      </div>

                      <span className="text-xs text-gray-500">
                        {new Date(item.created_at).toLocaleString()}
                      </span>
                    </div>

                    <p className="whitespace-pre-wrap text-sm leading-6 text-gray-300">
                      {item.content}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </WorkspaceShell>
  );
}
