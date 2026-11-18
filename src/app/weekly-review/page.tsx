
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import WorkspaceShell from "@/components/WorkspaceShell";
import { supabase } from "@/lib/supabase";
import {
  Sparkles,
  RefreshCw,
  CheckCircle2,
  Target,
  Code2,
  Flame,
} from "lucide-react";

type Review = {
  id: string;
  week_start: string;
  week_end: string;
  review_content: string;
  created_at: string;
};

type Statistics = {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  habitsCreated: number;
  habitLogsRecorded: number;
  completedHabitLogs: number;
  habitCompletionRate: number | null;
  codingProblemsSolvedThisWeek: number;
};

function getCurrentWeekStart() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);

  const today = new Date(Date.UTC(year, month - 1, day));
  const weekday = today.getUTCDay();
  const offset = weekday === 0 ? -6 : 1 - weekday;

  today.setUTCDate(today.getUTCDate() + offset);

  return today.toISOString().slice(0, 10);
}

export default function WeeklyReviewPage() {
  const [review, setReview] = useState("");
  const [history, setHistory] = useState<Review[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [weekLabel, setWeekLabel] = useState("");

  const initialLoadStarted = useRef(false);

  const loadHistory = useCallback(async () => {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      throw new Error("Please log in again.");
    }

    const { data, error: fetchError } = await supabase
      .from("weekly_reviews")
      .select("id, week_start, week_end, review_content, created_at")
      .eq("user_id", session.user.id)
      .order("week_start", { ascending: false })
      .limit(12);

    if (fetchError) throw fetchError;

    setHistory(data || []);
  }, []);

  const loadCurrentReview = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.user) {
        throw new Error("Please log in again.");
      }

      const weekStart = getCurrentWeekStart();

      const { data, error: fetchError } = await supabase
        .from("weekly_reviews")
        .select("id, week_start, week_end, review_content, created_at")
        .eq("user_id", session.user.id)
        .eq("week_start", weekStart)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (data) {
        setReview(data.review_content);
        setWeekLabel(`${data.week_start} to ${data.week_end}`);
      } else {
        setReview("");
        setWeekLabel("");
      }

      setStatistics(null);

      await loadHistory();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load weekly review."
      );
    } finally {
      setLoading(false);
    }
  }, [loadHistory]);

  useEffect(() => {
    if (initialLoadStarted.current) return;

    initialLoadStarted.current = true;
    loadCurrentReview();
  }, [loadCurrentReview]);

  async function generateReview() {
    if (generating || loading) return;

    setGenerating(true);
    setError("");

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error("Please log in again.");
      }

      const response = await fetch("/api/ai/weekly-review", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not generate review.");
      }

      if (
        !result.success ||
        typeof result.review !== "string" ||
        !result.review.trim()
      ) {
        throw new Error("Invalid weekly review received from AI.");
      }

      setReview(result.review);
      setWeekLabel(`${result.weekStart} to ${result.weekEnd}`);

      if (result.statistics) {
        setStatistics({
          totalTasks: result.statistics.totalTasks ?? 0,
          completedTasks: result.statistics.completedTasks ?? 0,
          pendingTasks: result.statistics.pendingTasks ?? 0,
          habitsCreated: result.statistics.habitsCreated ?? 0,
          habitLogsRecorded: result.statistics.habitLogsRecorded ?? 0,
          completedHabitLogs: result.statistics.completedHabitLogs ?? 0,
          habitCompletionRate:
            result.statistics.habitCompletionRate ?? null,
          codingProblemsSolvedThisWeek:
            result.statistics.codingProblemsSolvedThisWeek ?? 0,
        });
      }

      await loadHistory();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to generate review."
      );
    } finally {
      setGenerating(false);
    }
  }

  function openPrevious(item: Review) {
    setReview(item.review_content);
    setWeekLabel(`${item.week_start} to ${item.week_end}`);
    setStatistics(null);
    setError("");
  }

  const statisticCards = statistics
    ? [
        {
          title: "Completed Tasks",
          value: `${statistics.completedTasks}/${statistics.totalTasks}`,
          icon: CheckCircle2,
        },
        {
          title: "Pending Tasks",
          value: String(statistics.pendingTasks),
          icon: Target,
        },
        {
          title: "Recorded Habit Rate",
          value:
            statistics.habitCompletionRate === null
              ? "N/A"
              : `${statistics.habitCompletionRate}%`,
          icon: Flame,
        },
        {
          title: "Solved This Week",
          value: String(statistics.codingProblemsSolvedThisWeek),
          icon: Code2,
        },
      ]
    : [];

  return (
    <WorkspaceShell>
      <div className="mx-auto max-w-6xl space-y-7 text-white">
        {/* Header */}
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2 text-violet-400">
              <Sparkles size={20} />
              <span className="text-sm font-semibold">
                WEEKLY INSIGHTS
              </span>
            </div>

            <h1 className="mt-2 text-3xl font-bold">
              Weekly Review
            </h1>

            <p className="mt-2 text-sm text-gray-400">
              Understand your progress and plan a better next week.
            </p>
          </div>

          <button
            onClick={generateReview}
            disabled={generating || loading}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-5 py-3 text-sm font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={generating ? "animate-spin" : ""}
            />
            {generating ? "Analyzing..." : "Generate Weekly Review"}
          </button>
        </header>

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Statistics */}
        {statistics && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {statisticCards.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="rounded-2xl border border-white/10 bg-[#11111e] p-5"
                >
                  <Icon className="text-violet-400" size={22} />

                  <p className="mt-4 text-2xl font-bold">
                    {item.value}
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    {item.title}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Main content */}
        <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
          <section className="rounded-2xl border border-violet-500/20 bg-[#11111e] p-6">
            <div className="mb-5">
              <h2 className="font-bold">
                AI Performance Report
              </h2>

              <p className="mt-1 text-xs text-gray-500">
                {weekLabel || "Current week"}
              </p>
            </div>

            {loading || generating ? (
              <div className="flex items-center gap-3 py-14 text-sm text-gray-400">
                <RefreshCw className="animate-spin" size={20} />

                {generating
                  ? "AI is analyzing your weekly performance..."
                  : "Loading your review..."}
              </div>
            ) : review ? (
              <div className="whitespace-pre-wrap rounded-xl bg-black/20 p-5 text-sm leading-7 text-gray-300">
                {review}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-white/10 p-10 text-center">
                <Sparkles
                  className="mx-auto text-violet-400"
                  size={28}
                />

                <p className="mt-4 font-semibold">
                  Your weekly review is waiting.
                </p>

                <p className="mt-2 text-sm text-gray-500">
                  Generate your first AI-powered performance review.
                </p>
              </div>
            )}
          </section>

          {/* Previous reviews */}
          <aside className="rounded-2xl border border-white/10 bg-[#11111e] p-5">
            <h2 className="font-bold">Previous Reviews</h2>

            <p className="mt-1 text-xs text-gray-500">
              Your saved weekly reports
            </p>

            <div className="mt-5 space-y-3">
              {history.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No previous reviews yet.
                </p>
              ) : (
                history.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => openPrevious(item)}
                    className="w-full rounded-xl border border-white/10 p-3 text-left transition hover:border-violet-500/40 hover:bg-white/[0.03]"
                  >
                    <p className="text-sm font-medium">
                      {item.week_start}
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      To {item.week_end}
                    </p>
                  </button>
                ))
              )}
            </div>
          </aside>
        </div>
      </div>
    </WorkspaceShell>
  );
}
