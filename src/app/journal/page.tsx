
"use client";

import { useCallback, useEffect, useState } from "react";
import WorkspaceShell from "@/components/WorkspaceShell";
import { supabase } from "@/lib/supabase";
import {
  BookHeart,
  Save,
  Trash2,
  Pencil,
  X,
  RefreshCw,
} from "lucide-react";

type Entry = {
  id: string;
  title: string;
  content: string;
  mood: string;
  entry_date: string;
  created_at: string;
};

const moods = [
  "Happy",
  "Focused",
  "Motivated",
  "Neutral",
  "Stressed",
  "Tired",
];

function getIndiaDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );

  return `${values.year}-${values.month}-${values.day}`;
}

export default function JournalPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mood, setMood] = useState("Neutral");
  const [entryDate, setEntryDate] = useState(getIndiaDate);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadEntries = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Please log in to access your journal.");
      }

      const { data, error: fetchError } = await supabase
        .from("journal_entries")
        .select("*")
        .eq("user_id", user.id)
        .order("entry_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      setEntries(data || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load journal entries."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadEntries();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadEntries]);

  function resetForm() {
    setTitle("");
    setContent("");
    setMood("Neutral");
    setEntryDate(getIndiaDate());
    setEditingId(null);
    setError("");
  }

  function startEdit(entry: Entry) {
    setEditingId(entry.id);
    setTitle(entry.title);
    setContent(entry.content);
    setMood(entry.mood);
    setEntryDate(entry.entry_date);
    setError("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveEntry(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      setError("Please enter a title and journal content.");
      return;
    }

    if (title.trim().length > 150 || content.trim().length > 12000) {
      setError("Title or journal content exceeds the allowed length.");
      return;
    }

    if (saving) return;

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
        title: title.trim(),
        content: content.trim(),
        mood,
        entry_date: entryDate,
        updated_at: new Date().toISOString(),
      };

      if (editingId) {
        const { error: saveError } = await supabase
          .from("journal_entries")
          .update(payload)
          .eq("id", editingId)
          .eq("user_id", user.id);

        if (saveError) throw saveError;
      } else {
        const { error: saveError } = await supabase
          .from("journal_entries")
          .insert({
            ...payload,
            user_id: user.id,
          });

        if (saveError) throw saveError;
      }

      resetForm();
      await loadEntries();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save journal entry."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteEntry(id: string) {
    if (deletingId || saving) return;

    const confirmed = window.confirm(
      "Delete this journal entry?"
    );

    if (!confirmed) return;

    setDeletingId(id);
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
        .from("journal_entries")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (deleteError) throw deleteError;

      setEntries((old) =>
        old.filter((entry) => entry.id !== id)
      );

      if (editingId === id) {
        resetForm();
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete journal entry."
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <WorkspaceShell>
      <div className="mx-auto max-w-5xl space-y-7 text-white">
        <header>
          <div className="flex items-center gap-2 text-violet-400">
            <BookHeart size={20} />
            <span className="text-sm font-semibold">
              PERSONAL SPACE
            </span>
          </div>

          <h1 className="mt-2 text-3xl font-bold">
            My Journal
          </h1>

          <p className="mt-2 text-sm text-gray-400">
            Reflect on your day, record achievements and track your growth.
          </p>
        </header>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <form
          onSubmit={saveEntry}
          className="space-y-4 rounded-2xl border border-white/10 bg-[#11111e] p-6"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-bold">
              {editingId ? "Edit Journal Entry" : "Write Today's Entry"}
            </h2>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="flex items-center gap-1 text-xs text-gray-400"
              >
                <X size={14} />
                Cancel edit
              </button>
            )}
          </div>

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Give your entry a title..."
            maxLength={150}
            required
            className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none focus:border-violet-500"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs text-gray-400">
                Date
              </label>

              <input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                required
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-gray-300"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs text-gray-400">
                Mood
              </label>

              <select
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#181827] px-4 py-3 text-sm"
              >
                {moods.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What did you learn today? What went well? What can you improve tomorrow?"
            rows={7}
            maxLength={12000}
            required
            className="w-full resize-y rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 outline-none focus:border-violet-500"
          />

          <button
            type="submit"
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 py-3 text-sm font-semibold disabled:opacity-50"
          >
            <Save size={17} />

            {saving
              ? "Saving..."
              : editingId
                ? "Update Entry"
                : "Save Journal Entry"}
          </button>
        </form>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold">
              Journal History
            </h2>

            <button
              type="button"
              onClick={() => void loadEntries()}
              disabled={loading}
              className="rounded-lg border border-white/10 p-2 text-gray-400 hover:bg-white/5 disabled:opacity-50"
              aria-label="Refresh journal"
            >
              <RefreshCw
                size={16}
                className={loading ? "animate-spin" : ""}
              />
            </button>
          </div>

          {loading ? (
            <p className="text-sm text-gray-500">
              Loading journal...
            </p>
          ) : entries.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-gray-500">
              No journal entries yet. Write your first entry above.
            </div>
          ) : (
            <div className="space-y-4">
              {entries.map((entry) => (
                <article
                  key={entry.id}
                  className="rounded-2xl border border-white/10 bg-[#11111e] p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">
                        {entry.title}
                      </h3>

                      <p className="mt-1 text-xs text-gray-500">
                        {entry.entry_date}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-violet-500/10 px-3 py-1 text-xs text-violet-300">
                        {entry.mood}
                      </span>

                      <button
                        type="button"
                        onClick={() => startEdit(entry)}
                        disabled={Boolean(deletingId)}
                        aria-label="Edit entry"
                        className="rounded-lg p-2 text-gray-400 hover:bg-white/5 hover:text-white disabled:opacity-50"
                      >
                        <Pencil size={15} />
                      </button>

                      <button
                        type="button"
                        onClick={() => void deleteEntry(entry.id)}
                        disabled={deletingId === entry.id}
                        aria-label="Delete entry"
                        className="rounded-lg p-2 text-gray-400 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-gray-300">
                    {entry.content}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </WorkspaceShell>
  );
}
