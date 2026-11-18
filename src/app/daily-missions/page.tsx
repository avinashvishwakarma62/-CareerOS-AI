
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import WorkspaceShell from "@/components/WorkspaceShell";
import {
  Plus, Target, CheckCircle2, Circle, Trash2, Loader2
} from "lucide-react";

type Task = {
  id: string;
  title: string;
  detail: string | null;
  completed: boolean;
  due_date: string | null;
};

export default function DailyMissionsPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadTasks() {
      const { data: auth } = await supabase.auth.getUser();

      if (!auth.user) {
        window.location.replace("/login");
        return;
      }

      setUserId(auth.user.id);

      const { data, error } = await supabase
        .from("tasks")
        .select("id,title,detail,completed,due_date")
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: false });

      if (error) setError(error.message);
      else setTasks(data || []);

      setLoading(false);
    }

    loadTasks();
  }, []);

  async function addTask(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!title.trim() || !userId) return;

    setSaving(true);
    setError("");

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        user_id: userId,
        title: title.trim(),
        detail: detail.trim() || null,
        due_date: dueDate || null,
        completed: false,
      })
      .select("id,title,detail,completed,due_date")
      .single();

    if (error) setError(error.message);
    else if (data) {
      setTasks((old) => [data, ...old]);
      setTitle("");
      setDetail("");
      setDueDate("");
    }

    setSaving(false);
  }

  async function toggleTask(task: Task) {
    const next = !task.completed;

    setTasks((old) =>
      old.map((item) =>
        item.id === task.id ? { ...item, completed: next } : item
      )
    );

    const { error } = await supabase
      .from("tasks")
      .update({ completed: next })
      .eq("id", task.id)
      .eq("user_id", userId);

    if (error) {
      setTasks((old) =>
        old.map((item) =>
          item.id === task.id
            ? { ...item, completed: task.completed }
            : item
        )
      );
      setError(error.message);
    }
  }

  async function deleteTask(id: string) {
    if (!window.confirm("Delete this mission?")) return;

    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      setError(error.message);
      return;
    }

    setTasks((old) => old.filter((task) => task.id !== id));
  }

  const completed = tasks.filter((task) => task.completed).length;
  const percentage = tasks.length
    ? Math.round((completed / tasks.length) * 100)
    : 0;

  return (
    <WorkspaceShell>
      <div className="space-y-7 text-white">
        <header>
          <div className="mb-3 flex items-center gap-2 text-[#20C8FF]">
            <Target size={20} />
            <span className="text-xs font-bold tracking-widest">
              PRODUCTIVITY WORKSPACE
            </span>
          </div>
          <h1 className="text-3xl font-bold">Daily Missions</h1>
          <p className="mt-2 text-gray-400">
            Turn your goals into daily achievements.
          </p>
        </header>

        <section className="rounded-2xl border border-[#9855FF]/30 bg-gradient-to-r from-[#9855FF]/15 to-[#20C8FF]/10 p-6">
          <div className="flex justify-between">
            <span className="text-sm text-gray-300">Mission progress</span>
            <span className="font-bold text-[#20C8FF]">
              {percentage}%
            </span>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#9855FF] to-[#20C8FF] transition-all"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <p className="mt-3 text-sm text-gray-400">
            {completed} of {tasks.length} missions completed
          </p>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#11111e] p-5">
          <h2 className="mb-4 font-semibold">Create a mission</h2>
          <form onSubmit={addTask} className="grid gap-3">
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Mission title"
              className="rounded-xl border border-white/10 bg-[#080811] p-3 text-sm outline-none focus:border-[#9855FF]"
            />
            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="Description (optional)"
              rows={2}
              className="rounded-xl border border-white/10 bg-[#080811] p-3 text-sm outline-none focus:border-[#9855FF]"
            />
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="rounded-xl border border-white/10 bg-[#080811] p-3 text-sm"
            />
            <button
              disabled={saving}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#9855FF] p-3 font-semibold disabled:opacity-50"
            >
              <Plus size={18} />
              {saving ? "Saving..." : "Add Mission"}
            </button>
          </form>
        </section>

        {error && (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </p>
        )}

        <section>
          <h2 className="mb-4 text-lg font-bold">Your missions</h2>

          {loading ? (
            <Loader2 className="animate-spin text-[#B58AFF]" />
          ) : tasks.length === 0 ? (
            <p className="rounded-xl border border-white/10 p-8 text-center text-gray-400">
              No missions yet. Create your first mission above.
            </p>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <article
                  key={task.id}
                  className="flex items-center gap-4 rounded-xl border border-white/10 bg-[#11111e] p-4"
                >
                  <button
                    onClick={() => toggleTask(task)}
                    aria-label="Toggle completion"
                  >
                    {task.completed ? (
                      <CheckCircle2 className="text-emerald-400" />
                    ) : (
                      <Circle className="text-gray-500" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <h3 className={`font-semibold ${task.completed ? "text-gray-500 line-through" : ""}`}>
                      {task.title}
                    </h3>
                    {task.detail && (
                      <p className="mt-1 text-sm text-gray-400">
                        {task.detail}
                      </p>
                    )}
                    {task.due_date && (
                      <p className="mt-1 text-xs text-[#20C8FF]">
                        Due: {task.due_date}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => deleteTask(task.id)}
                    aria-label="Delete mission"
                    className="text-gray-500 hover:text-red-400"
                  >
                    <Trash2 size={18} />
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </WorkspaceShell>
  );
}
