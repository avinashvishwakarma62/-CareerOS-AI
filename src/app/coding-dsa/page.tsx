
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import WorkspaceShell from "@/components/WorkspaceShell";
import { Code, Plus, Trash2, CheckCircle2, Circle, ExternalLink } from "lucide-react";

type Problem = {
  id: string;
  title: string;
  platform: string | null;
  topic: string | null;
  difficulty: string;
  problem_url: string | null;
};

type Progress = {
  problem_id: string;
  solved: boolean;
};

export default function CodingDSAPage() {
  const [userId, setUserId] = useState("");
  const [problems, setProblems] = useState<Problem[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [title, setTitle] = useState("");
  const [platform, setPlatform] = useState("LeetCode");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("Easy");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        window.location.replace("/login");
        return;
      }

      setUserId(auth.user.id);

      const [p, s] = await Promise.all([
        supabase.from("coding_problems")
          .select("id,title,platform,topic,difficulty,problem_url")
          .eq("user_id", auth.user.id)
          .order("created_at", { ascending: false }),
        supabase.from("coding_progress")
          .select("problem_id,solved")
          .eq("user_id", auth.user.id),
      ]);

      if (p.error) setError(p.error.message);
      else setProblems(p.data || []);

      if (s.error) setError(s.error.message);
      else setProgress(s.data || []);

      setLoading(false);
    }
    load();
  }, []);

  async function addProblem(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!title.trim() || !userId) return;

    setSaving(true);
    setError("");

    const { data, error } = await supabase
      .from("coding_problems")
      .insert({
        user_id: userId,
        title: title.trim(),
        platform,
        topic: topic.trim() || null,
        difficulty,
        problem_url: url.trim() || null,
      })
      .select("id,title,platform,topic,difficulty,problem_url")
      .single();

    if (error) setError(error.message);
    else if (data) {
      setProblems((old) => [data, ...old]);
      setTitle("");
      setTopic("");
      setUrl("");
    }
    setSaving(false);
  }

  async function toggleSolved(problem: Problem) {
    const old = progress.find((p) => p.problem_id === problem.id);
    const next = !(old?.solved ?? false);

    setProgress((items) => [
      ...items.filter((p) => p.problem_id !== problem.id),
      { problem_id: problem.id, solved: next },
    ]);

    const { error } = await supabase
      .from("coding_progress")
      .upsert({
        user_id: userId,
        problem_id: problem.id,
        solved: next,
        solved_at: next ? new Date().toISOString() : null,
      }, { onConflict: "problem_id" });

    if (error) {
      setProgress((items) => [
        ...items.filter((p) => p.problem_id !== problem.id),
        ...(old ? [old] : []),
      ]);
      setError(error.message);
    }
  }

  async function deleteProblem(id: string) {
    if (!window.confirm("Delete this problem?")) return;

    const { error } = await supabase
      .from("coding_problems")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) setError(error.message);
    else {
      setProblems((old) => old.filter((p) => p.id !== id));
      setProgress((old) => old.filter((p) => p.problem_id !== id));
    }
  }

  const solved = progress.filter((p) => p.solved).length;
  const percent = problems.length
    ? Math.round((solved / problems.length) * 100)
    : 0;

  return (
    <WorkspaceShell>
      <div className="space-y-7 text-white">
        <header>
          <div className="mb-3 flex items-center gap-2 text-[#20C8FF]">
            <Code size={20} /> CODING WORKSPACE
          </div>
          <h1 className="text-3xl font-bold">Coding & DSA</h1>
          <p className="mt-2 text-gray-400">Track your problem-solving journey.</p>
        </header>

        <div className="grid gap-4 sm:grid-cols-3">
          {[
            ["Total Problems", problems.length],
            ["Solved Problems", solved],
            ["Completion", `${percent}%`],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-2xl border border-white/10 bg-[#11111e] p-5">
              <p className="text-sm text-gray-400">{label}</p>
              <p className="mt-3 text-3xl font-bold">{value}</p>
            </div>
          ))}
        </div>

        <form onSubmit={addProblem} className="grid gap-3 rounded-2xl border border-white/10 bg-[#11111e] p-5 sm:grid-cols-2">
          <h2 className="font-semibold sm:col-span-2">Add coding problem</h2>
          <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Problem title" className="rounded-xl border border-white/10 bg-[#080811] p-3 text-sm" />
          <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic e.g. Arrays" className="rounded-xl border border-white/10 bg-[#080811] p-3 text-sm" />
          <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="rounded-xl border border-white/10 bg-[#080811] p-3 text-sm">
            <option>LeetCode</option><option>GeeksforGeeks</option><option>Codeforces</option><option>HackerRank</option><option>Other</option>
          </select>
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="rounded-xl border border-white/10 bg-[#080811] p-3 text-sm">
            <option>Easy</option><option>Medium</option><option>Hard</option>
          </select>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Problem URL (optional)" className="rounded-xl border border-white/10 bg-[#080811] p-3 text-sm sm:col-span-2" />
          <button disabled={saving} className="flex items-center justify-center gap-2 rounded-xl bg-[#9855FF] p-3 font-semibold disabled:opacity-50 sm:col-span-2">
            <Plus size={18} /> {saving ? "Saving..." : "Add Problem"}
          </button>
        </form>

        {error && <p className="rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}

        <section>
          <h2 className="mb-4 text-lg font-bold">Problem tracker</h2>
          {loading ? <p className="text-gray-400">Loading...</p> : problems.length === 0 ? (
            <p className="rounded-xl border border-white/10 p-8 text-center text-gray-400">No problems added yet.</p>
          ) : (
            <div className="space-y-3">
              {problems.map((p) => {
                const done = progress.some((x) => x.problem_id === p.id && x.solved);
                return (
                  <article key={p.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#11111e] p-4">
                    <button onClick={() => toggleSolved(p)} aria-label="Toggle solved">
                      {done ? <CheckCircle2 className="text-emerald-400" /> : <Circle className="text-gray-500" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <h3 className={`font-semibold ${done ? "text-gray-500 line-through" : ""}`}>{p.title}</h3>
                      <p className="mt-1 text-xs text-gray-400">{p.platform} · {p.topic || "General"} · {p.difficulty}</p>
                    </div>
                    {p.problem_url && (
                      <a href={p.problem_url} target="_blank" rel="noreferrer" aria-label="Open problem" className="text-[#20C8FF]">
                        <ExternalLink size={17} />
                      </a>
                    )}
                    <button onClick={() => deleteProblem(p.id)} aria-label="Delete problem" className="text-gray-500 hover:text-red-400">
                      <Trash2 size={18} />
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </WorkspaceShell>
  );
}
