
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import WorkspaceShell from "@/components/WorkspaceShell";
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  BookOpen,
  BriefcaseBusiness,
  Code,
  Target,
  CalendarDays,
  Settings,
  GraduationCap,
  Brain,
  FileText,
  TrendingUp,
  Flame,
  CheckCircle2,
} from "lucide-react";

const modules: Record<
  string,
  {
    title: string;
    description: string;
    icon: typeof BookOpen;
    features: string[];
    actions: string[];
  }
> = {
  "personal-ai": {
    title: "Personal AI",
    description: "Your intelligent academic and career companion.",
    icon: Sparkles,
    features: [
      "Study Tutor",
      "Career Mentor",
      "Coding Buddy",
      "Exam Coach",
      "Accountability Coach",
      "Project Guide",
      "Daily Planner",
    ],
    actions: ["Start a conversation", "View learning history"],
  },

  "career-intelligence": {
    title: "Career Intelligence",
    description: "Understand your strengths and plan your career.",
    icon: Brain,
    features: [
      "Career assessment",
      "Skill gap analysis",
      "Career goals",
      "Personalized roadmap",
    ],
    actions: ["Set career goal", "Assess my skills"],
  },

  "company-preparation": {
    title: "Company Preparation",
    description: "Prepare strategically for placement opportunities.",
    icon: BriefcaseBusiness,
    features: [
      "Company profiles",
      "Technical interview preparation",
      "Aptitude preparation",
      "Placement readiness",
    ],
    actions: ["Explore companies", "Start preparation"],
  },

  "learning-roadmap": {
    title: "Learning Roadmap",
    description: "Build a structured path towards your goals.",
    icon: BookOpen,
    features: [
      "Learning paths",
      "Skill milestones",
      "Weekly learning targets",
      "Progress tracking",
    ],
    actions: ["Create learning path", "View milestones"],
  },

  "coding-dsa": {
    title: "Coding & DSA",
    description: "Improve problem-solving and coding consistency.",
    icon: Code,
    features: [
      "DSA problem tracker",
      "Topic-wise practice",
      "Coding progress",
      "Revision tracker",
    ],
    actions: ["Add coding problem", "View progress"],
  },

  "habit-tracker": {
    title: "Habit Tracker",
    description: "Build habits that support your growth.",
    icon: Flame,
    features: [
      "Daily habits",
      "Streak tracking",
      "Habit completion",
      "Weekly consistency",
    ],
    actions: ["Create a habit", "View streaks"],
  },

  "daily-missions": {
    title: "Daily Missions",
    description: "Turn your daily goals into achievable missions.",
    icon: Target,
    features: [
      "Daily tasks",
      "Priority management",
      "Completion tracking",
      "Daily progress",
    ],
    actions: ["Create a mission", "Review today's progress"],
  },

  calendar: {
    title: "Calendar",
    description: "Organize your academic and personal schedule.",
    icon: CalendarDays,
    features: [
      "Study schedule",
      "Important dates",
      "Exam planning",
      "Personal events",
    ],
    actions: ["Add event", "Plan your week"],
  },

  "resume-builder": {
    title: "Resume Builder",
    description: "Organize your professional profile and resume.",
    icon: FileText,
    features: [
      "Personal information",
      "Education details",
      "Technical skills",
      "Projects and experience",
    ],
    actions: ["Create resume", "Update profile"],
  },

  "internship-tracker": {
    title: "Internship Tracker",
    description: "Keep track of your internship applications.",
    icon: BriefcaseBusiness,
    features: [
      "Application tracking",
      "Company details",
      "Application status",
      "Interview dates",
    ],
    actions: ["Add application", "Review applications"],
  },

  analytics: {
    title: "Analytics",
    description: "Understand your academic and productivity progress.",
    icon: TrendingUp,
    features: [
      "Task completion",
      "Learning consistency",
      "Coding progress",
      "Career development",
    ],
    actions: ["View progress", "Review performance"],
  },

  "memory-center": {
    title: "Memory Center",
    description: "Manage your personal learning context.",
    icon: Brain,
    features: [
      "Learning history",
      "Important notes",
      "Doubt history",
      "Personal preferences",
    ],
    actions: ["View learning history", "Manage notes"],
  },

  settings: {
    title: "Settings",
    description: "Manage your account and application preferences.",
    icon: Settings,
    features: [
      "Profile settings",
      "Privacy controls",
      "Notification preferences",
      "Account management",
    ],
    actions: ["Edit profile", "Manage preferences"],
  },
};

export default function ModulePage() {
  const params = useParams<{ module: string }>();
  const slug = params.module;
  const currentModule = modules[slug];

  if (!currentModule) {
    return (
      <WorkspaceShell>
        <div className="py-10">
          <h1 className="text-2xl font-bold">Module not found</h1>
          <Link
            href="/"
            className="mt-5 inline-flex items-center gap-2 text-blue-400"
          >
            <ArrowLeft size={17} />
            Return to Dashboard
          </Link>
        </div>
      </WorkspaceShell>
    );
  }

  const Icon = currentModule.icon;

  return (
    <WorkspaceShell>
      <div className="text-white">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white"
        >
          <ArrowLeft size={17} />
          Back to Dashboard
        </Link>

        <header className="mb-8">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#9855FF] to-[#20C8FF]">
            <Icon size={27} />
          </div>

          <p className="mb-2 text-xs font-semibold tracking-widest text-[#20C8FF]">
            CAREEROS AI WORKSPACE
          </p>

          <h1 className="text-3xl font-bold md:text-4xl">
            {currentModule.title}
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-400">
            {currentModule.description}
          </p>
        </header>

        <section className="mb-8 rounded-2xl border border-[#9855FF]/30 bg-gradient-to-r from-[#9855FF]/15 to-[#20C8FF]/10 p-6">
          <div className="flex items-center gap-2 text-[#B58AFF]">
            <Sparkles size={18} />
            <span className="text-xs font-semibold">
              YOUR PERSONAL WORKSPACE
            </span>
          </div>

          <h2 className="mt-4 text-xl font-bold">
            Welcome to {currentModule.title}
          </h2>

          <p className="mt-2 text-sm text-gray-400">
            Your workspace is ready. Start organizing your journey.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-bold">
            Available Features
          </h2>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {currentModule.features.map((feature, index) => (
              <div
                key={feature}
                className="rounded-xl border border-white/10 bg-[#11111e] p-5 transition hover:border-[#9855FF]/50"
              >
                <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-[#9855FF]/15 text-[#B58AFF]">
                  <CheckCircle2 size={19} />
                </div>

                <h3 className="font-semibold">{feature}</h3>

                <p className="mt-2 text-xs text-gray-500">
                  Feature {index + 1} · Planned workspace functionality
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-white/10 bg-[#11111e] p-6">
          <h2 className="mb-5 text-lg font-bold">Quick Actions</h2>

          <div className="flex flex-wrap gap-3">
            {currentModule.actions.map((action) => (
              <div
                key={action}
                className="inline-flex items-center gap-2 rounded-xl border border-[#9855FF]/30 bg-[#9855FF]/10 px-4 py-3 text-sm text-gray-300"
              >
                {action}
                <ArrowRight size={15} />
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-gray-500">
            Interactive actions will be enabled as each module is implemented.
          </p>
        </section>

        <footer className="mt-10 border-t border-white/10 py-6 text-center text-xs text-gray-600">
          CareerOS AI · Your Personal Student Operating System
        </footer>
      </div>
    </WorkspaceShell>
  );
}
