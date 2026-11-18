
"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import WorkspaceShell from "@/components/WorkspaceShell";
import { supabase } from "@/lib/supabase";
import { CalendarCheck2, Plus, Trash2, RefreshCw } from "lucide-react";

type Attendance = {
  id: string;
  subject_name: string;
  total_classes: number;
  attended_classes: number;
};

export default function AttendancePage() {
  const [records, setRecords] = useState<Attendance[]>([]);
  const [subject, setSubject] = useState("");
  const [total, setTotal] = useState("0");
  const [attended, setAttended] = useState("0");
  const [threshold, setThreshold] = useState("75");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadRecords = useCallback(async () => {
    try {
      const { data: userData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !userData.user) {
        setError("Please log in again.");
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("attendance_records")
        .select("id, subject_name, total_classes, attended_classes")
        .eq("user_id", userData.user.id)
        .order("subject_name");

      if (fetchError) throw fetchError;

      setRecords(data || []);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load attendance."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadRecords();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadRecords]);

  async function addRecord(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const totalValue = Number(total);
    const attendedValue = Number(attended);

    if (
      !subject.trim() ||
      !Number.isInteger(totalValue) ||
      !Number.isInteger(attendedValue) ||
      totalValue < 0 ||
      attendedValue < 0 ||
      attendedValue > totalValue
    ) {
      setError("Enter valid class counts. Attended cannot exceed total.");
      return;
    }

    setSaving(true);

    try {
      const { data: userData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !userData.user) {
        throw new Error("Please log in again.");
      }

      const { error: saveError } = await supabase
        .from("attendance_records")
        .upsert(
          {
            user_id: userData.user.id,
            subject_name: subject.trim(),
            total_classes: totalValue,
            attended_classes: attendedValue,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,subject_name" }
        );

      if (saveError) throw saveError;

      setSubject("");
      setTotal("0");
      setAttended("0");

      await loadRecords();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save attendance."
      );
    } finally {
      setSaving(false);
    }
  }

  async function updateAttendance(
    record: Attendance,
    change: "present" | "absent"
  ) {
    if (updatingId) return;

    setUpdatingId(record.id);
    setError("");

    const updated = {
      total_classes: record.total_classes + 1,
      attended_classes:
        record.attended_classes + (change === "present" ? 1 : 0),
      updated_at: new Date().toISOString(),
    };

    try {
      const { data: userData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !userData.user) {
        throw new Error("Please log in again.");
      }

      const { error: updateError } = await supabase
        .from("attendance_records")
        .update(updated)
        .eq("id", record.id)
        .eq("user_id", userData.user.id);

      if (updateError) throw updateError;

      setRecords((old) =>
        old.map((item) =>
          item.id === record.id ? { ...item, ...updated } : item
        )
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update attendance."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  async function deleteRecord(id: string) {
    if (deletingId) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this attendance record?"
    );

    if (!confirmed) return;

    setDeletingId(id);
    setError("");

    try {
      const { data: userData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !userData.user) {
        throw new Error("Please log in again.");
      }

      const { error: deleteError } = await supabase
        .from("attendance_records")
        .delete()
        .eq("id", id)
        .eq("user_id", userData.user.id);

      if (deleteError) throw deleteError;

      setRecords((old) => old.filter((item) => item.id !== id));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to delete attendance."
      );
    } finally {
      setDeletingId(null);
    }
  }

  const limit = Number(threshold);
  const validLimit =
    Number.isFinite(limit) && limit > 0 && limit < 100;

  const totalClasses = records.reduce(
    (sum, item) => sum + item.total_classes,
    0
  );

  const attendedClasses = records.reduce(
    (sum, item) => sum + item.attended_classes,
    0
  );

  const overall = totalClasses
    ? (attendedClasses / totalClasses) * 100
    : 0;

  function attendanceDetails(record: Attendance) {
    const percentage = record.total_classes
      ? (record.attended_classes / record.total_classes) * 100
      : 0;

    const required =
      validLimit && percentage < limit
        ? Math.ceil(
            (limit * record.total_classes -
              100 * record.attended_classes) /
              (100 - limit)
          )
        : 0;

    const safeBunks =
      validLimit && percentage >= limit
        ? Math.floor(
            (100 * record.attended_classes -
              limit * record.total_classes) /
              limit
          )
        : 0;

    return {
      percentage,
      required: Math.max(0, required),
      safeBunks: Math.max(0, safeBunks),
    };
  }

  return (
    <WorkspaceShell>
      <div className="mx-auto max-w-6xl space-y-7 text-white">
        <header>
          <div className="flex items-center gap-2 text-violet-400">
            <CalendarCheck2 size={20} />
            <span className="text-sm font-semibold">ACADEMIC TRACKER</span>
          </div>

          <h1 className="mt-2 text-3xl font-bold">Attendance Manager</h1>

          <p className="mt-2 text-sm text-gray-400">
            Track subject-wise attendance and monitor your attendance target.
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
            <p className="text-xs text-gray-500">Overall Attendance</p>
            <p className="mt-3 text-3xl font-bold">
              {overall.toFixed(2)}%
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#11111e] p-5">
            <p className="text-xs text-gray-500">Attended Classes</p>
            <p className="mt-3 text-3xl font-bold">{attendedClasses}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#11111e] p-5">
            <p className="text-xs text-gray-500">Total Classes</p>
            <p className="mt-3 text-3xl font-bold">{totalClasses}</p>
          </div>
        </div>

        <section className="rounded-2xl border border-white/10 bg-[#11111e] p-6">
          <h2 className="mb-4 font-bold">Attendance Target</h2>

          <label className="block max-w-xs text-xs text-gray-400">
            Required attendance percentage
            <input
              type="number"
              min="1"
              max="99"
              step="1"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white"
            />
          </label>

          <p className="mt-2 text-xs text-gray-500">
            Default target is 75%. Change it according to your institution&apos;s
            attendance policy. Use a value below 100%.
          </p>
        </section>

        <form
          onSubmit={addRecord}
          className="space-y-4 rounded-2xl border border-white/10 bg-[#11111e] p-6"
        >
          <h2 className="font-bold">Add or Update Subject</h2>

          <div className="grid gap-4 sm:grid-cols-3">
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              maxLength={100}
              placeholder="Subject name"
              className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm"
            />

            <input
              type="number"
              min="0"
              step="1"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              required
              placeholder="Total classes"
              className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm"
            />

            <input
              type="number"
              min="0"
              step="1"
              value={attended}
              onChange={(e) => setAttended(e.target.value)}
              required
              placeholder="Attended classes"
              className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 py-3 text-sm font-semibold disabled:opacity-50"
          >
            <Plus size={17} />
            {saving ? "Saving..." : "Save Attendance"}
          </button>
        </form>

        <section className="rounded-2xl border border-white/10 bg-[#11111e] p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-bold">Subject-wise Attendance</h2>

            <button
              type="button"
              onClick={() => void loadRecords()}
              aria-label="Refresh attendance"
              className="rounded-lg border border-white/10 p-2 text-gray-400"
            >
              <RefreshCw size={16} />
            </button>
          </div>

          {loading ? (
            <p className="text-sm text-gray-500">
              Loading attendance...
            </p>
          ) : records.length === 0 ? (
            <p className="text-sm text-gray-500">
              No subjects added yet.
            </p>
          ) : (
            <div className="space-y-5">
              {records.map((record) => {
                const stats = attendanceDetails(record);
                const safe = validLimit && stats.percentage >= limit;

                return (
                  <div
                    key={record.id}
                    className="rounded-xl border border-white/10 p-4"
                  >
                    <div className="flex flex-wrap justify-between gap-3">
                      <div>
                        <p className="font-semibold">
                          {record.subject_name}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {record.attended_classes}/{record.total_classes} classes
                        </p>
                      </div>

                      <div className="text-right">
                        <p
                          className={`text-lg font-bold ${
                            safe ? "text-emerald-400" : "text-amber-400"
                          }`}
                        >
                          {stats.percentage.toFixed(1)}%
                        </p>

                        <p className="text-xs text-gray-500">
                          {!validLimit
                            ? "Set a valid target below 100%"
                            : safe
                              ? `${stats.safeBunks} possible absences at current threshold`
                              : `Attend next ${stats.required} consecutive classes to reach target`}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 h-2 rounded-full bg-white/10">
                      <div
                        className={`h-2 rounded-full ${
                          safe ? "bg-emerald-500" : "bg-amber-500"
                        }`}
                        style={{
                          width: `${Math.min(stats.percentage, 100)}%`,
                        }}
                      />
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={updatingId === record.id}
                        onClick={() =>
                          void updateAttendance(record, "present")
                        }
                        className="rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300 disabled:opacity-50"
                      >
                        + Present
                      </button>

                      <button
                        type="button"
                        disabled={updatingId === record.id}
                        onClick={() =>
                          void updateAttendance(record, "absent")
                        }
                        className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-300 disabled:opacity-50"
                      >
                        + Absent
                      </button>

                      <button
                        type="button"
                        disabled={deletingId === record.id}
                        onClick={() => void deleteRecord(record.id)}
                        className="ml-auto rounded-lg p-2 text-gray-500 hover:text-red-400 disabled:opacity-50"
                        aria-label="Delete attendance record"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </WorkspaceShell>
  );
}
