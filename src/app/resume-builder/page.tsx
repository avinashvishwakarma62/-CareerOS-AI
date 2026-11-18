
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import WorkspaceShell from "@/components/WorkspaceShell";
import { FileText, Save, Printer } from "lucide-react";

type Resume = {
  full_name: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
  education: string;
  skills: string;
  projects: string;
  experience: string;
  links: string;
};

const emptyResume: Resume = {
  full_name: "",
  email: "",
  phone: "",
  location: "",
  summary: "",
  education: "",
  skills: "",
  projects: "",
  experience: "",
  links: "",
};

const fields: { key: keyof Resume; label: string; multiline?: boolean }[] = [
  { key: "full_name", label: "Full name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "location", label: "Location" },
  { key: "summary", label: "Professional summary", multiline: true },
  { key: "education", label: "Education", multiline: true },
  { key: "skills", label: "Technical skills", multiline: true },
  { key: "projects", label: "Projects", multiline: true },
  { key: "experience", label: "Experience and internships", multiline: true },
  { key: "links", label: "Portfolio, LinkedIn and GitHub links", multiline: true },
];

export default function ResumeBuilderPage() {
  const [userId, setUserId] = useState("");
  const [form, setForm] = useState<Resume>(emptyResume);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function load() {
      const { data: auth } = await supabase.auth.getUser();

      if (!auth.user) {
        window.location.replace("/login");
        return;
      }

      setUserId(auth.user.id);

      const { data, error } = await supabase
        .from("resume_profiles")
        .select("full_name,email,phone,location,summary,education,skills,projects,experience,links")
        .eq("user_id", auth.user.id)
        .maybeSingle();

      if (error) setError(error.message);
      else if (data) {
        setForm({
          full_name: data.full_name || "",
          email: data.email || "",
          phone: data.phone || "",
          location: data.location || "",
          summary: data.summary || "",
          education: data.education || "",
          skills: data.skills || "",
          projects: data.projects || "",
          experience: data.experience || "",
          links: data.links || "",
        });
      }

      setLoading(false);
    }

    load();
  }, []);

  function update(key: keyof Resume, value: string) {
    setForm((old) => ({ ...old, [key]: value }));
  }

  async function saveResume(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const { error } = await supabase.from("resume_profiles").upsert(
      { user_id: userId, ...form, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );

    if (error) setError(error.message);
    else setSuccess("Resume profile saved successfully.");

    setSaving(false);
  }

  return (
    <WorkspaceShell>
      <div className="space-y-7 text-white">
        <header>
          <div className="mb-3 flex items-center gap-2 text-[#20C8FF]">
            <FileText size={20} /> PROFESSIONAL WORKSPACE
          </div>
          <h1 className="text-3xl font-bold">Resume Builder</h1>
          <p className="mt-2 text-gray-400">
            Build and maintain your professional profile.
          </p>
        </header>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm"
          >
            <Printer size={17} /> Print / Save PDF
          </button>
        </div>

        {loading ? (
          <p className="text-gray-400">Loading resume...</p>
        ) : (
          <form onSubmit={saveResume} className="grid gap-4 sm:grid-cols-2">
            {fields.map((field) => (
              <label
                key={field.key}
                className={`space-y-2 ${field.multiline ? "sm:col-span-2" : ""}`}
              >
                <span className="text-sm text-gray-300">{field.label}</span>
                {field.multiline ? (
                  <textarea
                    rows={4}
                    value={form[field.key]}
                    onChange={(e) => update(field.key, e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#11111e] p-3 text-sm outline-none focus:border-[#9855FF]"
                  />
                ) : (
                  <input
                    value={form[field.key]}
                    onChange={(e) => update(field.key, e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#11111e] p-3 text-sm outline-none focus:border-[#9855FF]"
                  />
                )}
              </label>
            ))}

            {error && <p className="text-sm text-red-300 sm:col-span-2">{error}</p>}
            {success && <p className="text-sm text-emerald-400 sm:col-span-2">{success}</p>}

            <button
              disabled={saving}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#9855FF] p-3 font-semibold disabled:opacity-50 sm:col-span-2"
            >
              <Save size={18} /> {saving ? "Saving..." : "Save Resume"}
            </button>
          </form>
        )}
      </div>
    </WorkspaceShell>
  );
}
