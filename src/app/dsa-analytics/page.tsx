
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import WorkspaceShell from "@/components/WorkspaceShell";
import { supabase } from "@/lib/supabase";
import {
  Code2,
  CheckCircle2,
  Target,
  RefreshCw,
} from "lucide-react";

type Problem = {
  id: string;
  title: string;
  topic: string;
  difficulty: string;
  platform: string;
};

type Progress = {
  problem_id: string;
  solved: boolean;
  solved_at: string | null;
};

export default function DsaAnalyticsPage() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Please log in again.");
      }

      const [problemResult, progressResult] = await Promise.all([
        supabase
          .from("coding_problems")
          .select("id, title, topic, difficulty, platform")
          .eq("user_id", user.id),

        supabase
          .from("coding_progress")
          .select("problem_id, solved, solved_at")
          .eq("user_id", user.id),
      ]);

      if (problemResult.error) throw problemResult.error;
      if (progressResult.error) throw progressResult.error;

      setProblems(problemResult.data || []);
      setProgress(progressResult.data || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load DSA analytics."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadData]);

  const progressById = useMemo(
    () =>
      new Map(
        progress.map((item) => [item.problem_id, item])
      ),
    [progress]
  );

  const solvedProblems = problems.filter(
    (problem) => progressById.get(problem.id)?.solved === true
  );

  const solvedCount = solvedProblems.length;
  const totalCount = problems.length;

  const completion = totalCount
    ? Math.round((solvedCount / totalCount) * 100)
    : 0;

  const difficultyStats = ["Easy", "Medium", "Hard"].map(
    (difficulty) => {
      const matching = problems.filter(
        (problem) =>
          problem.difficulty?.toLowerCase() ===
          difficulty.toLowerCase()
      );

      const solved = matching.filter(
        (problem) => progressById.get(problem.id)?.solved === true
      ).length;

      return {
        difficulty,
        total: matching.length,
        solved,
      };
    }
  );

  const topicStats = useMemo(() => {
    const topicNames = Array.from(
      new Set(
        problems
          .map((problem) => problem.topic)
          .filter(Boolean)
      )
    );

    return topicNames
      .map((topic) => {
        const matching = problems.filter(
          (problem) => problem.topic === topic
        );

        const solved = matching.filter(
          (problem) => progressById.get(problem.id)?.solved === true
        ).length;

        return {
          topic,
          total: matching.length,
          solved,
          rate: matching.length
            ? Math.round((solved / matching.length) * 100)
            : 0,
        };
      })
      .sort((a, b) => b.solved - a.solved);
  }, [problems, progressById]);

  const platformStats = useMemo(() => {
    const platformNames = Array.from(
      new Set(
        problems
          .map((problem) => problem.platform)
          .filter(Boolean)
      )
    );

    return platformNames.map((platform) => ({
      platform,
      count: problems.filter(
        (problem) => problem.platform === platform
      ).length,
    }));
  }, [problems]);

  const recentSolved = useMemo(
    () =>
      solvedProblems
        .filter((problem) => {
          const solvedAt = progressById.get(problem.id)?.solved_at;
          return Boolean(solvedAt);
        })
        .sort((a, b) => {
          const dateA = progressById.get(a.id)?.solved_at || "";
          const dateB = progressById.get(b.id)?.solved_at || "";

          return dateB.localeCompare(dateA);
        })
        .slice(0, 8),
    [solvedProblems, progressById]
  );

  return (
    <WorkspaceShell>
      <div className="mx-auto max-w-6xl space-y-7 text-white">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-violet-400">
              <Code2 size={20} />
              <span className="text-sm font-semibold">
                CODING INTELLIGENCE
              </span>
            </div>

            <h1 className="mt-2 text-3xl font-bold">
              DSA Analytics
            </h1>

            <p className="mt-2 text-sm text-gray-400">
              Track problem-solving progress and identify your strong topics.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadData()}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm hover:bg-white/5 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </header>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <p className="py-12 text-center text-sm text-gray-500">
            Loading DSA analytics...
          </p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: "Problems Added",
                  value: totalCount,
                  icon: Target,
                },
                {
                  label: "Problems Solved",
                  value: solvedCount,
                  icon: CheckCircle2,
                },
                {
                  label: "Remaining",
                  value: totalCount - solvedCount,
                  icon: Code2,
                },
                {
                  label: "Completion",
                  value: `${completion}%`,
                  icon: CheckCircle2,
                },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-white/10 bg-[#11111e] p-5"
                  >
                    <Icon size={22} className="text-violet-400" />

                    <p className="mt-4 text-3xl font-bold">
                      {item.value}
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      {item.label}
                    </p>
                  </div>
                );
              })}
            </div>

            <section className="rounded-2xl border border-white/10 bg-[#11111e] p-6">
              <h2 className="font-bold">Overall Progress</h2>

              <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500"
                  style={{ width: `${completion}%` }}
                />
              </div>

              <p className="mt-2 text-xs text-gray-500">
                {solvedCount} out of {totalCount} recorded problems marked solved.
              </p>
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#11111e] p-6">
              <h2 className="mb-5 font-bold">
                Difficulty Breakdown
              </h2>

              <div className="grid gap-4 sm:grid-cols-3">
                {difficultyStats.map((item) => (
                  <div
                    key={item.difficulty}
                    className="rounded-xl border border-white/10 p-4"
                  >
                    <p className="font-semibold">
                      {item.difficulty}
                    </p>

                    <p className="mt-3 text-2xl font-bold">
                      {item.solved}/{item.total}
                    </p>

                    <p className="text-xs text-gray-500">
                      Solved / Added
                    </p>

                    <div className="mt-3 h-2 rounded-full bg-white/10">
                      <div
                        className="h-2 rounded-full bg-violet-500"
                        style={{
                          width: `${
                            item.total
                              ? (item.solved / item.total) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#11111e] p-6">
              <h2 className="mb-5 font-bold">
                Topic-wise Performance
              </h2>

              {topicStats.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No topic data available yet.
                </p>
              ) : (
                <div className="space-y-5">
                  {topicStats.map((item) => (
                    <div key={item.topic}>
                      <div className="mb-2 flex justify-between gap-3 text-sm">
                        <span>{item.topic}</span>

                        <span className="text-violet-300">
                          {item.solved}/{item.total} · {item.rate}%
                        </span>
                      </div>

                      <div className="h-2 rounded-full bg-white/10">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-violet-500 to-blue-500"
                          style={{ width: `${item.rate}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#11111e] p-6">
              <h2 className="mb-4 font-bold">
                Platform Breakdown
              </h2>

              {platformStats.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No platform data available.
                </p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {platformStats.map((item) => (
                    <div
                      key={item.platform}
                      className="rounded-xl border border-white/10 px-4 py-3"
                    >
                      <p className="text-sm font-semibold">
                        {item.platform}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        {item.count} problems
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#11111e] p-6">
              <h2 className="mb-4 font-bold">
                Recently Solved
              </h2>

              {recentSolved.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No solved problems with a recorded completion date yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {recentSolved.map((problem) => {
                    const solvedAt =
                      progressById.get(problem.id)?.solved_at;

                    return (
                      <div
                        key={problem.id}
                        className="flex flex-wrap justify-between gap-2 border-b border-white/5 pb-3"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {problem.title}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            {problem.topic} · {problem.difficulty}
                          </p>
                        </div>

                        <span className="text-xs text-emerald-400">
                          {solvedAt
                            ? new Date(solvedAt).toLocaleDateString()
                            : ""}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </WorkspaceShell>
  );
}
