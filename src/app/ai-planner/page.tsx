
"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import WorkspaceShell from "@/components/WorkspaceShell";
import {
  Sparkles,
  RefreshCw,
  CalendarDays,
  Clock,
  Target,
} from "lucide-react";

export default function AIPlannerPage() {
  const [plan, setPlan] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [date, setDate] = useState("");

  const initialLoadStarted = useRef(false);

  async function generatePlan() {
    if (generating) return;

    setGenerating(true);
    setError("");

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error("Your session has expired. Please log in again.");
      }

      const response = await fetch("/api/ai/planner", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to generate your plan.");
      }

      if (
        !result.success ||
        typeof result.plan !== "string" ||
        !result.plan.trim()
      ) {
        throw new Error("Invalid study plan received from AI.");
      }

      setPlan(result.plan);
      setDate(result.date || "");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while generating your plan."
      );
    } finally {
      setGenerating(false);
      setLoading(false);
    }
  }

  async function loadSavedPlan() {
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

      const today = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());

      const { data, error: queryError } = await supabase
        .from("daily_plans")
        .select("plan_content, plan_date")
        .eq("user_id", session.user.id)
        .eq("plan_date", today)
        .maybeSingle();

      if (queryError) {
        throw queryError;
      }

      if (data?.plan_content) {
        setPlan(data.plan_content);
        setDate(data.plan_date);
        setLoading(false);
        return;
      }

      // Generate a plan only when today's saved plan doesn't exist.
      await generatePlan();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load your saved plan."
      );
      setLoading(false);
    }
  }

  useEffect(() => {
    // Prevent duplicate initial requests in React Strict Mode.
    if (initialLoadStarted.current) return;

    initialLoadStarted.current = true;
    loadSavedPlan();
  }, []);

  const features = [
    {
      icon: CalendarDays,
      title: "Daily Planning",
      subtitle: "Personalized timetable",
    },
    {
      icon: Clock,
      title: "Smart Priorities",
      subtitle: "Assignments and exams",
    },
    {
      icon: Target,
      title: "Career Focus",
      subtitle: "Skills and placement goals",
    },
  ];

  return (
    <WorkspaceShell>
      <div className="mx-auto max-w-5xl space-y-6 text-white">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2 text-violet-400">
              <Sparkles size={20} />
              <span className="text-sm font-semibold">AI POWERED</span>
            </div>

            <h1 className="mt-2 text-3xl font-bold">
              AI Daily Planner
            </h1>

            <p className="mt-2 text-sm text-gray-400">
              Your personalized academic and career schedule.
            </p>
          </div>

          <button
            onClick={generatePlan}
            disabled={loading || generating}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-5 py-3 text-sm font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              size={17}
              className={generating ? "animate-spin" : ""}
            />
            {generating ? "Generating..." : "Generate New Plan"}
          </button>
        </div>

        {/* Feature cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          {features.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className="rounded-2xl border border-white/10 bg-[#11111e] p-5"
              >
                <Icon className="text-violet-400" size={23} />

                <h3 className="mt-4 font-semibold">
                  {item.title}
                </h3>

                <p className="mt-1 text-xs text-gray-500">
                  {item.subtitle}
                </p>
              </div>
            );
          })}
        </div>

        {/* Study plan */}
        <div className="rounded-2xl border border-violet-500/20 bg-[#11111e] p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">
                Your Study Plan
              </h2>

              <p className="mt-1 text-xs text-gray-500">
                {date || "Today's schedule"}
              </p>
            </div>

            <Sparkles className="text-violet-400" />
          </div>

          {loading || generating ? (
            <div className="flex items-center gap-3 py-12 text-sm text-gray-400">
              <RefreshCw className="animate-spin" size={20} />
              AI is preparing your personalized plan...
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
              <p className="text-sm text-red-300">{error}</p>

              <button
                onClick={generatePlan}
                disabled={generating}
                className="mt-3 text-sm text-violet-300 hover:text-violet-200 disabled:opacity-50"
              >
                Try again →
              </button>
            </div>
          ) : plan ? (
            <div className="whitespace-pre-wrap rounded-xl bg-black/20 p-5 text-sm leading-7 text-gray-300">
              {plan}
            </div>
          ) : (
            <div className="py-12 text-center">
              <p className="text-sm text-gray-400">
                No study plan available.
              </p>

              <button
                onClick={generatePlan}
                className="mt-4 rounded-xl bg-violet-600 px-5 py-2 text-sm font-semibold"
              >
                Generate My Plan
              </button>
            </div>
          )}
        </div>
      </div>
    </WorkspaceShell>
  );
}
