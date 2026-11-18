
"use client";

import { useState } from "react";
import WorkspaceShell from "@/components/WorkspaceShell";
import { supabase } from "@/lib/supabase";
import { Sunrise, Sparkles, RefreshCw, CalendarDays, CheckCircle2, Flame } from "lucide-react";

type Summary = {
  pendingTasks: number;
  upcomingExams: number;
  pendingAssignments: number;
  habits: number;
  completedHabits: number;
};

export default function DailyBriefingPage() {
  const [briefing, setBriefing] = useState("");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generateBriefing() {
    setLoading(true);
    setError("");
    setBriefing("");
    setSummary(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Please log in again.");
      }

      const response = await fetch("/api/ai/daily-briefing", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to generate briefing.");
      }

      setBriefing(result.briefing);
      setSummary(result.dataSummary);
      setDate(result.date);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Briefing generation failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <WorkspaceShell>
      <div className="mx-auto max-w-5xl space-y-7 text-white">
        <header>
          <div className="flex items-center gap-2 text-violet-400">
            <Sunrise size={20} />
            <span className="text-sm font-semibold">YOUR DAILY INTELLIGENCE</span>
          </div>
          <h1 className="mt-2 text-3xl font-bold">Daily AI Briefing</h1>
          <p className="mt-2 text-sm text-gray-400">
            Start your day with priorities, deadlines and personalized guidance.
          </p>
        </header>

        <section className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-950/40 to-[#11111e] p-7">
          <Sparkles className="text-violet-300" size={28} />
          <h2 className="mt-4 text-xl font-bold">Your day, intelligently planned.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
            CareerOS AI will analyze your pending tasks, assignments, exams and
            habits to create a realistic daily action plan.
          </p>
          <button
            onClick={generateBriefing}
            disabled={loading}
            className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-5 py-3 text-sm font-semibold disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            {loading ? "Preparing your briefing..." : "Generate Today's Briefing"}
          </button>
        </section>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {summary && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { title: "Pending Tasks", value: summary.pendingTasks, icon: CheckCircle2 },
              { title: "Upcoming Exams", value: summary.upcomingExams, icon: CalendarDays },
              { title: "Assignments", value: summary.pendingAssignments, icon: CalendarDays },
              { title: "Habits Completed", value: `${summary.completedHabits}/${summary.habits}`, icon: Flame },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-2xl border border-white/10 bg-[#11111e] p-5">
                  <Icon size={21} className="text-violet-400" />
                  <p className="mt-4 text-2xl font-bold">{item.value}</p>
                  <p className="mt-1 text-xs text-gray-500">{item.title}</p>
                </div>
              );
            })}
          </div>
        )}

        {briefing && (
          <section className="rounded-2xl border border-white/10 bg-[#11111e] p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-bold">Your AI Daily Plan</h2>
              <span className="text-xs text-gray-500">{date}</span>
            </div>
            <div className="whitespace-pre-wrap text-sm leading-7 text-gray-300">
              {briefing}
            </div>
          </section>
        )}

        {!briefing && !loading && (
          <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center">
            <Sunrise className="mx-auto text-violet-400" size={28} />
            <p className="mt-4 font-semibold">Your daily briefing is ready to generate.</p>
            <p className="mt-2 text-sm text-gray-500">
              Generate it whenever you want a fresh view of your day.
            </p>
          </div>
        )}
      </div>
    </WorkspaceShell>
  );
}
