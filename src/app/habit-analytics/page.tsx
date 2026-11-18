
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import WorkspaceShell from "@/components/WorkspaceShell";
import { supabase } from "@/lib/supabase";
import {
  Flame,
  Target,
  CheckCircle2,
  CalendarDays,
  RefreshCw,
} from "lucide-react";

type Habit = {
  id: string;
  title: string;
};

type HabitLog = {
  habit_id: string;
  log_date: string;
  completed: boolean;
};

function localDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getLastSevenDays() {
  const days: string[] = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    days.push(localDate(date));
  }

  return days;
}

function calculateCurrentStreak(logs: HabitLog[], habitId: string) {
  const completedDates = new Set(
    logs
      .filter(
        (log) => log.habit_id === habitId && log.completed
      )
      .map((log) => log.log_date)
  );

  const today = localDate(new Date());

  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);

  const yesterday = localDate(yesterdayDate);

  const cursor = completedDates.has(today)
    ? new Date(`${today}T12:00:00`)
    : completedDates.has(yesterday)
      ? new Date(`${yesterday}T12:00:00`)
      : null;

  if (!cursor) return 0;

  let streak = 0;

  while (completedDates.has(localDate(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export default function HabitAnalyticsPage() {
  const router = useRouter();

  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const days = useMemo(() => getLastSevenDays(), []);
  const today = localDate(new Date());

  const loadAnalytics = useCallback(async () => {
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

      const [habitResult, logResult] = await Promise.all([
        supabase
          .from("habits")
          .select("id, title")
          .eq("user_id", user.id),

        supabase
          .from("habit_logs")
          .select("habit_id, log_date, completed")
          .eq("user_id", user.id)
          .gte("log_date", days[0])
          .lte("log_date", days[6]),
      ]);

      if (habitResult.error) throw habitResult.error;
      if (logResult.error) throw logResult.error;

      setHabits(habitResult.data ?? []);
      setLogs(logResult.data ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load habit analytics."
      );
    } finally {
      setLoading(false);
    }
  }, [days, router]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAnalytics();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadAnalytics]);

  const habitIds = useMemo(
    () => new Set(habits.map((habit) => habit.id)),
    [habits]
  );

  const validLogs = useMemo(
    () => logs.filter((log) => habitIds.has(log.habit_id)),
    [logs, habitIds]
  );

  const elapsedDays = days.filter((day) => day <= today).length;
  const totalPossible = habits.length * elapsedDays;

  const completedLogs = validLogs.filter(
    (log) => log.completed && log.log_date <= today
  ).length;

  const completionRate =
    totalPossible > 0
      ? Math.min(
          100,
          Math.round((completedLogs / totalPossible) * 100)
        )
      : 0;

  const dailyStats = useMemo(
    () =>
      days.map((day) => {
        const completed = validLogs.filter(
          (log) => log.log_date === day && log.completed
        ).length;

        return {
          date: day,
          completed,
          rate:
            habits.length > 0
              ? Math.round((completed / habits.length) * 100)
              : 0,
        };
      }),
    [days, validLogs, habits.length]
  );

  const bestDay = useMemo(() => {
    const eligibleDays = dailyStats
      .filter((day) => day.date <= today && day.completed > 0)
      .sort((a, b) => b.completed - a.completed);

    return eligibleDays[0];
  }, [dailyStats, today]);

  return (
    <WorkspaceShell>
      <div className="mx-auto max-w-6xl space-y-7 text-white">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2 text-violet-400">
              <Flame size={20} />
              <span className="text-sm font-semibold">
                CONSISTENCY TRACKER
              </span>
            </div>

            <h1 className="mt-2 text-3xl font-bold">
              Habit Analytics
            </h1>

            <p className="mt-2 text-sm text-gray-400">
              Understand your habits and build consistent routines.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadAnalytics()}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm hover:bg-white/5 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </header>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300"
          >
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-sm text-gray-500">
            Loading your habit analytics...
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  title: "Total Habits",
                  value: habits.length,
                  icon: Target,
                },
                {
                  title: "Completed Logs",
                  value: completedLogs,
                  icon: CheckCircle2,
                },
                {
                  title: "7-Day Completion",
                  value: `${completionRate}%`,
                  icon: CalendarDays,
                },
                {
                  title: "Best Day",
                  value: bestDay?.date.slice(5) || "—",
                  icon: Flame,
                },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-white/10 bg-[#11111e] p-5"
                  >
                    <Icon size={22} className="text-violet-400" />

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

            <section className="rounded-2xl border border-white/10 bg-[#11111e] p-6">
              <h2 className="font-bold">Last 7 Days</h2>

              <p className="mt-1 text-xs text-gray-500">
                Completed habit logs per day
              </p>

              <div className="mt-8 flex h-52 items-end justify-around gap-3">
                {dailyStats.map((day) => (
                  <div
                    key={day.date}
                    className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                  >
                    <span className="text-xs text-gray-400">
                      {day.completed}
                    </span>

                    <div className="flex h-36 w-full items-end justify-center rounded-t-lg bg-white/5">
                      <div
                        className="w-full max-w-12 rounded-t-lg bg-gradient-to-t from-violet-700 to-blue-400 transition-all"
                        style={{
                          height: `${day.rate}%`,
                          minHeight:
                            day.completed > 0 ? "5px" : "0px",
                        }}
                      />
                    </div>

                    <span className="text-[10px] text-gray-500">
                      {day.date.slice(5)}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#11111e] p-6">
              <h2 className="mb-5 font-bold">
                Habit-wise Performance
              </h2>

              {habits.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No habits found. Add habits in Habit Tracker first.
                </p>
              ) : (
                <div className="space-y-5">
                  {habits.map((habit) => {
                    const habitLogs = validLogs.filter(
                      (log) => log.habit_id === habit.id
                    );

                    const completed = habitLogs.filter(
                      (log) => log.completed && log.log_date <= today
                    ).length;

                    const rate =
                      elapsedDays > 0
                        ? Math.min(
                            100,
                            Math.round((completed / elapsedDays) * 100)
                          )
                        : 0;

                    const streak = calculateCurrentStreak(
                      validLogs,
                      habit.id
                    );

                    return (
                      <div key={habit.id}>
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold">
                              {habit.title}
                            </p>

                            <p className="mt-1 text-xs text-gray-500">
                              {completed}/{elapsedDays} completed records
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="text-sm font-bold text-violet-300">
                              {rate}%
                            </p>

                            <p className="text-xs text-gray-500">
                              {streak} day streak
                            </p>
                          </div>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500"
                            style={{
                              width: `${rate}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <p className="text-xs leading-5 text-gray-600">
              Analytics are calculated from recorded habit logs for the
              last seven calendar days. Future dates are excluded from
              completion rates. Missing records are counted as
              incomplete; this report does not infer whether a habit
              was actually missed.
            </p>
          </>
        )}
      </div>
    </WorkspaceShell>
  );
}
