
"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import WorkspaceShell from "@/components/WorkspaceShell";
import {
  BookOpen,
  Plus,
  Trash2,
  GraduationCap,
  Loader2,
  X,
  CalendarDays,
  ClipboardList,
  CheckCircle2,
  Circle,
  Clock,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

type Subject = {
  id: string;
  name: string;
  code: string | null;
  semester: number | null;
  credits: number | null;
};

type Assignment = {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  completed: boolean;
  subject_id: string | null;
};

type Exam = {
  id: string;
  title: string;
  exam_date: string;
  exam_type: string | null;
  subject_id: string | null;
};

type Tab = "subjects" | "assignments" | "exams";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-[#080811] p-3 text-sm text-white outline-none focus:border-[#9855FF]";

export default function AcademicsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);

  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [tab, setTab] = useState<Tab>("subjects");
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [semester, setSemester] = useState("3");
  const [credits, setCredits] = useState("4");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [subjectId, setSubjectId] = useState("");

  const [examType, setExamType] = useState("Sessional");
  const [examDate, setExamDate] = useState("");

  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);
      setError("");

      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (!active) return;

      if (authError || !authData.user) {
        window.location.replace("/login");
        return;
      }

      const id = authData.user.id;
      setUserId(id);

      const [subjectResult, assignmentResult, examResult] =
        await Promise.all([
          supabase
            .from("subjects")
            .select("id, name, code, semester, credits")
            .eq("user_id", id)
            .order("created_at", { ascending: false }),

          supabase
            .from("assignments")
            .select(
              "id, title, description, due_date, completed, subject_id"
            )
            .eq("user_id", id)
            .order("due_date", { ascending: true }),

          supabase
            .from("exams")
            .select("id, title, exam_date, exam_type, subject_id")
            .eq("user_id", id)
            .order("exam_date", { ascending: true }),
        ]);

      if (!active) return;

      if (subjectResult.error) {
        setError(subjectResult.error.message);
      } else {
        setSubjects(subjectResult.data || []);
      }

      if (assignmentResult.error) {
        setError(assignmentResult.error.message);
      } else {
        setAssignments(assignmentResult.data || []);
      }

      if (examResult.error) {
        setError(examResult.error.message);
      } else {
        setExams(examResult.data || []);
      }

      setLoading(false);
    }

    loadData();

    return () => {
      active = false;
    };
  }, []);

  function resetForm() {
    setName("");
    setCode("");
    setSemester("3");
    setCredits("4");
    setTitle("");
    setDescription("");
    setDueDate("");
    setSubjectId("");
    setExamType("Sessional");
    setExamDate("");
    setShowForm(false);
  }

  async function addSubject(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!userId || !name.trim()) return;

    setSaving(true);
    setError("");

    const { data, error: insertError } = await supabase
      .from("subjects")
      .insert({
        user_id: userId,
        name: name.trim(),
        code: code.trim() || null,
        semester: Number(semester),
        credits: Number(credits),
      })
      .select("id, name, code, semester, credits")
      .single();

    if (insertError) {
      setError(insertError.message);
    } else if (data) {
      setSubjects((old) => [data, ...old]);
      resetForm();
    }

    setSaving(false);
  }

  async function addAssignment(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!userId || !title.trim()) return;

    setSaving(true);
    setError("");

    const { data, error: insertError } = await supabase
      .from("assignments")
      .insert({
        user_id: userId,
        title: title.trim(),
        description: description.trim() || null,
        due_date: dueDate || null,
        subject_id: subjectId || null,
        completed: false,
      })
      .select(
        "id, title, description, due_date, completed, subject_id"
      )
      .single();

    if (insertError) {
      setError(insertError.message);
    } else if (data) {
      setAssignments((old) =>
        [...old, data].sort((a, b) =>
          (a.due_date || "9999-12-31").localeCompare(
            b.due_date || "9999-12-31"
          )
        )
      );
      resetForm();
    }

    setSaving(false);
  }

  async function addExam(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!userId || !title.trim() || !examDate) return;

    setSaving(true);
    setError("");

    const { data, error: insertError } = await supabase
      .from("exams")
      .insert({
        user_id: userId,
        title: title.trim(),
        exam_date: examDate,
        exam_type: examType,
        subject_id: subjectId || null,
      })
      .select("id, title, exam_date, exam_type, subject_id")
      .single();

    if (insertError) {
      setError(insertError.message);
    } else if (data) {
      setExams((old) =>
        [...old, data].sort((a, b) =>
          a.exam_date.localeCompare(b.exam_date)
        )
      );
      resetForm();
    }

    setSaving(false);
  }

  async function deleteItem(
    table: "subjects" | "assignments" | "exams",
    id: string
  ) {
    if (!window.confirm("Delete this item permanently?")) return;

    const { error: deleteError } = await supabase
      .from(table)
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    if (table === "subjects") {
      setSubjects((old) => old.filter((item) => item.id !== id));
    }

    if (table === "assignments") {
      setAssignments((old) => old.filter((item) => item.id !== id));
    }

    if (table === "exams") {
      setExams((old) => old.filter((item) => item.id !== id));
    }
  }

  async function toggleAssignment(item: Assignment) {
    const nextStatus = !item.completed;

    setAssignments((old) =>
      old.map((a) =>
        a.id === item.id ? { ...a, completed: nextStatus } : a
      )
    );

    const { error: updateError } = await supabase
      .from("assignments")
      .update({ completed: nextStatus })
      .eq("id", item.id)
      .eq("user_id", userId);

    if (updateError) {
      setAssignments((old) =>
        old.map((a) =>
          a.id === item.id ? { ...a, completed: item.completed } : a
        )
      );

      setError(updateError.message);
    }
  }

  const subjectName = (id: string | null) =>
    subjects.find((s) => s.id === id)?.name || "General";

  const completedAssignments =
    assignments.filter((a) => a.completed).length;

  const today = new Date().toLocaleDateString("en-CA");

  return (
    <WorkspaceShell>
      <div className="text-white">
        <Link
          href="/"
          className="mb-7 inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white"
        >
          <ArrowLeft size={17} />
          Dashboard
        </Link>

        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm text-[#20C8FF]">
              <GraduationCap size={19} />
              ACADEMIC WORKSPACE
            </div>

            <h1 className="text-3xl font-bold md:text-4xl">
              Academics
            </h1>

            <p className="mt-2 text-sm text-gray-400">
              Manage subjects, assignments and examination schedules.
            </p>
          </div>

          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#9855FF] to-[#426BFF] px-5 py-3 text-sm font-semibold"
          >
            <Plus size={18} />
            Add{" "}
            {tab === "subjects"
              ? "Subject"
              : tab === "assignments"
                ? "Assignment"
                : "Exam"}
          </button>
        </header>

        {error && (
          <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            {
              label: "Total Subjects",
              value: subjects.length,
              icon: BookOpen,
            },
            {
              label: "Assignments Completed",
              value: `${completedAssignments}/${assignments.length}`,
              icon: ClipboardList,
            },
            {
              label: "Scheduled Exams",
              value: exams.length,
              icon: CalendarDays,
            },
          ].map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.label}
                className="rounded-2xl border border-white/10 bg-[#11111e] p-5"
              >
                <div className="flex items-center justify-between text-gray-400">
                  <span className="text-sm">{card.label}</span>
                  <Icon size={20} className="text-[#B58AFF]" />
                </div>

                <h2 className="mt-4 text-3xl font-bold">
                  {card.value}
                </h2>
              </div>
            );
          })}
        </div>

        <div className="mb-6 flex flex-wrap gap-2 border-b border-white/10 pb-3">
          {(
            [
              ["subjects", "Subjects", BookOpen],
              ["assignments", "Assignments", ClipboardList],
              ["exams", "Exam Schedule", CalendarDays],
            ] as const
          ).map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => {
                setTab(key);
                resetForm();
              }}
              className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${
                tab === key
                  ? "bg-[#9855FF]/20 text-[#C6A6FF]"
                  : "text-gray-400 hover:bg-white/5"
              }`}
            >
              <Icon size={17} />
              {label}
            </button>
          ))}
        </div>

        {showForm && (
          <div className="mb-7 rounded-2xl border border-[#9855FF]/30 bg-[#11111e] p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold">
                Add{" "}
                {tab === "subjects"
                  ? "Subject"
                  : tab === "assignments"
                    ? "Assignment"
                    : "Exam"}
              </h2>

              <button
                onClick={resetForm}
                aria-label="Close form"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            {tab === "subjects" && (
              <form
                onSubmit={addSubject}
                className="grid gap-4 sm:grid-cols-2"
              >
                <input
                  required
                  className={inputClass}
                  placeholder="Subject name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />

                <input
                  className={inputClass}
                  placeholder="Subject code (optional)"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />

                <select
                  className={inputClass}
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <option key={n} value={n}>
                      Semester {n}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  min="0"
                  max="20"
                  className={inputClass}
                  value={credits}
                  onChange={(e) => setCredits(e.target.value)}
                  placeholder="Credits"
                />

                <button
                  disabled={saving}
                  className="rounded-xl bg-[#9855FF] p-3 font-semibold disabled:opacity-50 sm:col-span-2"
                >
                  {saving ? "Saving..." : "Save Subject"}
                </button>
              </form>
            )}

            {tab === "assignments" && (
              <form
                onSubmit={addAssignment}
                className="grid gap-4 sm:grid-cols-2"
              >
                <input
                  required
                  className={inputClass}
                  placeholder="Assignment title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />

                <select
                  className={inputClass}
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                >
                  <option value="">Select subject (optional)</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>

                <input
                  className={inputClass}
                  placeholder="Description (optional)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />

                <input
                  type="date"
                  min={today}
                  className={inputClass}
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />

                <button
                  disabled={saving}
                  className="rounded-xl bg-[#9855FF] p-3 font-semibold disabled:opacity-50 sm:col-span-2"
                >
                  {saving ? "Saving..." : "Save Assignment"}
                </button>
              </form>
            )}

            {tab === "exams" && (
              <form
                onSubmit={addExam}
                className="grid gap-4 sm:grid-cols-2"
              >
                <input
                  required
                  className={inputClass}
                  placeholder="Exam name"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />

                <select
                  className={inputClass}
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                >
                  <option value="">Select subject (optional)</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>

                <select
                  className={inputClass}
                  value={examType}
                  onChange={(e) => setExamType(e.target.value)}
                >
                  <option>Sessional</option>
                  <option>Mid Semester</option>
                  <option>End Semester</option>
                  <option>Practical</option>
                  <option>Viva</option>
                  <option>Other</option>
                </select>

                <input
                  required
                  type="date"
                  min={today}
                  className={inputClass}
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                />

                <button
                  disabled={saving}
                  className="rounded-xl bg-[#9855FF] p-3 font-semibold disabled:opacity-50 sm:col-span-2"
                >
                  {saving ? "Saving..." : "Save Exam"}
                </button>
              </form>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-3 py-12 text-gray-400">
            <Loader2 className="animate-spin" />
            Loading academic data...
          </div>
        ) : (
          <section className="space-y-3">
            {tab === "subjects" &&
              (subjects.length === 0 ? (
                <EmptyState text="No subjects added yet." />
              ) : (
                subjects.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-4 rounded-2xl border border-white/10 bg-[#11111e] p-5"
                  >
                    <BookOpen className="shrink-0 text-[#B58AFF]" />

                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold">{s.name}</h3>
                      <p className="mt-1 text-xs text-gray-500">
                        {s.code || "No code"} · Semester {s.semester} ·{" "}
                        {s.credits} credits
                      </p>
                    </div>

                    <button
                      onClick={() => deleteItem("subjects", s.id)}
                      aria-label="Delete subject"
                      className="text-gray-500 hover:text-red-400"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))
              ))}

            {tab === "assignments" &&
              (assignments.length === 0 ? (
                <EmptyState text="No assignments added yet." />
              ) : (
                assignments.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-4 rounded-2xl border border-white/10 bg-[#11111e] p-5"
                  >
                    <button
                      onClick={() => toggleAssignment(a)}
                      aria-label="Toggle assignment completion"
                    >
                      {a.completed ? (
                        <CheckCircle2 className="text-emerald-400" />
                      ) : (
                        <Circle className="text-gray-500" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <h3
                        className={`font-semibold ${
                          a.completed
                            ? "text-gray-500 line-through"
                            : ""
                        }`}
                      >
                        {a.title}
                      </h3>

                      <p className="mt-1 text-xs text-gray-500">
                        {subjectName(a.subject_id)} ·{" "}
                        {a.due_date ? `Due ${a.due_date}` : "No due date"}
                      </p>

                      {a.description && (
                        <p className="mt-2 text-sm text-gray-400">
                          {a.description}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => deleteItem("assignments", a.id)}
                      aria-label="Delete assignment"
                      className="text-gray-500 hover:text-red-400"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))
              ))}

            {tab === "exams" &&
              (exams.length === 0 ? (
                <EmptyState text="No exams scheduled yet." />
              ) : (
                exams.map((exam) => (
                  <div
                    key={exam.id}
                    className="flex items-center gap-4 rounded-2xl border border-white/10 bg-[#11111e] p-5"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                      <CalendarDays size={21} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold">{exam.title}</h3>

                      <p className="mt-1 text-xs text-gray-500">
                        {subjectName(exam.subject_id)} · {exam.exam_type}
                      </p>

                      <p className="mt-2 flex items-center gap-2 text-xs text-[#20C8FF]">
                        <Clock size={13} />
                        {exam.exam_date}
                      </p>
                    </div>

                    <button
                      onClick={() => deleteItem("exams", exam.id)}
                      aria-label="Delete exam"
                      className="text-gray-500 hover:text-red-400"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))
              ))}
          </section>
        )}

        <footer className="mt-10 border-t border-white/10 py-6 text-center text-xs text-gray-600">
          CareerOS AI · Academic Management
        </footer>
      </div>
    </WorkspaceShell>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-[#11111e] p-10 text-center">
      <BookOpen className="mx-auto mb-4 text-gray-500" size={32} />
      <p className="text-sm text-gray-400">{text}</p>
    </div>
  );
}
