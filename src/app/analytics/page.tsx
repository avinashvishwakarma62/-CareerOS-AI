
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import WorkspaceShell from "@/components/WorkspaceShell";
import {
  TrendingUp,
  CheckCircle2,
  BookOpen,
  Code,
  Target,
  Briefcase,
  Loader2,
} from "lucide-react";

type Stats = {
  tasks: number;
  completedTasks: number;
  subjects: number;
  assignments: number;
  completedAssignments: number;
  exams: number;
  problems: number;
  solvedProblems: number;
  habits: number;
  applications: number;
  selected: number;
};

const initialStats: Stats = {
  tasks: 0,
  completedTasks: 0,
  subjects: 0,
  assignments: 0,
  completedAssignments: 0,
  exams: 0,
  problems: 0,
  solvedProblems: 0,
  habits: 0,
  applications: 0,
  selected: 0,
};

type StatCardProps = {
  label: string;
  value: number | string;
  icon: typeof TrendingUp;
  description: string;
};

function StatCard({
  label,
  value,
  icon: Icon,
  description,
}: StatCardProps) {
  return (
    <article className="rounded-2xl border border-white/10 bg-[#11111e] p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">{label}</p>
        <Icon size={20} className="text-[#B58AFF]" />
      </div>

      <p className="mt-4 text-3xl font-bold">{value}</p>

      <p className="mt-2 text-xs text-gray-500">{description}</p>
    </article>
  );
}

function ProgressBar({
  label,
  completed,
  total,
}: {
  label: string;
  completed: number;
  total: number;
}) {
  const percent = total
    ? Math.min(100, Math.round((completed / total) * 100))
    : 0;

  return (
    <div className="space-y-2">
      <div className="flex justify-between gap-3 text-sm">
        <span className="text-gray-300">{label}</span>

        <span className="text-[#20C8FF]">
          {completed}/{total} · {percent}%
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#9855FF] to-[#20C8FF]"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const router = useRouter();

  const [stats, setStats] = useState<Stats>(initialStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

      const id = user.id;

      const [
        tasksResult,
        subjectsResult,
        assignmentsResult,
        examsResult,
        problemsResult,
        progressResult,
        habitsResult,
        applicationsResult,
      ] = await Promise.all([
        supabase.from("tasks").select("id,completed").eq("user_id", id),

        supabase.from("subjects").select("id").eq("user_id", id),

        supabase
          .from("assignments")
          .select("id,completed")
          .eq("user_id", id),

        supabase.from("exams").select("id").eq("user_id", id),

        supabase
          .from("coding_problems")
          .select("id")
          .eq("user_id", id),

        supabase
          .from("coding_progress")
          .select("problem_id,solved")
          .eq("user_id", id),

        supabase.from("habits").select("id").eq("user_id", id),

        supabase
          .from("internship_applications")
          .select("id,status")
          .eq("user_id", id),
      ]);

      const results = [
        tasksResult,
        subjectsResult,
        assignmentsResult,
        examsResult,
        problemsResult,
        progressResult,
        habitsResult,
        applicationsResult,
      ];

      const failed = results.find((result) => result.error);

      if (failed?.error) {
        throw new Error(
          `${failed.error.message}. Check that all module tables have been created.`
        );
      }

      const tasks = tasksResult.data ?? [];
      const assignments = assignmentsResult.data ?? [];
      const applications = applicationsResult.data ?? [];
      const progress = progressResult.data ?? [];

      setStats({
        tasks: tasks.length,
        completedTasks: tasks.filter((task) => task.completed).length,

        subjects: subjectsResult.data?.length ?? 0,

        assignments: assignments.length,
        completedAssignments: assignments.filter(
          (assignment) => assignment.completed
        ).length,

        exams: examsResult.data?.length ?? 0,

        problems: problemsResult.data?.length ?? 0,
        solvedProblems: progress.filter((problem) => problem.solved).length,

        habits: habitsResult.data?.length ?? 0,

        applications: applications.length,
        selected: applications.filter(
          (application) => application.status === "Selected"
        ).length,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load analytics."
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAnalytics();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadAnalytics]);

  return (
    <WorkspaceShell>
      <div className="space-y-7 text-white">
        <header>
          <div className="mb-3 flex items-center gap-2 text-[#20C8FF]">
            <TrendingUp size={20} />
            <span className="text-sm font-semibold">
              PERFORMANCE WORKSPACE
            </span>
          </div>

          <h1 className="text-3xl font-bold">Analytics</h1>

          <p className="mt-2 text-gray-400">
            Review your academic, coding and career progress.
          </p>
        </header>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-300"
          >
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-3 text-gray-400">
            <Loader2 className="animate-spin" />
            Loading your analytics...
          </div>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <StatCard
                label="Total Subjects"
                value={stats.subjects}
                icon={BookOpen}
                description="Subjects in your academic workspace"
              />

              <StatCard
                label="Exams Scheduled"
                value={stats.exams}
                icon={Target}
                description="Exams recorded"
              />

              <StatCard
                label="Daily Missions"
                value={stats.tasks}
                icon={CheckCircle2}
                description={`${stats.completedTasks} completed`}
              />

              <StatCard
                label="Coding Problems"
                value={stats.problems}
                icon={Code}
                description={`${stats.solvedProblems} solved`}
              />

              <StatCard
                label="Assignments"
                value={stats.assignments}
                icon={BookOpen}
                description={`${stats.completedAssignments} completed`}
              />

              <StatCard
                label="Internship Applications"
                value={stats.applications}
                icon={Briefcase}
                description={`${stats.selected} selected`}
              />
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#11111e] p-6">
              <h2 className="mb-6 text-lg font-bold">
                Progress overview
              </h2>

              <div className="space-y-6">
                <ProgressBar
                  label="Daily missions"
                  completed={stats.completedTasks}
                  total={stats.tasks}
                />

                <ProgressBar
                  label="Assignments"
                  completed={stats.completedAssignments}
                  total={stats.assignments}
                />

                <ProgressBar
                  label="Coding problems"
                  completed={stats.solvedProblems}
                  total={stats.problems}
                />
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#11111e] p-6">
              <h2 className="mb-4 text-lg font-bold">
                Career overview
              </h2>

              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#9855FF]/15 text-[#B58AFF]">
                  <Briefcase size={22} />
                </div>

                <div>
                  <p className="font-semibold">
                    {stats.selected} of {stats.applications} applications selected
                  </p>

                  <p className="mt-1 text-xs text-gray-400">
                    Based on the application statuses you have recorded.
                  </p>
                </div>
              </div>
            </section>

            <p className="text-xs text-gray-500">
              Analytics are calculated from your saved records. Habit streaks,
              historical trends and CGPA graphs are not included in this version.
            </p>
          </>
        )}
      </div>
    </WorkspaceShell>
  );
}
