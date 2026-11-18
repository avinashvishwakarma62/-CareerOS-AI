
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

type Task = {
  id: string;
  title: string;
  detail: string | null;
  done: boolean;
};

const defaultTasks = [
  { title: "Practice C++", detail: "45 minutes" },
  { title: "Solve 3 DSA problems", detail: "Arrays & Strings" },
  { title: "Study college subjects", detail: "1 hour" },
  { title: "Revise today's concepts", detail: "20 minutes" },
];

const navigation = [
  ["⌂", "Dashboard"],
  ["✦", "Personal AI"],
  ["▤", "Academics"],
  ["◈", "Career Intelligence"],
  ["◎", "Learning Roadmap"],
  ["⌘", "Coding & DSA"],
  ["◉", "Habit Tracker"],
  ["⚡", "Daily Missions"],
  ["▦", "Calendar"],
  ["▧", "Resume Builder"],
  ["✉", "Internships"],
  ["▥", "Analytics"],
  ["◉", "Memory Center"],
  ["⚙", "Settings"],
];

export default function Home() {
  const router = useRouter();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [userId, setUserId] = useState("");
  const [userName, setUserName] = useState("Student");
  const [authLoading, setAuthLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeNav, setActiveNav] = useState("Dashboard");
  const [loggingOut, setLoggingOut] = useState(false);
  const [savingTask, setSavingTask] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  // AUTHENTICATION + LOAD TASKS
  useEffect(() => {
    let mounted = true;

    async function initializeDashboard() {
      try {
        const { data, error } = await supabase.auth.getUser();

        if (error || !data.user) {
          router.replace("/login");
          return;
        }

        const user = data.user;

        if (!mounted) return;

        setUserId(user.id);
        setUserName(
          user.user_metadata?.full_name ||
            user.email?.split("@")[0] ||
            "Student"
        );

        // Fetch tasks belonging to this user
        const { data: savedTasks, error: fetchError } = await supabase
          .from("tasks")
          .select("id, title, detail, completed")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true });

        if (!mounted) return;

        if (fetchError) {
          console.error("Task fetch error:", fetchError.message);
          setErrorMessage(fetchError.message);
          setAuthLoading(false);
          return;
        }

        if (savedTasks && savedTasks.length > 0) {
          setTasks(
            savedTasks.map((task) => ({
              id: task.id,
              title: task.title,
              detail: task.detail,
              done: task.completed,
            }))
          );
        } else {
          // Create default tasks for a new user
          const { data: newTasks, error: insertError } = await supabase
            .from("tasks")
            .insert(
              defaultTasks.map((task) => ({
                ...task,
                user_id: user.id,
                completed: false,
              }))
            )
            .select("id, title, detail, completed");

          if (!mounted) return;

          if (insertError) {
            console.error("Task insert error:", insertError.message);
            setErrorMessage(insertError.message);
          } else {
            setTasks(
              (newTasks || []).map((task) => ({
                id: task.id,
                title: task.title,
                detail: task.detail,
                done: task.completed,
              }))
            );
          }
        }
      } catch (error) {
        console.error("Dashboard error:", error);
        if (mounted) {
          setErrorMessage("Unable to load your dashboard.");
        }
      } finally {
        if (mounted) setAuthLoading(false);
      }
    }

    initializeDashboard();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        router.replace("/login");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  // LOGOUT
  async function handleLogout() {
    setLoggingOut(true);

    const { error } = await supabase.auth.signOut();

    if (error) {
      alert("Logout failed: " + error.message);
      setLoggingOut(false);
      return;
    }

    router.replace("/login");
    router.refresh();
  }

  // SAVE TASK COMPLETION IN DATABASE
  async function toggleTask(id: string) {
    if (savingTask) return;

    const task = tasks.find((item) => item.id === id);
    if (!task || !userId) return;

    const newStatus = !task.done;

    setSavingTask(id);
    setErrorMessage("");

    // Update the UI immediately
    setTasks((previous) =>
      previous.map((item) =>
        item.id === id ? { ...item, done: newStatus } : item
      )
    );

    const { error } = await supabase
      .from("tasks")
      .update({ completed: newStatus })
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      // Restore previous status if saving fails
      setTasks((previous) =>
        previous.map((item) =>
          item.id === id ? { ...item, done: task.done } : item
        )
      );

      setErrorMessage("Task could not be saved: " + error.message);
    }

    setSavingTask(null);
  }

  const completed = tasks.filter((task) => task.done).length;
  const progress =
    tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;

  // NAVIGATION ITEMS
  function NavigationItems() {
    return (
      <>
        {navigation.map(([icon, item]) => (
          <button
            key={item}
            onClick={() => {
              setActiveNav(item);
              setMenuOpen(false);
            }}
            className={`w-full rounded-xl px-3 py-3 text-left text-sm transition ${
              activeNav === item
                ? "border border-violet-500/30 bg-violet-500/15 font-semibold text-violet-300"
                : "text-gray-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <span className="mr-3">{icon}</span>
            {item}
          </button>
        ))}
      </>
    );
  }

  // LOADING SCREEN
  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#080811] text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
          <p className="text-sm text-gray-400">
            Loading your CareerOS workspace...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#080811] text-white">
      <div className="flex min-h-screen">

        {/* DESKTOP SIDEBAR */}
        <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-[#0d0d19] p-5 lg:flex lg:flex-col">
          <div className="mb-10 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-blue-500 text-xl font-bold">
              C
            </div>
            <div>
              <h1 className="text-lg font-bold">
                CareerOS <span className="text-violet-400">AI</span>
              </h1>
              <p className="text-xs text-gray-500">
                Your Growth Companion
              </p>
            </div>
          </div>

          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-500">
            Workspace
          </p>

          <nav className="flex-1 space-y-1 overflow-y-auto">
            <NavigationItems />
          </nav>

          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
            <p className="text-sm font-semibold text-blue-300">
              Your next milestone
            </p>
            <p className="mt-2 text-xs text-gray-400">
              Build your skills and become placement ready.
            </p>
          </div>

          <div className="mt-5 flex items-center gap-3 border-t border-white/10 pt-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-blue-500 font-bold">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{userName}</p>
              <p className="text-xs text-gray-500">CSE Student</p>
            </div>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              title="Logout"
              className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
            >
              {loggingOut ? "..." : "↪"}
            </button>
          </div>
        </aside>

        {/* MOBILE OVERLAY */}
        {menuOpen && (
          <div
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
          />
        )}

        {/* MOBILE SIDEBAR */}
        <aside
          className={`fixed left-0 top-0 z-50 flex h-full w-[82%] max-w-xs flex-col border-r border-white/10 bg-[#0d0d19] p-5 shadow-2xl transition-transform duration-300 lg:hidden ${
            menuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-blue-500 font-bold">
                C
              </div>
              <div>
                <h2 className="font-bold">
                  CareerOS <span className="text-violet-400">AI</span>
                </h2>
                <p className="text-xs text-gray-500">
                  Your Growth Companion
                </p>
              </div>
            </div>

            <button
              onClick={() => setMenuOpen(false)}
              className="rounded-lg border border-white/10 px-3 py-2 text-gray-300 hover:bg-white/10"
            >
              ✕
            </button>
          </div>

          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-500">
            Workspace
          </p>

          <nav className="flex-1 space-y-1 overflow-y-auto">
            <NavigationItems />
          </nav>

          <div className="mt-5 flex items-center gap-3 border-t border-white/10 pt-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-blue-500 font-bold">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{userName}</p>
              <p className="text-xs text-gray-500">CSE Student</p>
            </div>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400 hover:bg-red-500/20"
            >
              {loggingOut ? "..." : "Logout ↪"}
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <section className="min-w-0 flex-1 p-4 sm:p-5 md:p-8">

          {/* MOBILE TOP BAR */}
          <div className="mb-6 flex items-center justify-between lg:hidden">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-blue-500 font-bold">
                C
              </div>
              <h1 className="text-lg font-bold">
                CareerOS <span className="text-violet-400">AI</span>
              </h1>
            </div>

            <button
              onClick={() => setMenuOpen(true)}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xl hover:bg-white/10"
              aria-label="Open navigation"
            >
              ☰
            </button>
          </div>

          {/* HEADER */}
          <header className="mb-8 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">
                Wednesday, November 18, 2026
              </p>
              <h2 className="mt-2 text-2xl font-bold md:text-3xl">
                Good morning, {userName} 👋
              </h2>
              <p className="mt-2 text-sm text-gray-400">
                Let's make today productive. Your growth starts here.
              </p>
            </div>

            <button className="hidden rounded-xl border border-white/10 bg-white/5 p-3 sm:block">
              🔔
            </button>
          </header>

          {/* AI COMPANION */}
          <div className="mb-8 overflow-hidden rounded-2xl border border-violet-500/30 bg-gradient-to-r from-violet-950/70 via-[#17132c] to-blue-950/50 p-6 shadow-xl">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
              <div>
                <span className="rounded-full border border-violet-400/30 bg-violet-400/10 px-3 py-1 text-xs text-violet-300">
                  ✦ YOUR PERSONAL AI
                </span>
                <h3 className="mt-4 text-xl font-bold md:text-2xl">
                  Your AI Companion
                </h3>
                <p className="mt-2 max-w-xl text-sm leading-6 text-gray-400">
                  Need help with studies, coding or your career?
                  I'm here to guide you through every step.
                </p>
              </div>
              <button className="rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-6 py-3 text-sm font-semibold hover:opacity-90">
                Ask Your AI →
              </button>
            </div>
          </div>

          {/* OVERVIEW CARDS */}
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                title: "Current CGPA",
                value: "8.52",
                icon: "🎓",
                note: "Previously shared",
              },
              {
                title: "Daily Tasks",
                value: `${completed}/${tasks.length}`,
                icon: "✓",
                note: "Today's progress",
              },
              {
                title: "Learning Streak",
                value: "0 Days",
                icon: "🔥",
                note: "Start your streak",
              },
              {
                title: "Career Readiness",
                value: "Not assessed",
                icon: "🚀",
                note: "Complete your profile",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="rounded-2xl border border-white/10 bg-[#11111e] p-5 transition hover:border-blue-500/40"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-400">{card.title}</p>
                  <span className="text-xl">{card.icon}</span>
                </div>
                <h3 className="mt-5 text-2xl font-bold">{card.value}</h3>
                <p className="mt-2 text-xs text-gray-500">{card.note}</p>
              </div>
            ))}
          </div>

          {/* TASKS AND AI INSIGHTS */}
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">

            {/* TODAY'S MISSIONS */}
            <div className="rounded-2xl border border-white/10 bg-[#11111e] p-6 xl:col-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold">Today's Missions</h3>
                  <p className="mt-1 text-xs text-gray-500">
                    Small steps create big results.
                  </p>
                </div>
                <span className="text-sm font-semibold text-blue-400">
                  {progress}% Complete
                </span>
              </div>

              <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {errorMessage && (
                <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
                  {errorMessage}
                </p>
              )}

              <div className="mt-6 space-y-4">
                {tasks.length === 0 && !errorMessage && (
                  <p className="text-sm text-gray-500">
                    Loading your tasks...
                  </p>
                )}

                {tasks.map((task) => (
                  <label
                    key={task.id}
                    className="flex cursor-pointer items-center gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-4 transition hover:bg-white/5"
                  >
                    <input
                      type="checkbox"
                      checked={task.done}
                      disabled={savingTask === task.id}
                      onChange={() => toggleTask(task.id)}
                      className="h-5 w-5 accent-violet-500"
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm font-medium ${
                          task.done
                            ? "text-gray-500 line-through"
                            : "text-white"
                        }`}
                      >
                        {task.title}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {task.detail}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500">
                      {savingTask === task.id
                        ? "Saving..."
                        : task.done
                        ? "Completed"
                        : "Pending"}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* AI INSIGHTS */}
            <div className="rounded-2xl border border-white/10 bg-[#11111e] p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/20 text-xl">
                  ✦
                </div>
                <div>
                  <h3 className="font-bold">AI Insights</h3>
                  <p className="text-xs text-gray-500">Personal guidance</p>
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
                <p className="text-sm font-semibold text-violet-300">
                  Your next focus
                </p>
                <p className="mt-3 text-sm leading-6 text-gray-400">
                  Build consistency in C++ and DSA.
                  Start with fundamentals and gradually
                  increase problem difficulty.
                </p>
              </div>

              <div className="mt-5">
                <p className="text-sm font-semibold">Career Goal</p>
                <p className="mt-2 text-sm text-gray-400">
                  Your target company and role are not configured yet.
                </p>
              </div>

              <button className="mt-5 w-full rounded-xl border border-blue-500/30 py-3 text-sm text-blue-300 transition hover:bg-blue-500/10">
                Explore Career Roadmap →
              </button>
            </div>
          </div>

          <footer className="mt-10 border-t border-white/10 py-6 text-center text-xs text-gray-600">
            CareerOS AI · Your Personal Student Operating System
          </footer>
        </section>
      </div>
    </main>
  );
}
