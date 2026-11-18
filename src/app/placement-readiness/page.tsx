
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import WorkspaceShell from "@/components/WorkspaceShell";
import { supabase } from "@/lib/supabase";
import {
  Target,
  TrendingUp,
  RefreshCw,
  BriefcaseBusiness,
} from "lucide-react";

type Metric = {
  label: string;
  score: number;
  weight: number;
  detail: string;
};

export default function PlacementReadinessPage() {
  const router = useRouter();

  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [overall, setOverall] = useState(0);
  const [targetRole, setTargetRole] = useState("Not set");
  const [targetCompany, setTargetCompany] = useState("Not set");
  const [coverage, setCoverage] = useState(0);
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
        router.replace("/login");
        return;
      }

      const [
        problemResult,
        progressResult,
        skillsResult,
        pathsResult,
        resumeResult,
        interviewsResult,
        preferencesResult,
        goalsResult,
      ] = await Promise.all([
        supabase
          .from("coding_problems")
          .select("id")
          .eq("user_id", user.id),

        supabase
          .from("coding_progress")
          .select("problem_id, solved")
          .eq("user_id", user.id),

        supabase
          .from("skills")
          .select("name, proficiency")
          .eq("user_id", user.id),

        supabase
          .from("learning_paths")
          .select("id")
          .eq("user_id", user.id),

        supabase
          .from("resume_profiles")
          .select(
            "full_name, summary, education, skills, projects, experience, links"
          )
          .eq("user_id", user.id)
          .maybeSingle(),

        supabase
          .from("interview_sessions")
          .select("score")
          .eq("user_id", user.id),

        supabase
          .from("user_preferences")
          .select("target_role")
          .eq("user_id", user.id)
          .maybeSingle(),

        supabase
          .from("career_goals")
          .select("target_role, target_company")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1),
      ]);

      const results = [
        problemResult,
        progressResult,
        skillsResult,
        pathsResult,
        resumeResult,
        interviewsResult,
        preferencesResult,
        goalsResult,
      ];

      const failed = results.find((result) => result.error);

      if (failed?.error) {
        throw failed.error;
      }

      const problems = problemResult.data || [];
      const progress = progressResult.data || [];
      const skills = skillsResult.data || [];
      const paths = pathsResult.data || [];
      const resume = resumeResult.data;
      const interviews = interviewsResult.data || [];
      const goal = goalsResult.data?.[0];

      // DSA progress score
      const solved = progress.filter(
        (item) => item.solved
      ).length;

      const dsaScore = problems.length
        ? Math.min(
            100,
            (solved / Math.max(problems.length, 20)) * 100
          )
        : 0;

      // Average skill proficiency
      const skillsScore = skills.length
        ? skills.reduce((sum, item) => {
            const value = Number(item.proficiency);

            return (
              sum +
              (Number.isFinite(value)
                ? Math.max(0, Math.min(100, value))
                : 0)
            );
          }, 0) / skills.length
        : 0;

      // Project portfolio score
      const projectCount = Array.isArray(resume?.projects)
        ? resume.projects.length
        : typeof resume?.projects === "string" &&
            resume.projects.trim()
          ? resume.projects.split("\n").filter(Boolean).length
          : 0;

      const projectScore = Math.min(
        100,
        projectCount * 25 + paths.length * 10
      );

      // Resume completeness score
      const resumeFields = resume
        ? [
            resume.full_name,
            resume.summary,
            resume.education,
            resume.skills,
            resume.projects,
            resume.experience,
            resume.links,
          ].filter((value) =>
            Array.isArray(value)
              ? value.length > 0
              : Boolean(value)
          ).length
        : 0;

      const resumeScore = Math.round(
        (resumeFields / 7) * 100
      );

      // Interview practice score
      const scoredInterviews = interviews
        .map((item) => item.score)
        .filter(
          (value): value is number =>
            typeof value === "number" &&
            Number.isFinite(value)
        );

      const interviewScore = scoredInterviews.length
        ? scoredInterviews.reduce(
            (sum, value) => sum + value,
            0
          ) / scoredInterviews.length
        : 0;

      // Readiness metrics
      const calculated: Metric[] = [
        {
          label: "DSA Progress",
          score: Math.round(dsaScore),
          weight: 30,
          detail: `${solved} solved out of ${problems.length} recorded problems`,
        },
        {
          label: "Skills Coverage",
          score: Math.round(skillsScore),
          weight: 25,
          detail: `${skills.length} skills recorded`,
        },
        {
          label: "Project Portfolio",
          score: Math.round(projectScore),
          weight: 20,
          detail: `${projectCount} resume projects and ${paths.length} learning paths`,
        },
        {
          label: "Resume Readiness",
          score: resumeScore,
          weight: 15,
          detail: `${resumeFields} of 7 resume sections populated`,
        },
        {
          label: "Interview Practice",
          score: Math.round(interviewScore),
          weight: 10,
          detail: `${scoredInterviews.length} scored interview sessions`,
        },
      ];

      const score = Math.round(
        calculated.reduce(
          (sum, item) => sum + item.score * item.weight,
          0
        ) / 100
      );

      // Count categories that contain actual recorded information
      const populatedCategories = [
        problems.length > 0,
        skills.length > 0,
        projectCount > 0 || paths.length > 0,
        resumeFields > 0,
        scoredInterviews.length > 0,
      ].filter(Boolean).length;

      const dataCoverage = Math.round(
        (populatedCategories / calculated.length) * 100
      );

      setMetrics(calculated);
      setOverall(score);
      setCoverage(dataCoverage);

      setTargetRole(
        goal?.target_role ||
          preferencesResult.data?.target_role ||
          "Not set"
      );

      setTargetCompany(
        goal?.target_company || "Not set"
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to calculate placement readiness."
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadData]);

  const level =
    overall >= 80
      ? "Strong preparation"
      : overall >= 60
        ? "Good progress"
        : overall >= 40
          ? "Building foundation"
          : "Getting started";

  return (
    <WorkspaceShell>
      <div className="mx-auto max-w-6xl space-y-7 text-white">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-violet-400">
              <BriefcaseBusiness size={20} />
              <span className="text-sm font-semibold">
                CAREER INTELLIGENCE
              </span>
            </div>

            <h1 className="mt-2 text-3xl font-bold">
              Placement Readiness
            </h1>

            <p className="mt-2 text-sm text-gray-400">
              A progress indicator based on the information saved in CareerOS.
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
            Calculating readiness...
          </p>
        ) : (
          <>
            <section className="rounded-2xl border border-violet-500/20 bg-[#11111e] p-7">
              <div className="flex flex-wrap items-center justify-between gap-6">
                <div>
                  <p className="text-sm text-gray-400">
                    Placement Readiness Indicator
                  </p>

                  <p className="mt-2 text-5xl font-bold">
                    {overall}
                    <span className="text-xl text-gray-500">
                      /100
                    </span>
                  </p>

                  <p className="mt-2 text-sm text-violet-300">
                    {level}
                  </p>
                </div>

                <div className="flex h-28 w-28 items-center justify-center rounded-full border-8 border-violet-500/30 text-2xl font-bold">
                  {overall}%
                </div>
              </div>

              <div className="mt-6 h-3 rounded-full bg-white/10">
                <div
                  className="h-3 rounded-full bg-gradient-to-r from-violet-500 to-blue-500"
                  style={{ width: `${overall}%` }}
                />
              </div>

              <p className="mt-3 text-xs text-gray-500">
                Data coverage: {coverage}% of categories have recorded information.
                This is a self-tracking indicator, not a prediction of placement
                or hiring success.
              </p>
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#11111e] p-6">
              <h2 className="mb-5 font-bold">
                Readiness Breakdown
              </h2>

              <div className="space-y-6">
                {metrics.map((item) => (
                  <div key={item.label}>
                    <div className="flex flex-wrap justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">
                          {item.label}{" "}
                          <span className="text-xs text-gray-500">
                            ({item.weight}%)
                          </span>
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {item.detail}
                        </p>
                      </div>

                      <span className="text-sm font-bold text-violet-300">
                        {item.score}/100
                      </span>
                    </div>

                    <div className="mt-2 h-2 rounded-full bg-white/10">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-violet-500 to-blue-500"
                        style={{ width: `${item.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-[#11111e] p-5">
                <Target className="text-violet-400" />
                <p className="mt-3 text-xs text-gray-500">
                  Target Role
                </p>
                <p className="mt-1 font-semibold">
                  {targetRole}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#11111e] p-5">
                <TrendingUp className="text-blue-400" />
                <p className="mt-3 text-xs text-gray-500">
                  Target Company
                </p>
                <p className="mt-1 font-semibold">
                  {targetCompany}
                </p>
              </div>
            </section>

            <p className="text-xs leading-5 text-gray-600">
              Score weights are a product heuristic, not an employer-approved
              standard. Skill proficiency is expected on a 0–100 scale.
              Keep your resume, skills, projects, coding records and interview
              scores up to date for a more useful indicator.
            </p>
          </>
        )}
      </div>
    </WorkspaceShell>
  );
}
