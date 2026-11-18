
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import WorkspaceShell from "@/components/WorkspaceShell";
import { Brain, Plus, Trash2, Target, TrendingUp } from "lucide-react";

type Goal = {
  id: string;
  target_role: string;
  target_company: string | null;
  target_date: string | null;
};

type Skill = {
  id: string;
  name: string;
  proficiency: number;
  category: string | null;
};

export default function CareerIntelligencePage() {
  const [userId, setUserId] = useState("");
  const [goals, setGoals] = useState<Goal[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [skillName, setSkillName] = useState("");
  const [category, setCategory] = useState("Technical");
  const [level, setLevel] = useState("1");
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

      const [g, s] = await Promise.all([
        supabase.from("career_goals")
          .select("id,target_role,target_company,target_date")
          .eq("user_id", auth.user.id)
          .order("created_at", { ascending: false }),
        supabase.from("skills")
          .select("id,name,proficiency,category")
          .eq("user_id", auth.user.id)
          .order("created_at", { ascending: false }),
      ]);

      if (g.error) setError(g.error.message);
      else setGoals(g.data || []);

      if (s.error) setError(s.error.message);
      else setSkills(s.data || []);

      setLoading(false);
    }

    load();
  }, []);

  async function addGoal(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!role.trim()) return;

    const { data, error } = await supabase.from("career_goals")
      .insert({
        user_id: userId,
        target_role: role.trim(),
        target_company: company.trim() || null,
        target_date: targetDate || null,
      })
      .select("id,target_role,target_company,target_date")
      .single();

    if (error) setError(error.message);
    else if (data) {
      setGoals((old) => [data, ...old]);
      setRole("");
      setCompany("");
      setTargetDate("");
    }
  }

  async function addSkill(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!skillName.trim()) return;

    const { data, error } = await supabase.from("skills")
      .insert({
        user_id: userId,
        name: skillName.trim(),
        category,
        proficiency: Number(level),
      })
      .select("id,name,proficiency,category")
      .single();

    if (error) setError(error.message);
    else if (data) {
      setSkills((old) => [data, ...old]);
      setSkillName("");
      setLevel("1");
    }
  }

  async function updateLevel(skill: Skill, next: number) {
    const previous = skill.proficiency;

    setSkills((old) => old.map((s) =>
      s.id === skill.id ? { ...s, proficiency: next } : s
    ));

    const { error } = await supabase.from("skills")
      .update({ proficiency: next })
      .eq("id", skill.id)
      .eq("user_id", userId);

    if (error) {
      setSkills((old) => old.map((s) =>
        s.id === skill.id ? { ...s, proficiency: previous } : s
      ));
      setError(error.message);
    }
  }

  async function deleteRecord(table: "skills" | "career_goals", id: string) {
    if (!window.confirm("Delete this record?")) return;

    const { error } = await supabase.from(table)
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) setError(error.message);
    else if (table === "skills") {
      setSkills((old) => old.filter((s) => s.id !== id));
    } else {
      setGoals((old) => old.filter((g) => g.id !== id));
    }
  }

  const average = skills.length
    ? (skills.reduce((sum, s) => sum + s.proficiency, 0) / skills.length).toFixed(1)
    : "0";

  return (
    <WorkspaceShell>
      <div className="space-y-7 text-white">
        <header>
          <div className="mb-3 flex items-center gap-2 text-[#20C8FF]">
            <Brain size={20} /> CAREER INTELLIGENCE
          </div>
          <h1 className="text-3xl font-bold">Career Intelligence</h1>
          <p className="mt-2 text-gray-400">Understand your strengths and plan your professional growth.</p>
        </header>

        <div className="grid gap-4 sm:grid-cols-3">
          {[
            ["Career Goals", goals.length],
            ["Skills Tracked", skills.length],
            ["Average Skill Level", `${average}/5`],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-2xl border border-white/10 bg-[#11111e] p-5">
              <p className="text-sm text-gray-400">{label}</p>
              <p className="mt-3 text-3xl font-bold">{value}</p>
            </div>
          ))}
        </div>

        <section className="rounded-2xl border border-white/10 bg-[#11111e] p-5">
          <h2 className="mb-4 flex items-center gap-2 font-semibold"><Target size={18} className="text-[#B58AFF]" /> Set career goal</h2>
          <form onSubmit={addGoal} className="grid gap-3 sm:grid-cols-2">
            <input required value={role} onChange={(e) => setRole(e.target.value)} placeholder="Target role e.g. Software Engineer" className="rounded-xl border border-white/10 bg-[#080811] p-3 text-sm" />
            <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Target company (optional)" className="rounded-xl border border-white/10 bg-[#080811] p-3 text-sm" />
            <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="rounded-xl border border-white/10 bg-[#080811] p-3 text-sm" />
            <button className="rounded-xl bg-[#9855FF] p-3 font-semibold">Save Career Goal</button>
          </form>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#11111e] p-5">
          <h2 className="mb-4 flex items-center gap-2 font-semibold"><TrendingUp size={18} className="text-[#20C8FF]" /> Add your skills</h2>
          <form onSubmit={addSkill} className="grid gap-3 sm:grid-cols-2">
            <input required value={skillName} onChange={(e) => setSkillName(e.target.value)} placeholder="Skill e.g. C++, React" className="rounded-xl border border-white/10 bg-[#080811] p-3 text-sm" />
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-xl border border-white/10 bg-[#080811] p-3 text-sm">
              <option>Technical</option><option>Soft Skill</option><option>Core Subject</option><option>Other</option>
            </select>
            <select value={level} onChange={(e) => setLevel(e.target.value)} className="rounded-xl border border-white/10 bg-[#080811] p-3 text-sm">
              <option value="1">1 - Beginner</option>
              <option value="2">2 - Basic</option>
              <option value="3">3 - Intermediate</option>
              <option value="4">4 - Advanced</option>
              <option value="5">5 - Expert</option>
            </select>
            <button className="rounded-xl bg-[#9855FF] p-3 font-semibold">Add Skill</button>
          </form>
        </section>

        {error && <p className="rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}

        <section>
          <h2 className="mb-4 text-lg font-bold">Career goals</h2>
          {loading ? <p className="text-gray-400">Loading...</p> : goals.length === 0 ? (
            <p className="rounded-xl border border-white/10 p-6 text-gray-400">No career goals added.</p>
          ) : goals.map((goal) => (
            <article key={goal.id} className="mb-3 flex items-center gap-3 rounded-xl border border-white/10 bg-[#11111e] p-4">
              <Target className="text-[#B58AFF]" />
              <div className="flex-1">
                <h3 className="font-semibold">{goal.target_role}</h3>
                <p className="text-xs text-gray-400">{goal.target_company || "No target company"} {goal.target_date ? `· Target ${goal.target_date}` : ""}</p>
              </div>
              <button onClick={() => deleteRecord("career_goals", goal.id)} aria-label="Delete goal" className="text-gray-500 hover:text-red-400"><Trash2 size={18} /></button>
            </article>
          ))}
        </section>

        <section>
          <h2 className="mb-4 text-lg font-bold">Skill inventory</h2>
          {skills.length === 0 ? (
            <p className="rounded-xl border border-white/10 p-6 text-gray-400">No skills tracked yet.</p>
          ) : skills.map((skill) => (
            <article key={skill.id} className="mb-3 rounded-xl border border-white/10 bg-[#11111e] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{skill.name}</h3>
                  <p className="text-xs text-gray-400">{skill.category}</p>
                </div>
                <button onClick={() => deleteRecord("skills", skill.id)} aria-label="Delete skill" className="text-gray-500 hover:text-red-400"><Trash2 size={18} /></button>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={skill.proficiency}
                  onChange={(e) => updateLevel(skill, Number(e.target.value))}
                  className="flex-1 accent-[#9855FF]"
                  aria-label={`${skill.name} proficiency`}
                />
                <span className="text-sm text-[#20C8FF]">{skill.proficiency}/5</span>
              </div>
            </article>
          ))}
        </section>
      </div>
    </WorkspaceShell>
  );
}
