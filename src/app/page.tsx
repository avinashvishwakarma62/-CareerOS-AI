
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Menu,
  Bell,
  GraduationCap,
  Flame,
  Rocket,
  Check,
  ArrowUpRight,
  Target,
  BookOpen,
  Code2,
  BriefcaseBusiness,
  Sparkles,
  RefreshCw,
  CalendarDays,
  ClipboardList,
  ChartNoAxesCombined,
  Clock,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";

type Task = {
  id: string;
  title: string;
  detail: string | null;
  done: boolean;
};

type UpcomingItem = {
  id: string;
  title: string;
  date: string;
  type: "Assignment" | "Exam";
};

const defaultTasks = [
  { title: "Practice C++", detail: "45 minutes" },
  { title: "Solve 3 DSA problems", detail: "Arrays & Strings" },
  { title: "Study college subjects", detail: "1 hour" },
  { title: "Revise today's concepts", detail: "20 minutes" },
];

function getTodayDate() {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getLocalDateString() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function Home() {
  const router = useRouter();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [userId, setUserId] = useState("");
  const [userName, setUserName] = useState("Student");
  const [cgpa, setCgpa] = useState<string | number | null>(null);
  const [semester, setSemester] = useState<string | number | null>(null);
  const [careerGoal, setCareerGoal] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [targetCompany, setTargetCompany] = useState("");
  const [skillCount, setSkillCount] = useState(0);

  const [briefing, setBriefing] = useState("");
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [briefingError, setBriefingError] = useState("");

  const [upcomingItems, setUpcomingItems] = useState<UpcomingItem[]>([]);
  const [attendance, setAttendance] = useState<number | null>(null);
  const [solvedProblems, setSolvedProblems] = useState(0);
  const [totalProblems, setTotalProblems] = useState(0);
  const [internshipCount, setInternshipCount] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const [authLoading, setAuthLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [savingTask, setSavingTask] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const today = getTodayDate();

  const generateBriefing = useCallback(async (token: string) => {
    setBriefingLoading(true);
    setBriefingError("");

    try {
      const response = await fetch("/api/ai/daily-briefing", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Could not generate briefing."
        );
      }

      setBriefing(
        result.briefing ||
          result.summary ||
          "Your daily briefing is ready."
      );
    } catch (err) {
      console.error("Briefing error:", err);

      setBriefingError(
        err instanceof Error
          ? err.message
          : "Daily briefing is temporarily unavailable."
      );
    } finally {
      setBriefingLoading(false);
    }
  }, []);

  const loadIntelligence = useCallback(async (id: string) => {
    const todayDate = getLocalDateString();

    const [
      assignmentsResult,
      examsResult,
      attendanceResult,
      codingResult,
      codingProgressResult,
      internshipsResult,
      notificationsResult,
    ] = await Promise.all([
      supabase
        .from("assignments")
        .select("id, title, due_date, completed")
        .eq("user_id", id)
        .eq("completed", false)
        .gte("due_date", todayDate)
        .order("due_date", { ascending: true })
        .limit(5),

      supabase
        .from("exams")
        .select("id, title, exam_date")
        .eq("user_id", id)
        .gte("exam_date", todayDate)
        .order("exam_date", { ascending: true })
        .limit(5),

      supabase
        .from("attendance_records")
        .select("total_classes, attended_classes")
        .eq("user_id", id),

      supabase
        .from("coding_problems")
        .select("id")
        .eq("user_id", id),

      supabase
        .from("coding_progress")
        .select("id, solved")
        .eq("user_id", id),

      supabase
        .from("internship_applications")
        .select("id, status")
        .eq("user_id", id),

      supabase
        .from("notifications")
        .select("id")
        .eq("user_id", id)
        .eq("read", false),
    ]);

    const results = [
      assignmentsResult,
      examsResult,
      attendanceResult,
      codingResult,
      codingProgressResult,
      internshipsResult,
      notificationsResult,
    ];

    const failed = results.find((result) => result.error);

    if (failed?.error) {
      throw failed.error;
    }

    const upcoming: UpcomingItem[] = [];

    (assignmentsResult.data || []).forEach((item) => {
      if (item.due_date) {
        upcoming.push({
          id: item.id,
          title: item.title,
          date: item.due_date,
          type: "Assignment",
        });
      }
    });

    (examsResult.data || []).forEach((item) => {
      if (item.exam_date) {
        upcoming.push({
          id: item.id,
          title: item.title,
          date: item.exam_date,
          type: "Exam",
        });
      }
    });

    upcoming.sort(
      (a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    setUpcomingItems(upcoming.slice(0, 5));

    const attendanceRecords = attendanceResult.data || [];

    const total = attendanceRecords.reduce(
      (sum, item) => sum + Number(item.total_classes || 0),
      0
    );

    const attended = attendanceRecords.reduce(
      (sum, item) => sum + Number(item.attended_classes || 0),
      0
    );

    setAttendance(
      total > 0
        ? Math.round((attended / total) * 100)
        : null
    );

    setTotalProblems(codingResult.data?.length || 0);

    setSolvedProblems(
      (codingProgressResult.data || []).filter(
        (item) => item.solved
      ).length
    );

    const activeApplications = (internshipsResult.data || []).filter(
      (item) =>
        !["rejected", "withdrawn", "accepted"].includes(
          String(item.status || "").toLowerCase()
        )
    );

    setInternshipCount(activeApplications.length);
    setUnreadNotifications(notificationsResult.data?.length || 0);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function initializeDashboard() {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error || !user) {
          router.replace("/login");
          return;
        }

        if (!mounted) return;

        setUserId(user.id);

        const metadataName =
          user.user_metadata?.full_name ||
          user.email?.split("@")[0] ||
          "Student";

        setUserName(metadataName);

        const [
          taskResult,
          profileResult,
          preferenceResult,
          goalResult,
          skillsResult,
        ] = await Promise.all([
          supabase
            .from("tasks")
            .select("id, title, detail, completed")
            .eq("user_id", user.id)
            .order("created_at", { ascending: true }),

          supabase
            .from("profiles")
            .select("full_name, cgpa, semester")
            .eq("id", user.id)
            .maybeSingle(),

          supabase
            .from("user_preferences")
            .select("career_goal, target_role")
            .eq("user_id", user.id)
            .maybeSingle(),

          supabase
            .from("career_goals")
            .select("target_role, target_company")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),

          supabase
            .from("skills")
            .select("id")
            .eq("user_id", user.id),
        ]);

        if (!mounted) return;

        if (taskResult.error) {
          throw taskResult.error;
        }

        if (taskResult.data?.length) {
          setTasks(
            taskResult.data.map((task) => ({
              id: task.id,
              title: task.title,
              detail: task.detail,
              done: task.completed,
            }))
          );
        } else {
          const { data: newTasks, error: insertError } =
            await supabase
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
            throw insertError;
          }

          setTasks(
            (newTasks || []).map((task) => ({
              id: task.id,
              title: task.title,
              detail: task.detail,
              done: task.completed,
            }))
          );
        }

        if (profileResult.error) throw profileResult.error;
        if (preferenceResult.error) throw preferenceResult.error;
        if (goalResult.error) throw goalResult.error;
        if (skillsResult.error) throw skillsResult.error;

        if (profileResult.data) {
          setUserName(profileResult.data.full_name || metadataName);
          setCgpa(profileResult.data.cgpa);
          setSemester(profileResult.data.semester);
        }

        if (preferenceResult.data) {
          setCareerGoal(preferenceResult.data.career_goal || "");
          setTargetRole(preferenceResult.data.target_role || "");
        }

        if (goalResult.data) {
          setTargetRole(
            goalResult.data.target_role ||
              preferenceResult.data?.target_role ||
              ""
          );

          setTargetCompany(goalResult.data.target_company || "");
        }

        setSkillCount(skillsResult.data?.length || 0);

        await loadIntelligence(user.id);

        if (!mounted) return;

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (mounted && session?.access_token) {
          await generateBriefing(session.access_token);
        }
      } catch (err) {
        console.error("Dashboard error:", err);

        if (mounted) {
          setErrorMessage(
            err instanceof Error
              ? err.message
              : "Unable to load your dashboard."
          );
        }
      } finally {
        if (mounted) {
          setAuthLoading(false);
        }
      }
    }

    void initializeDashboard();

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
  }, [router, generateBriefing, loadIntelligence]);

  async function refreshBriefing() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      router.replace("/login");
      return;
    }

    await generateBriefing(session.access_token);
  }

  async function handleLogout() {
    setLoggingOut(true);

    const { error } = await supabase.auth.signOut();

    if (error) {
      window.alert("Logout failed: " + error.message);
      setLoggingOut(false);
      return;
    }

    router.replace("/login");
    router.refresh();
  }

  async function toggleTask(id: string) {
    if (savingTask) return;

    const task = tasks.find((item) => item.id === id);

    if (!task || !userId) return;

    const newStatus = !task.done;

    setSavingTask(id);
    setErrorMessage("");

    setTasks((previous) =>
      previous.map((item) =>
        item.id === id ? { ...item, done: newStatus } : item
      )
    );

    try {
      const { error } = await supabase
        .from("tasks")
        .update({ completed: newStatus })
        .eq("id", id)
        .eq("user_id", userId);

      if (error) throw error;
    } catch (err) {
      setTasks((previous) =>
        previous.map((item) =>
          item.id === id ? { ...item, done: task.done } : item
        )
      );

      setErrorMessage(
        "Task could not be saved: " +
          (err instanceof Error ? err.message : "Unknown error")
      );
    } finally {
      setSavingTask(null);
    }
  }

  const completed = tasks.filter((task) => task.done).length;
  const pending = tasks.length - completed;

  const progress =
    tasks.length > 0
      ? Math.round((completed / tasks.length) * 100)
      : 0;

  const formattedCgpa =
    cgpa !== null && cgpa !== undefined && cgpa !== ""
      ? String(cgpa)
      : "—";

  const careerConfigured = Boolean(
    targetRole || careerGoal || targetCompany
  );

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
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      <section className="min-h-screen min-w-0 p-4 sm:p-5 md:p-8 lg:ml-[270px]">
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
            type="button"
            onClick={() => setMenuOpen(true)}
            className="rounded-xl border border-white/10 bg-white/5 p-3 hover:bg-white/10"
            aria-label="Open navigation"
          >
            <Menu size={22} />
          </button>
        </div>

        <header className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500">
              {today || "Your dashboard"}
            </p>

            <h2 className="mt-2 text-2xl font-bold md:text-3xl">
              Good day, {userName} 👋
            </h2>

            <p className="mt-2 text-sm text-gray-400">
              Your goals need consistency. Let&apos;s make today count.
            </p>
          </div>

          <Link
            href="/notifications"
            aria-label="Notifications"
            className="relative hidden rounded-xl border border-white/10 bg-white/5 p-3 text-gray-300 transition hover:bg-white/10 sm:block"
          >
            <Bell size={20} />

            {unreadNotifications > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-600 px-1 text-[10px] font-bold">
                {unreadNotifications > 9 ? "9+" : unreadNotifications}
              </span>
            )}
          </Link>
        </header>

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
                Get help with academics, coding, exams and career planning.
                Your AI companion is ready to guide your next step.
              </p>
            </div>

            <Link
              href="/personal-ai"
              className="rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-6 py-3 text-center text-sm font-semibold transition hover:opacity-90"
            >
              Ask Your AI →
            </Link>
          </div>
        </div>

        {/* Main overview */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              title: "Current CGPA",
              value: formattedCgpa,
              note:
                semester !== null && semester !== ""
                  ? `Semester ${semester}`
                  : "Update your academic profile",
              icon: GraduationCap,
            },
            {
              title: "Daily Tasks",
              value: `${completed}/${tasks.length}`,
              note: `${pending} tasks remaining`,
              icon: Check,
            },
            {
              title: "Task Progress",
              value: `${progress}%`,
              note: "Today's mission completion",
              icon: Flame,
            },
            {
              title: "Skills Added",
              value: String(skillCount),
              note: "In your skills profile",
              icon: Rocket,
            },
          ].map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.title}
                className="rounded-2xl border border-white/10 bg-[#11111e] p-5 transition hover:border-blue-500/40"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-400">{card.title}</p>
                  <Icon size={20} className="text-violet-400" />
                </div>

                <h3 className="mt-5 text-2xl font-bold">{card.value}</h3>
                <p className="mt-2 text-xs text-gray-500">{card.note}</p>
              </div>
            );
          })}
        </div>

        {/* Dashboard Intelligence */}
        <section className="mb-8">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-wider text-blue-400">
                YOUR PERFORMANCE
              </p>

              <h3 className="mt-1 text-xl font-bold">
                Dashboard Intelligence
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                A live snapshot of your academic and career activity.
              </p>
            </div>

            <Link
              href="/analytics"
              className="hidden items-center gap-2 text-sm text-violet-300 hover:text-violet-200 sm:flex"
            >
              View analytics <ArrowUpRight size={16} />
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                title: "Attendance",
                value: attendance === null ? "—" : `${attendance}%`,
                note:
                  attendance === null
                    ? "No attendance data yet"
                    : attendance >= 75
                      ? "Above 75% threshold"
                      : "Below 75% — take care",
                icon: GraduationCap,
              },
              {
                title: "DSA Solved",
                value: String(solvedProblems),
                note: `${totalProblems} problems in your tracker`,
                icon: Code2,
              },
              {
                title: "Active Applications",
                value: String(internshipCount),
                note: "Internship applications",
                icon: BriefcaseBusiness,
              },
              {
                title: "Upcoming Deadlines",
                value: String(upcomingItems.length),
                note: "Assignments and exams",
                icon: CalendarDays,
              },
            ].map((card) => {
              const Icon = card.icon;

              return (
                <div
                  key={card.title}
                  className="rounded-2xl border border-white/10 bg-[#11111e] p-5"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-400">{card.title}</p>
                    <Icon size={20} className="text-blue-400" />
                  </div>

                  <p className="mt-5 text-2xl font-bold">{card.value}</p>
                  <p className="mt-2 text-xs text-gray-500">{card.note}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* AI Daily Briefing */}
        <div className="mb-8 rounded-2xl border border-violet-500/30 bg-gradient-to-br from-[#17132c] to-[#101323] p-6 shadow-xl">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/20">
                <Sparkles size={23} className="text-violet-300" />
              </div>

              <div>
                <h3 className="text-lg font-bold">
                  AI Daily Briefing
                </h3>
                <p className="text-xs text-gray-400">
                  Your personalized daily mentor
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void refreshBriefing()}
              disabled={briefingLoading}
              className="flex items-center justify-center gap-2 rounded-xl border border-violet-400/30 px-4 py-2.5 text-sm text-violet-300 transition hover:bg-violet-500/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={briefingLoading ? "animate-spin" : ""}
              />
              {briefingLoading ? "Generating..." : "Regenerate Briefing"}
            </button>
          </div>

          {briefingLoading && !briefing && (
            <div className="mt-6 flex items-center gap-3 text-sm text-gray-400">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
              Your AI mentor is analyzing your student profile and tasks...
            </div>
          )}

          {briefingError && (
            <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 p-4">
              <p className="text-sm text-red-300">{briefingError}</p>

              <button
                type="button"
                onClick={() => void refreshBriefing()}
                className="mt-3 text-sm font-semibold text-violet-300 hover:text-violet-200"
              >
                Try again →
              </button>
            </div>
          )}

          {briefing && (
            <div className="mt-6 whitespace-pre-wrap rounded-xl border border-white/10 bg-black/20 p-5 text-sm leading-7 text-gray-300">
              {briefing}
            </div>
          )}
        </div>

        {/* Missions and Career */}
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-[#11111e] p-6 xl:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold">
                  Today&apos;s Missions
                </h3>

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
              {tasks.length === 0 && (
                <p className="text-sm text-gray-500">
                  No missions available yet.
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
                    onChange={() => void toggleTask(task.id)}
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
                      {task.detail || "No additional details"}
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

            <Link
              href="/daily-missions"
              className="mt-6 flex items-center justify-between rounded-xl border border-white/10 p-4 text-sm text-gray-300 transition hover:border-violet-500/40 hover:bg-white/[0.03]"
            >
              Manage all missions
              <ArrowUpRight size={17} />
            </Link>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#11111e] p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/20">
                <Target size={21} className="text-violet-300" />
              </div>

              <div>
                <h3 className="font-bold">Career Goal</h3>
                <p className="text-xs text-gray-500">
                  Your career direction
                </p>
              </div>
            </div>

            {careerConfigured ? (
              <div className="mt-6 space-y-3 rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 text-sm text-gray-300">
                {careerGoal && <p>Goal: {careerGoal}</p>}
                {targetRole && <p>Target role: {targetRole}</p>}
                {targetCompany && <p>Company: {targetCompany}</p>}
              </div>
            ) : (
              <p className="mt-6 rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 text-sm leading-6 text-gray-400">
                Your target role and career goal are not configured yet.
              </p>
            )}

            <Link
              href="/career-intelligence"
              className="mt-5 flex w-full items-center justify-between rounded-xl border border-blue-500/30 px-4 py-3 text-sm text-blue-300 transition hover:bg-blue-500/10"
            >
              Explore Career Roadmap
              <ArrowUpRight size={17} />
            </Link>
          </div>
        </div>

        {/* Upcoming deadlines */}
        <section className="mt-8 rounded-2xl border border-white/10 bg-[#11111e] p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold">
                Upcoming Deadlines
              </h3>

              <p className="mt-1 text-xs text-gray-500">
                Your next assignments and exams.
              </p>
            </div>

            <CalendarDays className="text-violet-400" />
          </div>

          {upcomingItems.length === 0 ? (
            <p className="text-sm text-gray-500">
              No upcoming assignments or exams found.
            </p>
          ) : (
            <div className="space-y-3">
              {upcomingItems.map((item) => (
                <div
                  key={`${item.type}-${item.id}`}
                  className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-violet-500/10 p-2 text-violet-300">
                      {item.type === "Exam" ? (
                        <GraduationCap size={18} />
                      ) : (
                        <ClipboardList size={18} />
                      )}
                    </div>

                    <div>
                      <p className="text-sm font-medium">
                        {item.title}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {item.type}
                      </p>
                    </div>
                  </div>

                  <p className="flex items-center gap-2 text-xs text-blue-300">
                    <Clock size={14} />
                    {new Date(item.date).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}

          <Link
            href="/academics"
            className="mt-5 flex items-center justify-between rounded-xl border border-white/10 p-4 text-sm text-gray-300 transition hover:border-violet-500/40"
          >
            Open Academics
            <ArrowUpRight size={17} />
          </Link>
        </section>

        {/* Quick Access */}
        <div className="mt-8">
          <h3 className="mb-4 text-lg font-bold">Quick Access</h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                title: "Academics",
                description: "Subjects, assignments and exams",
                href: "/academics",
                icon: BookOpen,
              },
              {
                title: "Coding & DSA",
                description: "Track your coding practice",
                href: "/coding-dsa",
                icon: Code2,
              },
              {
                title: "Career Planning",
                description: "Skills and career goals",
                href: "/career-intelligence",
                icon: Target,
              },
              {
                title: "Internships",
                description: "Track your applications",
                href: "/internship-tracker",
                icon: BriefcaseBusiness,
              },
              {
                title: "Analytics",
                description: "Review your performance",
                href: "/analytics",
                icon: ChartNoAxesCombined,
              },
              {
                title: "Daily Briefing",
                description: "Get your AI-generated daily plan",
                href: "/daily-briefing",
                icon: Sparkles,
              },
              {
                title: "Notifications",
                description: "Manage reminders and alerts",
                href: "/notifications",
                icon: Bell,
              },
              {
                title: "Placement Readiness",
                description: "Review your placement preparation",
                href: "/placement-readiness",
                icon: Rocket,
              },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.title}
                  href={item.href}
                  className="group rounded-2xl border border-white/10 bg-[#11111e] p-5 transition hover:border-violet-500/40 hover:bg-white/[0.03]"
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
                    <Icon size={20} />
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{item.title}</p>

                    <ArrowUpRight
                      size={17}
                      className="text-gray-500 transition group-hover:text-violet-300"
                    />
                  </div>

                  <p className="mt-2 text-xs text-gray-500">
                    {item.description}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>

        <footer className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/10 py-6 text-xs text-gray-600 sm:flex-row">
          <p>CareerOS AI · Your Personal Student Operating System</p>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="text-gray-400 transition hover:text-red-400 disabled:opacity-50"
          >
            {loggingOut ? "Logging out..." : "Logout"}
          </button>
        </footer>
      </section>
    </main>
  );
}
