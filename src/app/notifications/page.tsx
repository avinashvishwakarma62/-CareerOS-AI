
"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import WorkspaceShell from "@/components/WorkspaceShell";
import { supabase } from "@/lib/supabase";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Plus,
  Clock,
  CalendarDays,
  RefreshCw,
} from "lucide-react";

type Notification = {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  read: boolean;
  scheduled_at: string | null;
  completed: boolean;
  category: string;
  created_at: string;
};

export default function NotificationsPage() {
  const router = useRouter();

  const [items, setItems] = useState<Notification[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reminderDate, setReminderDate] = useState("");
  const [category, setCategory] = useState("Personal");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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

      const { data, error: fetchError } = await supabase
        .from("notifications")
        .select(
          "id, title, message, notification_type, read, scheduled_at, completed, category, created_at"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      setItems((data || []) as Notification[]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load notifications."
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

  async function addReminder(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!title.trim() || !reminderDate) {
      setError("Please enter a title and reminder date.");
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

      const date = new Date(reminderDate);

      if (
        Number.isNaN(date.getTime()) ||
        date.getTime() <= Date.now()
      ) {
        throw new Error(
          "Please select a future reminder date and time."
        );
      }

      const { error: insertError } = await supabase
        .from("notifications")
        .insert({
          user_id: user.id,
          title: title.trim(),
          message: description.trim() || "Personal reminder",
          notification_type: "reminder",
          scheduled_at: date.toISOString(),
          category,
          completed: false,
          read: false,
        });

      if (insertError) throw insertError;

      setTitle("");
      setDescription("");
      setReminderDate("");
      setCategory("Personal");

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save reminder."
      );
    } finally {
      setSaving(false);
    }
  }

  async function markRead(id: string) {
    setActionLoading(id);
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
        .from("notifications")
        .update({ read: true })
        .eq("id", id)
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      setItems((old) =>
        old.map((item) =>
          item.id === id ? { ...item, read: true } : item
        )
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update notification."
      );
    } finally {
      setActionLoading(null);
    }
  }

  async function markAllRead() {
    setActionLoading("all");
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
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .eq("read", false);

      if (updateError) throw updateError;

      setItems((old) =>
        old.map((item) => ({ ...item, read: true }))
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to mark all as read."
      );
    } finally {
      setActionLoading(null);
    }
  }

  async function deleteItem(id: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this item?"
    );

    if (!confirmed) return;

    setActionLoading(id);
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
        .from("notifications")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (deleteError) throw deleteError;

      setItems((old) => old.filter((item) => item.id !== id));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to delete item."
      );
    } finally {
      setActionLoading(null);
    }
  }

  async function toggleReminder(item: Notification) {
    setActionLoading(item.id);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Please log in again.");
      }

      const nextCompleted = !item.completed;

      const { error: updateError } = await supabase
        .from("notifications")
        .update({ completed: nextCompleted })
        .eq("id", item.id)
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      setItems((old) =>
        old.map((entry) =>
          entry.id === item.id
            ? { ...entry, completed: nextCompleted }
            : entry
        )
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update reminder."
      );
    } finally {
      setActionLoading(null);
    }
  }

  const reminders = items.filter(
    (item) => item.notification_type === "reminder"
  );

  const notifications = items.filter(
    (item) => item.notification_type !== "reminder"
  );

  const unreadCount = notifications.filter(
    (item) => !item.read
  ).length;

  const activeReminders = reminders.filter(
    (item) => !item.completed
  ).length;

  return (
    <WorkspaceShell>
      <div className="mx-auto max-w-6xl space-y-7 text-white">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2 text-violet-400">
              <Bell size={20} />
              <span className="text-sm font-semibold">
                STAY UPDATED
              </span>
            </div>

            <h1 className="mt-2 text-3xl font-bold">
              Notifications & Reminders
            </h1>

            <p className="mt-2 text-sm text-gray-400">
              Manage your alerts, deadlines and personal reminders.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadData()}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm hover:bg-white/5 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </header>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-[#11111e] p-5">
            <Bell className="text-violet-400" />
            <p className="mt-4 text-2xl font-bold">
              {notifications.length}
            </p>
            <p className="text-sm text-gray-500">
              Total notifications
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#11111e] p-5">
            <CheckCheck className="text-blue-400" />
            <p className="mt-4 text-2xl font-bold">
              {unreadCount}
            </p>
            <p className="text-sm text-gray-500">
              Unread notifications
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#11111e] p-5">
            <Clock className="text-emerald-400" />
            <p className="mt-4 text-2xl font-bold">
              {activeReminders}
            </p>
            <p className="text-sm text-gray-500">
              Active reminders
            </p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="rounded-2xl border border-white/10 bg-[#11111e] p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-xl bg-violet-500/15 p-3">
                <Plus className="text-violet-300" />
              </div>

              <div>
                <h2 className="font-bold">Create Reminder</h2>
                <p className="text-xs text-gray-500">
                  Add an upcoming task or event.
                </p>
              </div>
            </div>

            <form onSubmit={addReminder} className="space-y-4">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={120}
                placeholder="Reminder title"
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none focus:border-violet-500"
              />

              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={1000}
                placeholder="Description (optional)"
                rows={3}
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none focus:border-violet-500"
              />

              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#181827] px-4 py-3 text-sm outline-none"
              >
                <option>Personal</option>
                <option>Academic</option>
                <option>Exam</option>
                <option>Assignment</option>
                <option>Coding</option>
                <option>Career</option>
                <option>Interview</option>
              </select>

              <input
                type="datetime-local"
                value={reminderDate}
                onChange={(e) => setReminderDate(e.target.value)}
                required
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-gray-300 outline-none focus:border-violet-500"
              />

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 py-3 text-sm font-semibold disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Reminder"}
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#11111e] p-6">
            <h2 className="mb-5 font-bold">Your Reminders</h2>

            {loading ? (
              <p className="text-sm text-gray-500">
                Loading reminders...
              </p>
            ) : reminders.length === 0 ? (
              <p className="text-sm text-gray-500">
                No reminders yet. Create your first reminder.
              </p>
            ) : (
              <div className="space-y-3">
                {reminders.map((reminder) => (
                  <div
                    key={reminder.id}
                    className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4"
                  >
                    <button
                      type="button"
                      onClick={() => void toggleReminder(reminder)}
                      disabled={actionLoading === reminder.id}
                      aria-label="Toggle reminder completion"
                      className={`mt-1 rounded-full border p-1 disabled:opacity-50 ${
                        reminder.completed
                          ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                          : "border-white/20 text-gray-500"
                      }`}
                    >
                      <Check size={14} />
                    </button>

                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm font-semibold ${
                          reminder.completed
                            ? "text-gray-500 line-through"
                            : "text-white"
                        }`}
                      >
                        {reminder.title}
                      </p>

                      {reminder.message && (
                        <p className="mt-1 text-xs text-gray-500">
                          {reminder.message}
                        </p>
                      )}

                      {reminder.scheduled_at && (
                        <p className="mt-2 flex items-center gap-2 text-xs text-violet-300">
                          <CalendarDays size={13} />
                          {new Date(
                            reminder.scheduled_at
                          ).toLocaleString()}
                        </p>
                      )}

                      <p className="mt-1 text-xs text-gray-500">
                        {reminder.category || "Personal"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => void deleteItem(reminder.id)}
                      disabled={actionLoading === reminder.id}
                      aria-label="Delete reminder"
                      className="text-gray-500 hover:text-red-400 disabled:opacity-50"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <section className="rounded-2xl border border-white/10 bg-[#11111e] p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold">Recent Notifications</h2>
              <p className="mt-1 text-xs text-gray-500">
                Your recent in-app alerts.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void markAllRead()}
              disabled={unreadCount === 0 || actionLoading === "all"}
              className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-gray-300 hover:bg-white/5 disabled:opacity-40"
            >
              <CheckCheck size={15} />
              {actionLoading === "all" ? "Updating..." : "Mark all read"}
            </button>
          </div>

          {loading ? (
            <p className="text-sm text-gray-500">
              Loading notifications...
            </p>
          ) : notifications.length === 0 ? (
            <p className="text-sm text-gray-500">
              No notifications yet.
            </p>
          ) : (
            <div className="space-y-3">
              {notifications.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-start gap-3 rounded-xl border p-4 ${
                    item.read
                      ? "border-white/5 bg-white/[0.02]"
                      : "border-violet-500/20 bg-violet-500/5"
                  }`}
                >
                  <div className="rounded-lg bg-violet-500/15 p-2">
                    <Bell size={17} className="text-violet-300" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">
                      {item.title}
                    </p>

                    <p className="mt-1 text-sm text-gray-400">
                      {item.message}
                    </p>

                    <p className="mt-2 text-xs text-gray-600">
                      {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>

                  {!item.read && (
                    <button
                      type="button"
                      onClick={() => void markRead(item.id)}
                      disabled={actionLoading === item.id}
                      className="text-xs text-blue-300 hover:text-blue-200 disabled:opacity-50"
                    >
                      Mark read
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => void deleteItem(item.id)}
                    disabled={actionLoading === item.id}
                    aria-label="Delete notification"
                    className="text-gray-500 hover:text-red-400 disabled:opacity-50"
                  >
                    <Trash2 size={16} />
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
