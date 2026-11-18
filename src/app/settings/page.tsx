
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import WorkspaceShell from "@/components/WorkspaceShell";
import { Save, LogOut, Settings, User, Bell, Briefcase } from "lucide-react";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState("");

  const [profile, setProfile] = useState({
    full_name: "",
    cgpa: "",
    semester: "",
    skills: "",
  });

  const [preferences, setPreferences] = useState({
    career_goal: "",
    target_role: "",
    study_schedule: "",
    notification_enabled: true,
  });

  useEffect(() => {
    async function loadSettings() {
      const { data: auth } = await supabase.auth.getUser();

      if (!auth.user) {
        window.location.href = "/login";
        return;
      }

      setUserId(auth.user.id);

      const [profileResult, preferenceResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name, cgpa, semester, skills")
          .eq("id", auth.user.id)
          .maybeSingle(),

        supabase
          .from("user_preferences")
          .select("career_goal, target_role, study_schedule, notification_enabled")
          .eq("user_id", auth.user.id)
          .maybeSingle(),
      ]);

      if (profileResult.error || preferenceResult.error) {
        setMessage(
          profileResult.error?.message ||
          preferenceResult.error?.message ||
          "Unable to load settings."
        );
        setLoading(false);
        return;
      }

      if (profileResult.data) {
        setProfile({
          full_name: profileResult.data.full_name || "",
          cgpa: profileResult.data.cgpa?.toString() || "",
          semester: profileResult.data.semester?.toString() || "",
          skills: Array.isArray(profileResult.data.skills)
            ? profileResult.data.skills.join(", ")
            : profileResult.data.skills || "",
        });
      }

      if (preferenceResult.data) {
        setPreferences({
          career_goal: preferenceResult.data.career_goal || "",
          target_role: preferenceResult.data.target_role || "",
          study_schedule: preferenceResult.data.study_schedule || "",
          notification_enabled:
            preferenceResult.data.notification_enabled ?? true,
        });
      }

      setLoading(false);
    }

    loadSettings();
  }, []);

  async function saveSettings() {
    if (!userId) return;

    setSaving(true);
    setMessage("");

    const cgpaValue = profile.cgpa.trim()
      ? Number(profile.cgpa)
      : null;

    const semesterValue = profile.semester.trim()
      ? Number(profile.semester)
      : null;

    if (
      (cgpaValue !== null &&
        (!Number.isFinite(cgpaValue) || cgpaValue < 0 || cgpaValue > 10)) ||
      (semesterValue !== null &&
        (!Number.isInteger(semesterValue) || semesterValue < 1 || semesterValue > 12))
    ) {
      setMessage("Please enter a valid CGPA (0–10) and semester (1–12).");
      setSaving(false);
      return;
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .upsert(
        {
          id: userId,
          full_name: profile.full_name,
          cgpa: cgpaValue,
          semester: semesterValue,
          skills: profile.skills
            .split(",")
            .map((skill) => skill.trim())
            .filter(Boolean),
        },
        { onConflict: "id" }
      );

    const { error: preferenceError } = await supabase
      .from("user_preferences")
      .upsert(
        {
          user_id: userId,
          career_goal: preferences.career_goal,
          target_role: preferences.target_role,
          study_schedule: preferences.study_schedule,
          notification_enabled: preferences.notification_enabled,
        },
        { onConflict: "user_id" }
      );

    if (profileError || preferenceError) {
      setMessage(
        profileError?.message ||
        preferenceError?.message ||
        "Unable to save settings."
      );
    } else {
      setMessage("Settings saved successfully!");
    }

    setSaving(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const inputClass =
    "mt-2 w-full rounded-xl border border-white/10 bg-[#080811] px-4 py-3 text-sm text-white outline-none focus:border-purple-500";

  if (loading) {
    return (
      <WorkspaceShell>
        <div className="min-h-screen bg-[#080811] p-8 text-gray-400">
          Loading settings...
        </div>
      </WorkspaceShell>
    );
  }

  return (
    <WorkspaceShell>
      <main className="min-h-screen bg-[#080811] p-5 text-white md:p-8">
        <div className="mx-auto max-w-4xl space-y-7">

          <header>
            <div className="mb-3 flex items-center gap-3 text-purple-400">
              <Settings size={25} />
              <span className="text-sm font-medium">PREFERENCES</span>
            </div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="mt-2 text-gray-400">
              Manage your profile, career preferences and notifications.
            </p>
          </header>

          {message && (
            <div className="rounded-xl border border-white/10 bg-[#151522] p-4 text-sm text-purple-300">
              {message}
            </div>
          )}

          <section className="rounded-2xl border border-white/10 bg-[#11111e] p-6">
            <div className="mb-6 flex items-center gap-3">
              <User className="text-purple-400" />
              <h2 className="text-lg font-semibold">Personal Profile</h2>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="text-sm text-gray-400">
                Full Name
                <input
                  className={inputClass}
                  value={profile.full_name}
                  onChange={(e) =>
                    setProfile({ ...profile, full_name: e.target.value })
                  }
                  placeholder="Your name"
                />
              </label>

              <label className="text-sm text-gray-400">
                CGPA
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.01"
                  className={inputClass}
                  value={profile.cgpa}
                  onChange={(e) =>
                    setProfile({ ...profile, cgpa: e.target.value })
                  }
                  placeholder="8.52"
                />
              </label>

              <label className="text-sm text-gray-400">
                Current Semester
                <input
                  type="number"
                  min="1"
                  max="12"
                  className={inputClass}
                  value={profile.semester}
                  onChange={(e) =>
                    setProfile({ ...profile, semester: e.target.value })
                  }
                  placeholder="3"
                />
              </label>

              <label className="text-sm text-gray-400">
                Skills (comma separated)
                <input
                  className={inputClass}
                  value={profile.skills}
                  onChange={(e) =>
                    setProfile({ ...profile, skills: e.target.value })
                  }
                  placeholder="C++, Python, HTML, CSS"
                />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#11111e] p-6">
            <div className="mb-6 flex items-center gap-3">
              <Briefcase className="text-cyan-400" />
              <h2 className="text-lg font-semibold">Career Preferences</h2>
            </div>

            <div className="space-y-5">
              <label className="block text-sm text-gray-400">
                Career Goal
                <input
                  className={inputClass}
                  value={preferences.career_goal}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      career_goal: e.target.value,
                    })
                  }
                  placeholder="e.g. Get placed in a product-based company"
                />
              </label>

              <label className="block text-sm text-gray-400">
                Target Role
                <input
                  className={inputClass}
                  value={preferences.target_role}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      target_role: e.target.value,
                    })
                  }
                  placeholder="e.g. Software Development Engineer"
                />
              </label>

              <label className="block text-sm text-gray-400">
                Study Schedule
                <textarea
                  className={inputClass}
                  rows={3}
                  value={preferences.study_schedule}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      study_schedule: e.target.value,
                    })
                  }
                  placeholder="Describe your preferred study schedule..."
                />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#11111e] p-6">
            <div className="flex items-center gap-3">
              <Bell className="text-yellow-400" />
              <div className="flex-1">
                <h2 className="font-semibold">Notifications</h2>
                <p className="mt-1 text-sm text-gray-400">
                  Save your notification preference.
                </p>
              </div>

              <input
                type="checkbox"
                checked={preferences.notification_enabled}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    notification_enabled: e.target.checked,
                  })
                }
                className="h-5 w-5 accent-purple-500"
              />
            </div>
          </section>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={saveSettings}
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-3 font-medium hover:bg-purple-500 disabled:opacity-50"
            >
              <Save size={17} />
              {saving ? "Saving..." : "Save Settings"}
            </button>

            <button
              onClick={logout}
              className="flex items-center gap-2 rounded-xl border border-red-500/30 px-6 py-3 text-red-400 hover:bg-red-500/10"
            >
              <LogOut size={17} />
              Logout
            </button>
          </div>

        </div>
      </main>
    </WorkspaceShell>
  );
}
