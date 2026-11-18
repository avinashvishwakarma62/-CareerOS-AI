
"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import WorkspaceShell from "@/components/WorkspaceShell";
import { supabase } from "@/lib/supabase";
import {
  BriefcaseBusiness,
  Sparkles,
  Save,
  History,
} from "lucide-react";

type Session = {
  id: string;
  company_name: string;
  role: string;
  interview_type: string;
  questions: string;
  answers: string;
  feedback: string;
  score: number | null;
  created_at: string;
};

export default function InterviewPrepPage() {
  const router = useRouter();

  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [type, setType] = useState("Technical");
  const [skills, setSkills] = useState("");
  const [questions, setQuestions] = useState("");
  const [answers, setAnswers] = useState("");
  const [feedback, setFeedback] = useState("");
  const [score, setScore] = useState("");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);

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
        .from("interview_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (fetchError) throw fetchError;

      setSessions(data || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load interview history."
      );
    } finally {
      setHistoryLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadHistory();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadHistory]);

  async function generateQuestions(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setQuestions("");
    setAnswers("");
    setFeedback("");
    setScore("");
    setActiveId(null);
    setLoading(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error("Please log in again.");
      }

      const response = await fetch("/api/ai/interview-prep", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          company: company.trim(),
          role: role.trim(),
          type,
          skills: skills.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Unable to generate questions."
        );
      }

      if (!result.questions || typeof result.questions !== "string") {
        throw new Error("Invalid response received from AI.");
      }

      setQuestions(result.questions);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Generation failed."
      );
    } finally {
      setLoading(false);
    }
  }

  async function saveSession() {
    if (!questions.trim()) {
      setError("Generate questions before saving a session.");
      return;
    }

    const scoreValue =
      score.trim() === "" ? null : Number(score);

    if (
      scoreValue !== null &&
      (!Number.isInteger(scoreValue) ||
        scoreValue < 0 ||
        scoreValue > 100)
    ) {
      setError("Score must be a whole number between 0 and 100.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Please log in again.");
      }

      const payload = {
        user_id: user.id,
        company_name: company.trim(),
        role: role.trim(),
        interview_type: type,
        questions,
        answers: answers.trim(),
        feedback: feedback.trim(),
        score: scoreValue,
      };

      const { data, error: saveError } = await supabase
        .from("interview_sessions")
        .insert(payload)
        .select()
        .single();

      if (saveError) throw saveError;

      setActiveId(data.id);
      await loadHistory();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save practice session."
      );
    } finally {
      setSaving(false);
    }
  }

  function openSession(item: Session) {
    setActiveId(item.id);
    setCompany(item.company_name);
    setRole(item.role);
    setType(item.interview_type);
    setQuestions(item.questions);
    setAnswers(item.answers || "");
    setFeedback(item.feedback || "");
    setScore(item.score === null ? "" : String(item.score));

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <WorkspaceShell>
      <div className="mx-auto max-w-6xl space-y-7 text-white">
        <header>
          <div className="flex items-center gap-2 text-violet-400">
            <BriefcaseBusiness size={20} />
            <span className="text-sm font-semibold">
              PLACEMENT PREPARATION
            </span>
          </div>

          <h1 className="mt-2 text-3xl font-bold">
            Company Interview Prep
          </h1>

          <p className="mt-2 text-sm text-gray-400">
            Practice role-based technical, HR and behavioral interviews.
          </p>
        </header>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <form
          onSubmit={generateQuestions}
          className="space-y-4 rounded-2xl border border-white/10 bg-[#11111e] p-6"
        >
          <h2 className="font-bold">
            Create Interview Practice Set
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Company name"
              maxLength={120}
              required
              className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm"
            />

            <input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Target role (e.g. Software Engineer)"
              maxLength={120}
              required
              className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm"
            />

            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="rounded-xl border border-white/10 bg-[#181827] px-4 py-3 text-sm"
            >
              <option>Technical</option>
              <option>HR</option>
              <option>Behavioral</option>
              <option>Mixed</option>
            </select>

            <input
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="Your skills (C++, DSA, React...)"
              maxLength={500}
              className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 py-3 text-sm font-semibold disabled:opacity-50"
          >
            <Sparkles size={17} />
            {loading
              ? "Preparing your questions..."
              : "Generate Interview Questions"}
          </button>
        </form>

        {questions && (
          <section className="space-y-4 rounded-2xl border border-violet-500/20 bg-[#11111e] p-6">
            <div className="flex items-center gap-2">
              <Sparkles size={19} className="text-violet-400" />
              <h2 className="font-bold">
                Your Interview Question Set
              </h2>
            </div>

            <div className="whitespace-pre-wrap rounded-xl bg-black/20 p-5 text-sm leading-7 text-gray-300">
              {questions}
            </div>

            <label className="block text-xs text-gray-400">
              Your practice answers

              <textarea
                value={answers}
                onChange={(e) => setAnswers(e.target.value)}
                rows={7}
                maxLength={15000}
                placeholder="Write your answers here..."
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white"
              />
            </label>

            <label className="block text-xs text-gray-400">
              Your own feedback / improvement notes

              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={3}
                maxLength={5000}
                placeholder="What went well? What should you improve?"
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white"
              />
            </label>

            <label className="block max-w-xs text-xs text-gray-400">
              Practice score (optional, 0–100)

              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                placeholder="Enter your self-assessed score"
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white"
              />
            </label>

            <button
              type="button"
              onClick={() => void saveSession()}
              disabled={saving || Boolean(activeId)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 py-3 text-sm font-semibold text-violet-200 disabled:opacity-50"
            >
              <Save size={17} />
              {activeId
                ? "Session Saved"
                : saving
                  ? "Saving..."
                  : "Save Practice Session"}
            </button>
          </section>
        )}

        <section className="rounded-2xl border border-white/10 bg-[#11111e] p-6">
          <div className="mb-4 flex items-center gap-2">
            <History size={18} className="text-violet-400" />
            <h2 className="font-bold">
              Previous Practice Sessions
            </h2>
          </div>

          {historyLoading ? (
            <p className="text-sm text-gray-500">
              Loading sessions...
            </p>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-gray-500">
              No saved sessions yet.
            </p>
          ) : (
            <div className="space-y-3">
              {sessions.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => openSession(item)}
                  className="w-full rounded-xl border border-white/10 p-4 text-left hover:border-violet-500/40"
                >
                  <div className="flex flex-wrap justify-between gap-2">
                    <span className="text-sm font-semibold">
                      {item.company_name} · {item.role}
                    </span>

                    <span className="text-xs text-violet-300">
                      {item.interview_type}
                    </span>
                  </div>

                  <p className="mt-2 text-xs text-gray-500">
                    {new Date(item.created_at).toLocaleString()}
                    {item.score !== null
                      ? ` · Score: ${item.score}/100`
                      : ""}
                  </p>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </WorkspaceShell>
  );
}
