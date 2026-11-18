
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import WorkspaceShell from "@/components/WorkspaceShell";
import { CalendarDays, Plus, Trash2, Loader2 } from "lucide-react";

type Event = {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_type: string | null;
};

export default function CalendarPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [userId, setUserId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventType, setEventType] = useState("Personal");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadEvents() {
      const { data: auth } = await supabase.auth.getUser();

      if (!auth.user) {
        window.location.replace("/login");
        return;
      }

      setUserId(auth.user.id);

      const { data, error } = await supabase
        .from("events")
        .select("id,title,description,event_date,event_type")
        .eq("user_id", auth.user.id)
        .order("event_date", { ascending: true });

      if (error) setError(error.message);
      else setEvents(data || []);

      setLoading(false);
    }

    loadEvents();
  }, []);

  async function addEvent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!title.trim() || !eventDate || !userId) return;

    setSaving(true);
    setError("");

    const { data, error } = await supabase
      .from("events")
      .insert({
        user_id: userId,
        title: title.trim(),
        description: description.trim() || null,
        event_date: eventDate,
        event_type: eventType,
      })
      .select("id,title,description,event_date,event_type")
      .single();

    if (error) setError(error.message);
    else if (data) {
      setEvents((old) =>
        [...old, data].sort((a, b) =>
          a.event_date.localeCompare(b.event_date)
        )
      );
      setTitle("");
      setDescription("");
      setEventDate("");
      setEventType("Personal");
    }

    setSaving(false);
  }

  async function deleteEvent(id: string) {
    if (!window.confirm("Delete this event?")) return;

    const { error } = await supabase
      .from("events")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) setError(error.message);
    else setEvents((old) => old.filter((event) => event.id !== id));
  }

  const groupedEvents = events.reduce<Record<string, Event[]>>(
    (groups, event) => {
      groups[event.event_date] ||= [];
      groups[event.event_date].push(event);
      return groups;
    },
    {}
  );

  return (
    <WorkspaceShell>
      <div className="space-y-7 text-white">
        <header>
          <div className="mb-3 flex items-center gap-2 text-[#20C8FF]">
            <CalendarDays size={20} />
            <span className="text-xs font-bold tracking-widest">
              SCHEDULE WORKSPACE
            </span>
          </div>
          <h1 className="text-3xl font-bold">Calendar</h1>
          <p className="mt-2 text-gray-400">
            Keep track of exams, deadlines and personal events.
          </p>
        </header>

        <section className="rounded-2xl border border-white/10 bg-[#11111e] p-5">
          <h2 className="mb-4 font-semibold">Add a calendar event</h2>
          <form onSubmit={addEvent} className="grid gap-3 sm:grid-cols-2">
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title"
              className="rounded-xl border border-white/10 bg-[#080811] p-3 text-sm"
            />
            <input
              required
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="rounded-xl border border-white/10 bg-[#080811] p-3 text-sm"
            />
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="rounded-xl border border-white/10 bg-[#080811] p-3 text-sm"
            >
              <option>Personal</option>
              <option>Exam</option>
              <option>Assignment</option>
              <option>College</option>
              <option>Interview</option>
              <option>Other</option>
            </select>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)"
              className="rounded-xl border border-white/10 bg-[#080811] p-3 text-sm"
            />
            <button
              disabled={saving}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#9855FF] p-3 font-semibold disabled:opacity-50 sm:col-span-2"
            >
              <Plus size={18} />
              {saving ? "Saving..." : "Add Event"}
            </button>
          </form>
        </section>

        {error && (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </p>
        )}

        <section>
          <h2 className="mb-4 text-lg font-bold">Upcoming schedule</h2>

          {loading ? (
            <Loader2 className="animate-spin text-[#B58AFF]" />
          ) : events.length === 0 ? (
            <p className="rounded-xl border border-white/10 p-8 text-center text-gray-400">
              No events scheduled yet.
            </p>
          ) : (
            <div className="space-y-5">
              {Object.entries(groupedEvents).map(([date, dayEvents]) => (
                <div key={date}>
                  <h3 className="mb-3 text-sm font-semibold text-[#20C8FF]">
                    {new Date(`${date}T12:00:00`).toLocaleDateString(
                      undefined,
                      { weekday: "long", day: "numeric", month: "long", year: "numeric" }
                    )}
                  </h3>

                  <div className="space-y-2">
                    {dayEvents.map((event) => (
                      <article
                        key={event.id}
                        className="flex items-center gap-4 rounded-xl border border-white/10 bg-[#11111e] p-4"
                      >
                        <div className="min-w-0 flex-1">
                          <h4 className="font-semibold">{event.title}</h4>
                          <p className="mt-1 text-xs text-gray-400">
                            {event.event_type}
                          </p>
                          {event.description && (
                            <p className="mt-1 text-sm text-gray-500">
                              {event.description}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => deleteEvent(event.id)}
                          aria-label="Delete event"
                          className="text-gray-500 hover:text-red-400"
                        >
                          <Trash2 size={18} />
                        </button>
                      </article>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </WorkspaceShell>
  );
}
