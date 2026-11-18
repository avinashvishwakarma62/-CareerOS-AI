
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import WorkspaceShell from "@/components/WorkspaceShell";
import { supabase } from "@/lib/supabase";
import {
  Calculator,
  Plus,
  Trash2,
  RefreshCw,
  Target,
  Loader2,
} from "lucide-react";

type Result = {
  id: string;
  semester: number;
  subject_name: string;
  credits: number;
  grade_point: number;
};

export default function CgpaCalculatorPage() {
  const router = useRouter();

  const [records, setRecords] = useState<Result[]>([]);
  const [semester, setSemester] = useState("1");
  const [subject, setSubject] = useState("");
  const [credits, setCredits] = useState("4");
  const [gradePoint, setGradePoint] = useState("8");
  const [target, setTarget] = useState("9");
  const [futureCredits, setFutureCredits] = useState("20");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadRecords = useCallback(async () => {
    setLoading(true);

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

      const { data, error: fetchError } = await supabase
        .from("academic_results")
        .select("id, semester, subject_name, credits, grade_point")
        .eq("user_id", user.id)
        .order("semester", { ascending: true });

      if (fetchError) throw fetchError;

      setRecords(data ?? []);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load academic results."
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadRecords();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadRecords]);

  const semesterStats = useMemo(() => {
    const groups: Record<number, Result[]> = {};

    records.forEach((item) => {
      if (!groups[item.semester]) {
        groups[item.semester] = [];
      }

      groups[item.semester].push(item);
    });

    return Object.entries(groups)
      .map(([key, items]) => {
        const totalCredits = items.reduce(
          (sum, item) => sum + Number(item.credits),
          0
        );

        const points = items.reduce(
          (sum, item) =>
            sum +
            Number(item.credits) * Number(item.grade_point),
          0
        );

        return {
          semester: Number(key),
          subjects: items.length,
          credits: totalCredits,
          sgpa: totalCredits ? points / totalCredits : 0,
        };
      })
      .sort((a, b) => a.semester - b.semester);
  }, [records]);

  const totalCredits = useMemo(
    () =>
      records.reduce(
        (sum, item) => sum + Number(item.credits),
        0
      ),
    [records]
  );

  const totalPoints = useMemo(
    () =>
      records.reduce(
        (sum, item) =>
          sum +
          Number(item.credits) * Number(item.grade_point),
        0
      ),
    [records]
  );

  const cgpa = totalCredits ? totalPoints / totalCredits : 0;

  const targetValue = Number(target);
  const nextCredits = Number(futureCredits);

  const requiredSgpa =
    nextCredits > 0
      ? (targetValue * (totalCredits + nextCredits) - totalPoints) /
        nextCredits
      : null;

  async function addResult(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (saving) return;

    setError("");

    const trimmedSubject = subject.trim();
    const creditValue = Number(credits);
    const gradeValue = Number(gradePoint);
    const semesterValue = Number(semester);

    if (
      !trimmedSubject ||
      trimmedSubject.length > 100 ||
      !Number.isInteger(semesterValue) ||
      semesterValue < 1 ||
      semesterValue > 20 ||
      !Number.isFinite(creditValue) ||
      creditValue <= 0 ||
      creditValue > 100 ||
      !Number.isFinite(gradeValue) ||
      gradeValue < 0 ||
      gradeValue > 10
    ) {
      setError(
        "Please enter valid subject, semester, credits and grade point."
      );
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        router.replace("/login");
        throw new Error("Please log in again.");
      }

      const { error: insertError } = await supabase
        .from("academic_results")
        .insert({
          user_id: user.id,
          semester: semesterValue,
          subject_name: trimmedSubject,
          credits: creditValue,
          grade_point: gradeValue,
        });

      if (insertError) throw insertError;

      setSubject("");
      await loadRecords();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save academic result."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteResult(id: string) {
    if (deletingId) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this subject result?"
    );

    if (!confirmed) return;

    setDeletingId(id);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        router.replace("/login");
        throw new Error("Please log in again.");
      }

      const { error: deleteError } = await supabase
        .from("academic_results")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (deleteError) throw deleteError;

      setRecords((previous) =>
        previous.filter((item) => item.id !== id)
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete subject result."
      );
    } finally {
      setDeletingId(null);
    }
  }

  const validTarget =
    Number.isFinite(targetValue) &&
    targetValue > 0 &&
    targetValue <= 10;

  const validFutureCredits =
    Number.isFinite(nextCredits) &&
    nextCredits > 0 &&
    nextCredits <= 200;

  return (
    <WorkspaceShell>
      <div className="mx-auto max-w-6xl space-y-7 text-white">
        <header>
          <div className="flex items-center gap-2 text-violet-400">
            <Calculator size={20} />
            <span className="text-sm font-semibold">
              ACADEMIC INTELLIGENCE
            </span>
          </div>

          <h1 className="mt-2 text-3xl font-bold">
            CGPA &amp; SGPA Calculator
          </h1>

          <p className="mt-2 text-sm text-gray-400">
            Track semester performance and calculate your cumulative CGPA.
          </p>
        </header>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300"
          >
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-violet-500/20 bg-[#11111e] p-5">
            <Calculator className="text-violet-400" />
            <p className="mt-4 text-3xl font-bold">
              {cgpa.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500">
              Calculated CGPA
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#11111e] p-5">
            <Target className="text-blue-400" />
            <p className="mt-4 text-3xl font-bold">
              {totalCredits}
            </p>
            <p className="text-xs text-gray-500">
              Total credits recorded
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#11111e] p-5">
            <RefreshCw className="text-emerald-400" />
            <p className="mt-4 text-3xl font-bold">
              {semesterStats.length}
            </p>
            <p className="text-xs text-gray-500">
              Semesters recorded
            </p>
          </div>
        </div>

        <form
          onSubmit={addResult}
          className="space-y-4 rounded-2xl border border-white/10 bg-[#11111e] p-6"
        >
          <h2 className="font-bold">Add Subject Result</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject name"
              maxLength={100}
              required
              className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm"
            />

            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="rounded-xl border border-white/10 bg-[#181827] px-4 py-3 text-sm"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(
                (number) => (
                  <option key={number} value={number}>
                    Semester {number}
                  </option>
                )
              )}
            </select>

            <input
              type="number"
              value={credits}
              onChange={(e) => setCredits(e.target.value)}
              min="0.1"
              max="100"
              step="0.1"
              required
              placeholder="Credits"
              className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm"
            />

            <input
              type="number"
              value={gradePoint}
              onChange={(e) => setGradePoint(e.target.value)}
              min="0"
              max="10"
              step="0.01"
              required
              placeholder="Grade point (0–10)"
              className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 py-3 text-sm font-semibold disabled:opacity-50"
          >
            {saving ? (
              <Loader2 size={17} className="animate-spin" />
            ) : (
              <Plus size={17} />
            )}
            {saving ? "Saving..." : "Add Result"}
          </button>
        </form>

        <section className="rounded-2xl border border-white/10 bg-[#11111e] p-6">
          <h2 className="mb-5 font-bold">Semester Performance</h2>

          {loading ? (
            <p className="text-sm text-gray-500">
              Loading results...
            </p>
          ) : semesterStats.length === 0 ? (
            <p className="text-sm text-gray-500">
              No results added yet. Add your first subject above.
            </p>
          ) : (
            <div className="space-y-5">
              {semesterStats.map((item) => (
                <div key={item.semester}>
                  <div className="flex justify-between text-sm">
                    <span>Semester {item.semester}</span>
                    <span className="font-bold text-violet-300">
                      SGPA {item.sgpa.toFixed(2)}
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-gray-500">
                    {item.subjects} subjects · {item.credits} credits
                  </p>

                  <div className="mt-2 h-2 rounded-full bg-white/10">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-violet-500 to-blue-500"
                      style={{
                        width: `${Math.min(item.sgpa * 10, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#11111e] p-6">
          <h2 className="mb-4 font-bold">
            Target CGPA Calculator
          </h2>

          <p className="mb-4 text-sm text-gray-400">
            Estimate the SGPA needed in your next semester to reach a target CGPA.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs text-gray-400">
              Target CGPA
              <input
                type="number"
                min="0.01"
                max="10"
                step="0.01"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white"
              />
            </label>

            <label className="text-xs text-gray-400">
              Expected next semester credits
              <input
                type="number"
                min="0.1"
                max="200"
                step="0.1"
                value={futureCredits}
                onChange={(e) => setFutureCredits(e.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white"
              />
            </label>
          </div>

          <div className="mt-5 rounded-xl bg-violet-500/10 p-4">
            {!validTarget || !validFutureCredits ? (
              <p className="text-sm text-gray-400">
                Enter a valid target CGPA (0–10) and future credits.
              </p>
            ) : totalCredits === 0 ? (
              <p className="text-sm text-gray-400">
                Add existing semester results first.
              </p>
            ) : requiredSgpa === null ||
              !Number.isFinite(requiredSgpa) ? (
              <p className="text-sm text-gray-400">
                Unable to calculate the required SGPA.
              </p>
            ) : requiredSgpa <= 0 ? (
              <p className="text-sm text-emerald-300">
                Your current CGPA is already at or above this target.
              </p>
            ) : requiredSgpa > 10 ? (
              <p className="text-sm text-amber-300">
                This target is not achievable with the selected future credits
                and a maximum grade point of 10.
              </p>
            ) : (
              <>
                <p className="text-xs text-violet-300">
                  Required next semester SGPA (estimate)
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {requiredSgpa.toFixed(2)}
                </p>
              </>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#11111e] p-6">
          <h2 className="mb-4 font-bold">All Subject Records</h2>

          {loading ? (
            <p className="text-sm text-gray-500">
              Loading records...
            </p>
          ) : records.length === 0 ? (
            <p className="text-sm text-gray-500">
              No subject records available.
            </p>
          ) : (
            <div className="space-y-2">
              {records.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 p-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {item.subject_name}
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      Semester {item.semester} · {item.credits} credits · GP{" "}
                      {item.grade_point}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => void deleteResult(item.id)}
                    disabled={deletingId === item.id}
                    aria-label="Delete result"
                    className="text-gray-500 hover:text-red-400 disabled:opacity-50"
                  >
                    {deletingId === item.id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </WorkspaceShell>
  );
}
