
"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import WorkspaceShell from "@/components/WorkspaceShell";
import {
  Flame,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Loader2,
} from "lucide-react";

type Habit = {
  id: string;
  title: string;
  description: string | null;
};

type HabitLog = {
  habit_id: string;
  completed: boolean;
};

function getLocalDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset();

  return new Date(now.getTime() - offset * 60000)
    .toISOString()
    .slice(0, 10);
}

export default function HabitTrackerPage() {
  const router = useRouter();

  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [userId, setUserId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [busyHabitIds, setBusyHabitIds] = useState<string[]>([]);

  const today = getLocalDate();

  const loadHabits = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        router.replace("/login");
        return;
      }

      setUserId(user.id);

      const [habitResult, logResult] = await Promise.all([
        supabase
          .from("habits")
          .select("id,title,description")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),

        supabase
          .from("habit_logs")
          .select("habit_id,completed")
          .eq("user_id", user.id)
          .eq("log_date", today),
      ]);

      if (habitResult.error) throw habitResult.error;
      if (logResult.error) throw logResult.error;

      setHabits(habitResult.data ?? []);
      setLogs(logResult.data ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load your habits."
      );
    } finally {
      setLoading(false);
    }
  }, [router, today]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadHabits();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadHabits]);

  async function addHabit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const trimmedTitle = title.trim();

    if (!trimmedTitle || !userId || saving) return;

    setSaving(true);
    setError("");

    try {
      const { data, error: insertError } = await supabase
        .from("habits")
        .insert({
          user_id: userId,
          title: trimmedTitle,
          description: description.trim() || null,
        })
        .select("id,title,description")
        .single();

      if (insertError) throw insertError;

      if (data) {
        setHabits((previous) => [data, ...previous]);
        setTitle("");
        setDescription("");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to create habit."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleHabit(habit: Habit) {
    if (!userId || busyHabitIds.includes(habit.id)) return;

    const current = logs.find((log) => log.habit_id === habit.id);
    const next = !(current?.completed ?? false);

    setError("");
    setBusyHabitIds((previous) => [...previous, habit.id]);

    setLogs((previous) => [
      ...previous.filter((log) => log.habit_id !== habit.id),
      { habit_id: habit.id, completed: next },
    ]);

    try {
      const { error: upsertError } = await supabase
        .from("habit_logs")
        .upsert(
          {
            user_id: userId,
            habit_id: habit.id,
            log_date: today,
            completed: next,
          },
          { onConflict: "habit_id,log_date" }
        );

      if (upsertError) throw upsertError;
    } catch (err) {
      setLogs((previous) => {
        const filtered = previous.filter(
          (log) => log.habit_id !== habit.id
        );

        return current ? [...filtered, current] : filtered;
      });

      setError(
        err instanceof Error
          ? err.message
          : "Unable to update habit."
      );
    } finally {
      setBusyHabitIds((previous) =>
        previous.filter((id) => id !== habit.id)
      );
    }
  }

  async function deleteHabit(id: string) {
    if (!userId) return;

    const confirmed = window.confirm(
      "Delete this habit and its history?"
    );

    if (!confirmed) return;

    setError("");

    try {
      const { error: deleteError } = await supabase
        .from("habits")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);

      if (deleteError) throw deleteError;

      setHabits((previous) =>
        previous.filter((habit) => habit.id !== id)
      );

      setLogs((previous) =>
        previous.filter((log) => log.habit_id !== id)
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to delete habit."
      );
    }
  }

  const completed = habits.filter((habit) =>
    logs.some(
      (log) => log.habit_id === habit.id && log.completed
    )
  ).length;

  const percentage = habits.length
    ? Math.round((completed / habits.length) * 100)
    : 0;

  return (
    <WorkspaceShell>
      <div className="space-y-7 text-white">
        <header>
          <div className="mb-3 flex items-center gap-2 text-orange-400">
            <Flame size={20} />
            <span className="text-xs font-bold tracking-widest">
              CONSISTENCY WORKSPACE
            </span>
          </div>

          <h1 className="text-3xl font-bold">Habit Tracker</h1>
          <p className="mt-2 text-gray-400">
            Small daily actions create long-term progress.
          </p>
        </header>

        <section className="rounded-2xl border border-orange-500/20 bg-gradient-to-r from-orange-500/10 to-[#9855FF]/10 p-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">
              Today&apos;s consistency
            </span>
            <span className="font-bold text-orange-400">
              {percentage}%
            </span>
          </div>

          <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange-500 to-[#9855FF] transition-all"
              style={{ width: `${percentage}%` }}
            />
          </div>

          <p className="mt-3 text-sm text-gray-400">
            {completed} of {habits.length} habits completed today
          </p>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#11111e] p-5">
          <h2 className="mb-4 font-semibold">Create a habit</h2>

          <form onSubmit={addHabit} className="grid gap-3">
            <input
              required
              maxLength={100}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Habit name (e.g. Study DSA)"
              className="rounded-xl border border-white/10 bg-[#080811] p-3 text-sm outline-none focus:border-[#9855FF]"
            />

            <textarea
              rows={2}
              maxLength={500}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)"
              className="rounded-xl border border-white/10 bg-[#080811] p-3 text-sm outline-none focus:border-[#9855FF]"
            />

            <button
              type="submit"
              disabled={saving || !userId}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#9855FF] p-3 font-semibold disabled:opacity-50"
            >
              {saving ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Plus size={18} />
              )}
              {saving ? "Saving..." : "Create Habit"}
            </button>
          </form>
        </section>

        {error && (
          <p
            role="alert"
            className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300"
          >
            {error}
          </p>
        )}

        <section>
          <h2 className="mb-4 text-lg font-bold">Your daily habits</h2>

          {loading ? (
            <Loader2 className="animate-spin text-[#B58AFF]" />
          ) : habits.length === 0 ? (
            <p className="rounded-xl border border-white/10 p-8 text-center text-gray-400">
              No habits created yet.
            </p>
          ) : (
            <div className="space-y-3">
              {habits.map((habit) => {
                const isCompleted = logs.some(
                  (log) =>
                    log.habit_id === habit.id && log.completed
                );

                const isBusy = busyHabitIds.includes(habit.id);

                return (
                  <article
                    key={habit.id}
                    className="flex items-center gap-4 rounded-xl border border-white/10 bg-[#11111e] p-4"
                  >
                    <button
                      type="button"
                      onClick={() => void toggleHabit(habit)}
                      disabled={isBusy}
                      aria-label={
                        isCompleted
                          ? "Mark habit incomplete"
                          : "Mark habit complete"
                      }
                      className="disabled:opacity-50"
                    >
                      {isBusy ? (
                        <Loader2
                          className="animate-spin text-[#B58AFF]"
                          size={23}
                        />
                      ) : isCompleted ? (
                        <CheckCircle2
                          className="text-emerald-400"
                          size={23}
                        />
                      ) : (
                        <Circle
                          className="text-gray-500"
                          size={23}
                        />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <h3
                        className={`font-semibold ${
                          isCompleted
                            ? "text-gray-500 line-through"
                            : ""
                        }`}
                      >
                        {habit.title}
                      </h3>

                      {habit.description && (
                        <p className="mt-1 text-sm text-gray-400">
                          {habit.description}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => void deleteHabit(habit.id)}
                      aria-label="Delete habit"
                      className="text-gray-500 hover:text-red-400"
                    >
                      <Trash2 size={18} />
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </WorkspaceShell>
  );
}
