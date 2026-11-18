
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import WorkspaceShell from "@/components/WorkspaceShell";
import { BriefcaseBusiness, Plus, Trash2, ExternalLink } from "lucide-react";

type Application = {
  id: string;
  company: string;
  role: string;
  application_date: string;
  status: string;
  job_url: string | null;
  notes: string | null;
};

const statuses = ["Applied", "Assessment", "Interview", "Selected", "Rejected"];

export default function InternshipTrackerPage() {
  const [userId, setUserId] = useState("");
  const [items, setItems] = useState<Application[]>([]);
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [date, setDate] = useState(new Date().toLocaleDateString("en-CA"));
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
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

      const { data, error } = await supabase
        .from("internship_applications")
        .select("id,company,role,application_date,status,job_url,notes")
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: false });

      if (error) setError(error.message);
      else setItems(data || []);

      setLoading(false);
    }

    load();
  }, []);

  async function addApplication(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!company.trim() || !role.trim()) return;

    setSaving(true);
    setError("");

    const { data, error } = await supabase
      .from("internship_applications")
      .insert({
        user_id: userId,
        company: company.trim(),
        role: role.trim(),
        application_date: date,
        status: "Applied",
        job_url: url.trim() || null,
        notes: notes.trim() || null,
      })
      .select("id,company,role,application_date,status,job_url,notes")
      .single();

    if (error) setError(error.message);
    else if (data) {
      setItems((old) => [data, ...old]);
      setCompany("");
      setRole("");
      setUrl("");
      setNotes("");
    }

    setSaving(false);
  }

  async function updateStatus(item: Application, status: string) {
    const { error } = await supabase
      .from("internship_applications")
      .update({ status })
      .eq("id", item.id)
      .eq("user_id", userId);

    if (error) setError(error.message);
    else {
      setItems((old) => old.map((x) =>
        x.id === item.id ? { ...x, status } : x
      ));
    }
  }

  async function deleteApplication(id: string) {
    if (!window.confirm("Delete this application?")) return;

    const { error } = await supabase
      .from("internship_applications")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) setError(error.message);
    else setItems((old) => old.filter((x) => x.id !== id));
  }

  return (
    <WorkspaceShell>
      <div className="space-y-7 text-white">
        <header>
          <div className="mb-3 flex items-center gap-2 text-[#20C8FF]">
            <BriefcaseBusiness size={20} /> CAREER WORKSPACE
          </div>
          <h1 className="text-3xl font-bold">Internship Tracker</h1>
          <p className="mt-2 text-gray-400">
            Track your applications from submission to final result.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-[#11111e] p-5">
            <p className="text-sm text-gray-400">Total applications</p>
            <p className="mt-3 text-3xl font-bold">{items.length}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#11111e] p-5">
            <p className="text-sm text-gray-400">Interviews</p>
            <p className="mt-3 text-3xl font-bold">{items.filter((x) => x.status === "Interview").length}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#11111e] p-5">
            <p className="text-sm text-gray-400">Selected</p>
            <p className="mt-3 text-3xl font-bold">{items.filter((x) => x.status === "Selected").length}</p>
          </div>
        </div>

        <form onSubmit={addApplication} className="grid gap-3 rounded-2xl border border-white/10 bg-[#11111e] p-5 sm:grid-cols-2">
          <h2 className="font-semibold sm:col-span-2">Add application</h2>
          <input required value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company name" className="rounded-xl border border-white/10 bg-[#080811] p-3 text-sm" />
          <input required value={role} onChange={(e) => setRole(e.target.value)} placeholder="Internship role" className="rounded-xl border border-white/10 bg-[#080811] p-3 text-sm" />
          <input required type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-xl border border-white/10 bg-[#080811] p-3 text-sm" />
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Job application URL" className="rounded-xl border border-white/10 bg-[#080811] p-3 text-sm" />
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" rows={2} className="rounded-xl border border-white/10 bg-[#080811] p-3 text-sm sm:col-span-2" />
          <button disabled={saving} className="flex items-center justify-center gap-2 rounded-xl bg-[#9855FF] p-3 font-semibold disabled:opacity-50 sm:col-span-2">
            <Plus size={18} /> {saving ? "Saving..." : "Add Application"}
          </button>
        </form>

        {error && <p className="rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}

        <section>
          <h2 className="mb-4 text-lg font-bold">Application history</h2>
          {loading ? <p className="text-gray-400">Loading...</p> : items.length === 0 ? (
            <p className="rounded-xl border border-white/10 p-8 text-center text-gray-400">No applications tracked yet.</p>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <article key={item.id} className="rounded-xl border border-white/10 bg-[#11111e] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{item.role}</h3>
                      <p className="mt-1 text-sm text-gray-400">{item.company} · {item.application_date}</p>
                    </div>
                    <button onClick={() => deleteApplication(item.id)} aria-label="Delete application" className="text-gray-500 hover:text-red-400"><Trash2 size={18} /></button>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <select
                      value={item.status}
                      onChange={(e) => updateStatus(item, e.target.value)}
                      className="rounded-xl border border-white/10 bg-[#080811] p-2 text-sm"
                    >
                      {statuses.map((status) => <option key={status}>{status}</option>)}
                    </select>
                    {item.job_url && (
                      <a href={/^(https?:\/\/)/i.test(item.job_url) ? item.job_url : `https://${item.job_url}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-[#20C8FF]">
                        Open application <ExternalLink size={14} />
                      </a>
                    )}
                  </div>

                  {item.notes && <p className="mt-3 text-sm text-gray-400">{item.notes}</p>}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </WorkspaceShell>
  );
}
