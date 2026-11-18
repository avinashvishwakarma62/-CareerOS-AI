
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import WorkspaceShell from "@/components/WorkspaceShell";
import { Building2, Plus, Trash2, ExternalLink } from "lucide-react";

type Company = {
  id: string;
  name: string;
  role: string | null;
  website: string | null;
  notes: string | null;
};

export default function CompanyPreparationPage() {
  const [userId, setUserId] = useState("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [website, setWebsite] = useState("");
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
        .from("companies")
        .select("id,name,role,website,notes")
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: false });

      if (error) setError(error.message);
      else setCompanies(data || []);

      setLoading(false);
    }

    load();
  }, []);

  async function addCompany(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim() || !userId) return;

    setSaving(true);
    setError("");

    const { data, error } = await supabase
      .from("companies")
      .insert({
        user_id: userId,
        name: name.trim(),
        role: role.trim() || null,
        website: website.trim() || null,
        notes: notes.trim() || null,
      })
      .select("id,name,role,website,notes")
      .single();

    if (error) setError(error.message);
    else if (data) {
      setCompanies((old) => [data, ...old]);
      setName("");
      setRole("");
      setWebsite("");
      setNotes("");
    }

    setSaving(false);
  }

  async function deleteCompany(id: string) {
    if (!window.confirm("Remove this company?")) return;

    const { error } = await supabase
      .from("companies")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) setError(error.message);
    else setCompanies((old) => old.filter((c) => c.id !== id));
  }

  return (
    <WorkspaceShell>
      <div className="space-y-7 text-white">
        <header>
          <div className="mb-3 flex items-center gap-2 text-[#20C8FF]">
            <Building2 size={20} /> PLACEMENT WORKSPACE
          </div>
          <h1 className="text-3xl font-bold">Company Preparation</h1>
          <p className="mt-2 text-gray-400">Build your target company list for placement preparation.</p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-[#11111e] p-5">
            <p className="text-sm text-gray-400">Target companies</p>
            <p className="mt-3 text-3xl font-bold">{companies.length}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#11111e] p-5">
            <p className="text-sm text-gray-400">Roles tracked</p>
            <p className="mt-3 text-3xl font-bold">{companies.filter((c) => c.role).length}</p>
          </div>
        </div>

        <form onSubmit={addCompany} className="grid gap-3 rounded-2xl border border-white/10 bg-[#11111e] p-5 sm:grid-cols-2">
          <h2 className="font-semibold sm:col-span-2">Add target company</h2>
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Company name" className="rounded-xl border border-white/10 bg-[#080811] p-3 text-sm" />
          <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Target role" className="rounded-xl border border-white/10 bg-[#080811] p-3 text-sm" />
          <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="Company website (optional)" className="rounded-xl border border-white/10 bg-[#080811] p-3 text-sm" />
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Preparation notes (optional)" className="rounded-xl border border-white/10 bg-[#080811] p-3 text-sm" />
          <button disabled={saving} className="flex items-center justify-center gap-2 rounded-xl bg-[#9855FF] p-3 font-semibold disabled:opacity-50 sm:col-span-2">
            <Plus size={18} /> {saving ? "Saving..." : "Add Company"}
          </button>
        </form>

        {error && <p className="rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}

        <section>
          <h2 className="mb-4 text-lg font-bold">Your target companies</h2>
          {loading ? <p className="text-gray-400">Loading...</p> : companies.length === 0 ? (
            <p className="rounded-xl border border-white/10 p-8 text-center text-gray-400">No companies added yet.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {companies.map((company) => (
                <article key={company.id} className="rounded-2xl border border-white/10 bg-[#11111e] p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold">{company.name}</h3>
                      <p className="mt-1 text-sm text-[#20C8FF]">{company.role || "Role not specified"}</p>
                    </div>
                    <button onClick={() => deleteCompany(company.id)} aria-label="Delete company" className="text-gray-500 hover:text-red-400"><Trash2 size={18} /></button>
                  </div>
                  {company.notes && <p className="mt-4 text-sm text-gray-400">{company.notes}</p>}
                  {company.website && (
                    <a
                      href={/^(https?:\/\/)/i.test(company.website) ? company.website : `https://${company.website}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex items-center gap-2 text-sm text-[#20C8FF]"
                    >
                      Company website <ExternalLink size={15} />
                    </a>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </WorkspaceShell>
  );
}
