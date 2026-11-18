
export type NavigationItem = {
  title: string;
  href: string;
  icon: string;
  description: string;
};

export type NavigationGroup = {
  title: string;
  items: NavigationItem[];
};

export const navigationGroups: NavigationGroup[] = [
  {
    title: "OVERVIEW",
    items: [
      {
        title: "Dashboard",
        href: "/",
        icon: "layout-dashboard",
        description: "Your personal overview and AI insights",
      },
      {
        title: "Daily Missions",
        href: "/daily-missions",
        icon: "target",
        description: "Manage your daily goals",
      },
      {
        title: "Daily AI Briefing",
        href: "/daily-briefing",
        icon: "sunrise",
        description: "Your personalized daily action plan",
      },
      {
        title: "Calendar",
        href: "/calendar",
        icon: "calendar-days",
        description: "Manage your schedule",
      },
      {
        title: "Notifications",
        href: "/notifications",
        icon: "bell",
        description: "Manage reminders and alerts",
      },
    ],
  },
  {
    title: "PERSONAL AI",
    items: [
      {
        title: "AI Companion",
        href: "/personal-ai",
        icon: "bot",
        description: "Your seven AI assistants",
      },
      {
        title: "AI Voice Assistant",
        href: "/voice-assistant",
        icon: "mic",
        description: "Talk to your AI assistant",
      },
      {
        title: "Journal",
        href: "/journal",
        icon: "book-heart",
        description: "Record thoughts and reflections",
      },
      {
        title: "Weekly Review",
        href: "/weekly-review",
        icon: "clipboard-check",
        description: "Review your weekly performance",
      },
    ],
  },
  {
    title: "ACADEMICS",
    items: [
      {
        title: "Academics",
        href: "/academics",
        icon: "graduation-cap",
        description: "Subjects, exams and assignments",
      },
      {
        title: "CGPA Calculator",
        href: "/cgpa-calculator",
        icon: "calculator",
        description: "Calculate SGPA and CGPA",
      },
      {
        title: "Attendance",
        href: "/attendance",
        icon: "calendar-check",
        description: "Track subject-wise attendance",
      },
      {
        title: "Exam Preparation",
        href: "/exam-preparation",
        icon: "book-open-check",
        description: "Syllabus, revision and AI MCQs",
      },
      {
        title: "Learning Roadmap",
        href: "/learning-roadmap",
        icon: "map",
        description: "Your learning journey",
      },
    ],
  },
  {
    title: "CODING & SKILLS",
    items: [
      {
        title: "Coding & DSA",
        href: "/coding-dsa",
        icon: "code",
        description: "Track coding practice",
      },
      {
        title: "DSA Analytics",
        href: "/dsa-analytics",
        icon: "chart-no-axes-combined",
        description: "Analyze topic-wise coding progress",
      },
      {
        title: "Habit Tracker",
        href: "/habit-tracker",
        icon: "flame",
        description: "Build consistent habits",
      },
      {
        title: "Habit Analytics",
        href: "/habit-analytics",
        icon: "activity",
        description: "Analyze habit consistency",
      },
    ],
  },
  {
    title: "CAREER & PLACEMENTS",
    items: [
      {
        title: "Career Intelligence",
        href: "/career-intelligence",
        icon: "brain",
        description: "Career goals and skill gaps",
      },
      {
        title: "Company Preparation",
        href: "/company-preparation",
        icon: "building-2",
        description: "Prepare for placements",
      },
      {
        title: "Placement Readiness",
        href: "/placement-readiness",
        icon: "target",
        description: "Track your placement preparation",
      },
      {
        title: "Interview Prep",
        href: "/interview-prep",
        icon: "briefcase-business",
        description: "Practice company interviews with AI",
      },
      {
        title: "Resume Builder",
        href: "/resume-builder",
        icon: "file-user",
        description: "Build your professional resume",
      },
      {
        title: "Internship Tracker",
        href: "/internship-tracker",
        icon: "briefcase",
        description: "Track internship applications",
      },
    ],
  },
  {
    title: "PRODUCTIVITY & INSIGHTS",
    items: [
      {
        title: "Analytics",
        href: "/analytics",
        icon: "chart-no-axes-combined",
        description: "Track your overall progress",
      },
      {
        title: "Memory Center",
        href: "/memory-center",
        icon: "brain-circuit",
        description: "Your personal learning memory",
      },
    ],
  },
  {
    title: "PREFERENCES",
    items: [
      {
        title: "Settings",
        href: "/settings",
        icon: "settings",
        description: "Profile, privacy and preferences",
      },
    ],
  },
];
