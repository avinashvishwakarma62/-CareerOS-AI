
"use client";

import { useCallback, useEffect, useState } from "react";
import WorkspaceShell from "@/components/WorkspaceShell";
import { supabase } from "@/lib/supabase";
import {
  BookOpen,
  Plus,
  Trash2,
  CheckCircle2,
  Sparkles,
  RefreshCw,
} from "lucide-react";

type Subject = {
  id: string;
  name: string;
  code?: string;
};

type Exam = {
  id: string;
  title: string;
  exam_date: string;
  exam_type?: string;
  subject_id?: string;
};

type Topic = {
  id: string;
  subject_name: string;
  topic_name: string;
  completed: boolean;
  difficulty: string;
};

export default function ExamPreparationPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subjectName, setSubjectName] = useState("");
  const [topicName, setTopicName] = useState("");
  const [difficulty, setDifficulty] = useState("Medium");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [updatingTopicId, setUpdatingTopicId] = useState<string | null>(null);
  const [deletingTopicId, setDeletingTopicId] = useState<string | null>(null);
  const [mcqs, setMcqs] = useState("");
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

      const [subjectResult, examResult, topicResult] = await Promise.all([
        supabase
          .from("subjects")
          .select("id, name, code")
          .eq("user_id", user.id)
          .order("name"),

        supabase
          .from("exams")
          .select("*")
          .eq("user_id", user.id)
          .order("exam_date"),

        supabase
          .from("exam_topics")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
      ]);

      if (subjectResult.error) throw subjectResult.error;
      if (examResult.error) throw examResult.error;
      if (topicResult.error) throw topicResult.error;

      setSubjects(subjectResult.data || []);
      setExams(examResult.data || []);
      setTopics(topicResult.data || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load exam data."
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

  async function addTopic(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!subjectName || !topicName.trim()) {
      setError("Select a subject and enter a topic.");
      return;
    }

    if (topicName.trim().length > 200) {
      setError("Topic name must be 200 characters or less.");
      return;
    }

    const selectedSubject = subjects.find(
      (item) => item.id === subjectName
    );

    if (!selectedSubject) {
      setError("Please select a valid subject.");
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Please log in again.");
      }

      const { error: insertError } = await supabase
        .from("exam_topics")
        .insert({
          user_id: user.id,
          subject_id: subjectName,
          subject_name: selectedSubject.name,
          topic_name: topicName.trim(),
          difficulty,
        });

      if (insertError) throw insertError;

      setTopicName("");
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to add syllabus topic."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleTopic(topic: Topic) {
    if (updatingTopicId || deletingTopicId) return;

    setUpdatingTopicId(topic.id);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Please log in again.");
      }

      const { error: updateError } = await supabase
        .from("exam_topics")
        .update({ completed: !topic.completed })
        .eq("id", topic.id)
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      setTopics((old) =>
        old.map((item) =>
          item.id === topic.id
            ? { ...item, completed: !topic.completed }
            : item
        )
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update topic."
      );
    } finally {
      setUpdatingTopicId(null);
    }
  }

  async function deleteTopic(id: string) {
    if (deletingTopicId || updatingTopicId) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this topic?"
    );

    if (!confirmed) return;

    setDeletingTopicId(id);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Please log in again.");
      }

      const { error: deleteError } = await supabase
        .from("exam_topics")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (deleteError) throw deleteError;

      setTopics((old) => old.filter((item) => item.id !== id));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete topic."
      );
    } finally {
      setDeletingTopicId(null);
    }
  }

  async function generateMCQs() {
    if (!subjectName) {
      setError("Select a subject before generating MCQs.");
      return;
    }

    if (generating) return;

    setGenerating(true);
    setError("");
    setMcqs("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Please log in again.");
      }

      const selectedSubject = subjects.find(
        (item) => item.id === subjectName
      );

      if (!selectedSubject) {
        throw new Error("Please select a valid subject.");
      }

      const response = await fetch("/api/ai/exam-practice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          subject: selectedSubject.name,
          topics: topics
            .filter(
              (item) => item.subject_name === selectedSubject.name
            )
            .map((item) => item.topic_name),
          difficulty,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to generate MCQs.");
      }

      if (!result.questions) {
        throw new Error("The AI response did not contain any questions.");
      }

      setMcqs(result.questions);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "MCQ generation failed."
      );
    } finally {
      setGenerating(false);
    }
  }

  const completedTopics = topics.filter(
    (topic) => topic.completed
  ).length;

  const progress = topics.length
    ? Math.round((completedTopics / topics.length) * 100)
    : 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingExams = exams.filter((exam) => {
    const examDate = new Date(`${exam.exam_date}T00:00:00`);
    return !Number.isNaN(examDate.getTime()) &&
      examDate.getTime() >= today.getTime();
  });

  return (
    <WorkspaceShell>
      <div className="mx-auto max-w-6xl space-y-7 text-white">
        <header>
          <div className="flex items-center gap-2 text-violet-400">
            <BookOpen size={20} />
            <span className="text-sm font-semibold">
              EXAM INTELLIGENCE
            </span>
          </div>

          <h1 className="mt-2 text-3xl font-bold">
            Exam Preparation
          </h1>

          <p className="mt-2 text-sm text-gray-400">
            Organize your syllabus, revision progress and exam practice.
          </p>
        </header>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-[#11111e] p-5">
            <p className="text-xs text-gray-500">Upcoming exams</p>
            <p className="mt-3 text-3xl font-bold">
              {upcomingExams.length}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#11111e] p-5">
            <p className="text-xs text-gray-500">Syllabus topics</p>
            <p className="mt-3 text-3xl font-bold">
              {topics.length}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#11111e] p-5">
            <p className="text-xs text-gray-500">Revision completed</p>
            <p className="mt-3 text-3xl font-bold">
              {progress}%
            </p>
          </div>
        </div>

        <section className="rounded-2xl border border-white/10 bg-[#11111e] p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-bold">Upcoming Exams</h2>

            <button
              type="button"
              onClick={() => void loadData()}
              disabled={loading}
              aria-label="Refresh exam data"
              className="rounded-lg border border-white/10 p-2 text-gray-400 hover:bg-white/5 disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={loading ? "animate-spin" : ""}
              />
            </button>
          </div>

          {loading ? (
            <p className="text-sm text-gray-500">
              Loading exams...
            </p>
          ) : exams.length === 0 ? (
            <p className="text-sm text-gray-500">
              No exams added. Add exam dates in Academics first.
            </p>
          ) : (
            <div className="space-y-3">
              {exams.map((exam) => {
                const examDate = new Date(
                  `${exam.exam_date}T00:00:00`
                );

                const daysLeft = Math.ceil(
                  (examDate.getTime() - today.getTime()) /
                    86400000
                );

                return (
                  <div
                    key={exam.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 p-4"
                  >
                    <div>
                      <p className="font-semibold">{exam.title}</p>

                      <p className="mt-1 text-xs text-gray-500">
                        {exam.exam_date} · {exam.exam_type || "Exam"}
                      </p>
                    </div>

                    <span className="rounded-full bg-violet-500/10 px-3 py-1 text-xs text-violet-300">
                      {daysLeft < 0
                        ? "Past exam"
                        : daysLeft === 0
                          ? "Today"
                          : `${daysLeft} days left`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#11111e] p-6">
          <h2 className="mb-4 font-bold">Add Syllabus Topic</h2>

          <form onSubmit={addTopic} className="space-y-4">
            <select
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              required
              className="w-full rounded-xl border border-white/10 bg-[#181827] px-4 py-3 text-sm"
            >
              <option value="">Select subject</option>

              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>

            <input
              value={topicName}
              onChange={(e) => setTopicName(e.target.value)}
              placeholder="Enter unit or topic name"
              maxLength={200}
              required
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm"
            />

            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#181827] px-4 py-3 text-sm"
            >
              <option>Easy</option>
              <option>Medium</option>
              <option>Hard</option>
            </select>

            <button
              type="submit"
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 py-3 text-sm font-semibold disabled:opacity-50"
            >
              <Plus size={17} />
              {saving ? "Saving..." : "Add Topic"}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#11111e] p-6">
          <h2 className="mb-4 font-bold">
            Syllabus Revision Tracker
          </h2>

          {topics.length === 0 ? (
            <p className="text-sm text-gray-500">
              Add syllabus topics to track your revision.
            </p>
          ) : (
            <div className="space-y-3">
              {topics.map((topic) => (
                <div
                  key={topic.id}
                  className="flex items-center gap-3 rounded-xl border border-white/10 p-3"
                >
                  <button
                    type="button"
                    onClick={() => void toggleTopic(topic)}
                    disabled={
                      updatingTopicId === topic.id ||
                      deletingTopicId === topic.id
                    }
                    aria-label="Toggle topic completion"
                    className={`rounded-full p-1 disabled:opacity-50 ${
                      topic.completed
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "border border-white/20 text-gray-500"
                    }`}
                  >
                    <CheckCircle2 size={19} />
                  </button>

                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-medium ${
                        topic.completed
                          ? "text-gray-500 line-through"
                          : ""
                      }`}
                    >
                      {topic.topic_name}
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      {topic.subject_name} · {topic.difficulty}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => void deleteTopic(topic.id)}
                    disabled={
                      deletingTopicId === topic.id ||
                      updatingTopicId === topic.id
                    }
                    aria-label="Delete topic"
                    className="text-gray-500 hover:text-red-400 disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-violet-500/20 bg-[#11111e] p-6">
          <div className="flex items-center gap-2">
            <Sparkles className="text-violet-400" />
            <h2 className="font-bold">AI MCQ Practice</h2>
          </div>

          <p className="mt-2 text-sm text-gray-400">
            Generate 5 practice MCQs for your selected subject and difficulty.
          </p>

          <div className="mt-4">
            <label className="mb-2 block text-xs text-gray-400">
              Select subject for practice
            </label>

            <select
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#181827] px-4 py-3 text-sm"
            >
              <option value="">Select subject</option>

              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => void generateMCQs()}
            disabled={generating || !subjects.length || !subjectName}
            className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-5 py-3 text-sm font-semibold disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={generating ? "animate-spin" : ""}
            />

            {generating
              ? "Generating questions..."
              : "Generate 5 MCQs"}
          </button>

          {mcqs && (
            <div className="mt-5 whitespace-pre-wrap rounded-xl bg-black/20 p-5 text-sm leading-7 text-gray-300">
              {mcqs}
            </div>
          )}
        </section>

        <p className="text-xs text-gray-600">
          Exam countdown uses the date stored in your Exams table. MCQs are
          AI-generated practice questions, not verified university questions.
        </p>
      </div>
    </WorkspaceShell>
  );
}
