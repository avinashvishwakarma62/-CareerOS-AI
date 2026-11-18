
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import WorkspaceShell from "@/components/WorkspaceShell";
import { BookOpen, Plus, Trash2, CheckCircle2, Circle } from "lucide-react";

type Path = {
  id: string;
  title: string;
  description: string | null;
  target_date: string | null;
};

type Milestone = {
  id: string;
  path_id: string;
  title: string;
  completed: boolean;
};

export default function LearningRoadmapPage() {
  const [userId, setUserId] = useState("");
  const [paths, setPaths] = useState<Path[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [milestoneInputs, setMilestoneInputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        window.location.replace("/login");
        return;
      }
      setUserId(auth.user.id);

      const [p, m] = await Promise.all([
        supabase.from("learning_paths")
          .select("id,title,description,target_date")
          .eq("user_id", auth.user.id)
          .order("created_at", { ascending: false }),
        supabase.from("learning_milestones")
          .select("id,path_id,title,completed")
          .eq("user_id", auth.user.id),
      ]);

      if (p.error) setError(p.error.message);
      else setPaths(p.data || []);
      if (m.error) setError(m.error.message);
      else setMilestones(m.data || []);
      setLoading(false);
    }
    load();
  }, []);

  async function addPath(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!title.trim()) return;

    const { data, error } = await supabase.from("learning_paths")
      .insert({
        user_id: userId,
        title: title.trim(),
        description: description.trim() || null,
        target_date: targetDate || null,
      })
      .select("id,title,description,target_date")
      .single();

    if (error) setError(error.message);
    else if (data) {
      setPaths((old) => [data, ...old]);
      setTitle("");
      setDescription("");
      setTargetDate("");
    }
  }

  async function addMilestone(pathId: string) {
    const value = (milestoneInputs[pathId] || "").trim();
    if (!value) return;

    const { data, error } = await supabase.from("learning_milestones")
      .insert({ user_id: userId, path_id: pathId, title: value })
      .select("id,path_id,title,completed")
      .single();

    if (error) setError(error.message);
    else if (data) {
      setMilestones((old) => [...old, data]);
      setMilestoneInputs((old) => ({ ...old, [pathId]: "" }));
    }
  }

  async function toggleMilestone(item: Milestone) {
    const next = !item.completed;
    setMilestones((old) => old.map((m) => m.id === item.id ? { ...m, completed: next } : m));

    const { error } = await supabase.from("learning_milestones")
      .update({ completed: next })
      .eq("id", item.id)
      .eq("user_id", userId);

    if (error) {
      setMilestones((old) => old.map((m) => m.id === item.id ? { ...m, completed: item.completed } : m));
      setError(error.message);
    }
  }

  async function deletePath(id: string) {
    if (!window.confirm("Delete this learning path and its milestones?")) return;
    const { error } = await supabase.from("learning_paths")
      .delete().eq("id", id).eq("user_id", userId);
    if (error) setError(error.message);
    else {
      setPaths((old) => old.filter((p) => p.id !== id));
      setMilestones((old) => old.filter((m) => m.path_id !== id));
    }
  }

  async function deleteMilestone(id: string) {
    const { error } = await supabase.from("learning_milestones")
      .delete().eq("id", id).eq("user_id", userId);
    if (error) setError(error.message);
    else setMilestones((old) => old.filter((m) => m.id !== id));
  }

  return (
    <WorkspaceShell>
      <div className="space-y-7 text-white">
        <header>
          <div className="mb-3 flex items-center gap-2 text-[#20C8FF]"><BookOpen size={20} /> LEARNING WORKSPACE</div>
          <h1 className="text-3xl font-bold">Learning Roadmap</h1>
          <p className="mt-2 text-gray-400">Build a structured path towards your goals.</p>
        </header>

        <form onSubmit={addPath} className="grid gap-3 rounded-2xl border border-white/10 bg-[#11111e] p-5 sm:grid-cols-2">
          <h2 className="font-semibold sm:col-span-2">Create learning path</h2>
          <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Full Stack Development" className="rounded-xl border border-white/10 bg-[#080811] p-3 text-sm" />
          <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="rounded-xl border border-white/10 bg-[#080811] p-3 text-sm" />
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className="rounded-xl border border-white/10 bg-[#080811] p-3 text-sm sm:col-span-2" />
          <button className="flex items-center justify-center gap-2 rounded-xl bg-[#9855FF] p-3 font-semibold sm:col-span-2"><Plus size={18} /> Create Roadmap</button>
        </form>

        {error && <p className="rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}

        <section className="space-y-4">
          <h2 className="text-lg font-bold">Your learning paths</h2>
          {loading ? <p className="text-gray-400">Loading...</p> : paths.length === 0 ? (
            <p className="rounded-xl border border-white/10 p-8 text-center text-gray-400">No learning paths yet.</p>
          ) : paths.map((path) => {
            const items = milestones.filter((m) => m.path_id === path.id);
            const done = items.filter((m) => m.completed).length;
            const percent = items.length ? Math.round(done / items.length * 100) : 0;

            return (
              <article key={path.id} className="rounded-2xl border border-white/10 bg-[#11111e] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">{path.title}</h3>
                    {path.description && <p className="mt-1 text-sm text-gray-400">{path.description}</p>}
                    {path.target_date && <p className="mt-2 text-xs text-[#20C8FF]">Target: {path.target_date}</p>}
                  </div>
                  <button onClick={() => deletePath(path.id)} aria-label="Delete path" className="text-gray-500 hover:text-red-400"><Trash2 size={18} /></button>
                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full bg-gradient-to-r from-[#9855FF] to-[#20C8FF]" style={{ width: `${percent}%` }} />
                </div>
                <p className="mt-2 text-xs text-gray-400">{done}/{items.length} milestones · {percent}% complete</p>

                <div className="mt-4 space-y-2">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 rounded-lg bg-white/5 p-3">
                      <button onClick={() => toggleMilestone(item)} aria-label="Toggle milestone">
                        {item.completed ? <CheckCircle2 className="text-emerald-400" size={19} /> : <Circle className="text-gray-500" size={19} />}
                      </button>
                      <span className={`flex-1 text-sm ${item.completed ? "text-gray-500 line-through" : ""}`}>{item.title}</span>
                      <button onClick={() => deleteMilestone(item.id)} aria-label="Delete milestone" className="text-gray-500 hover:text-red-400"><Trash2 size={16} /></button>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex gap-2">
                  <input value={milestoneInputs[path.id] || ""} onChange={(e) => setMilestoneInputs((old) => ({ ...old, [path.id]: e.target.value }))} placeholder="Add a milestone" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#080811] p-3 text-sm" />
                  <button onClick={() => addMilestone(path.id)} className="rounded-xl bg-[#9855FF] px-4"><Plus size={18} /></button>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </WorkspaceShell>
  );
}
