
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function todayInIndia(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function addDays(dateString: string, days: number): string {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));

  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

export async function POST(request: NextRequest) {
  try {
    // 1. Validate server configuration
    const apiKey = process.env.OPENAI_API_KEY;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!apiKey || !url || !key) {
      console.error("Daily briefing: Missing environment configuration.");

      return NextResponse.json(
        { error: "Daily briefing service is not properly configured." },
        { status: 500 }
      );
    }

    // 2. Validate access token
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const accessToken = authorization.slice(7).trim();

    if (!accessToken || accessToken.length > 4096) {
      return NextResponse.json(
        { error: "Invalid authentication token." },
        { status: 401 }
      );
    }

    // 3. Create authenticated Supabase client
    const supabase = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Session expired. Please log in again." },
        { status: 401 }
      );
    }

    // 4. Calculate India dates
    const today = todayInIndia();
    const tomorrow = addDays(today, 1);

    // 5. Fetch the authenticated user's information
    const [
      profileResult,
      preferenceResult,
      taskResult,
      examResult,
      assignmentResult,
      habitResult,
      habitLogResult,
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, cgpa, semester, skills")
        .eq("id", user.id)
        .maybeSingle(),

      supabase
        .from("user_preferences")
        .select("career_goal, target_role, study_schedule")
        .eq("user_id", user.id)
        .maybeSingle(),

      supabase
        .from("tasks")
        .select("title, detail, due_date, completed")
        .eq("user_id", user.id)
        .eq("completed", false)
        .order("due_date", { ascending: true })
        .limit(15),

      supabase
        .from("exams")
        .select("title, exam_date, exam_type")
        .eq("user_id", user.id)
        .gte("exam_date", today)
        .order("exam_date", { ascending: true })
        .limit(10),

      supabase
        .from("assignments")
        .select("title, due_date, completed")
        .eq("user_id", user.id)
        .eq("completed", false)
        .not("due_date", "is", null)
        .order("due_date", { ascending: true })
        .limit(10),

      supabase
        .from("habits")
        .select("id, title")
        .eq("user_id", user.id),

      supabase
        .from("habit_logs")
        .select("habit_id, completed")
        .eq("user_id", user.id)
        .eq("log_date", today),
    ]);

    // 6. Handle database errors
    const results = [
      profileResult,
      preferenceResult,
      taskResult,
      examResult,
      assignmentResult,
      habitResult,
      habitLogResult,
    ];

    const failed = results.find((result) => result.error);

    if (failed?.error) {
      console.error("Daily briefing database error:", failed.error);

      return NextResponse.json(
        {
          error:
            "Unable to load your daily information. Please check your database configuration.",
        },
        { status: 500 }
      );
    }

    // 7. Prepare student information
    const habits = habitResult.data || [];
    const habitLogs = habitLogResult.data || [];

    const briefingData = {
      date: today,
      tomorrow,

      student: {
        name: profileResult.data?.full_name || "Student",
        semester: profileResult.data?.semester ?? "Not provided",
        cgpa: profileResult.data?.cgpa ?? "Not provided",
        skills: profileResult.data?.skills ?? [],
        careerGoal: preferenceResult.data?.career_goal || "Not provided",
        targetRole: preferenceResult.data?.target_role || "Not provided",
        studySchedule:
          preferenceResult.data?.study_schedule || "Not provided",
      },

      pendingTasks: taskResult.data || [],
      upcomingExams: examResult.data || [],
      pendingAssignments: assignmentResult.data || [],

      habits: habits.map((habit) => ({
        title: habit.title,
        completedToday: habitLogs.some(
          (log) => log.habit_id === habit.id && log.completed
        ),
      })),
    };

    // 8. Generate AI briefing
    const openai = new OpenAI({
      apiKey,
      timeout: 60000,
      maxRetries: 1,
    });

    const response = await openai.responses.create({
      model: "gpt-6-luna",

      instructions: `
You are CareerOS AI Daily Briefing Assistant.

Generate a concise, useful daily briefing from the supplied student data.

Include these sections:

1. GOOD MORNING
2. TODAY'S TOP PRIORITIES
3. PENDING TASKS AND ASSIGNMENTS
4. UPCOMING EXAMS
5. HABIT CHECK-IN
6. SUGGESTED STUDY PLAN
7. ONE ACTION TO MOVE THE CAREER FORWARD

Rules:
- Use only the supplied student data.
- Never invent deadlines, tasks, exams, habits or achievements.
- Clearly mention when a section has no recorded data.
- Prioritize overdue and nearest deadlines when dates are available.
- Do not claim a task is overdue unless its date is before today.
- Use India dates and timezone when interpreting dates.
- Be realistic about time and workload.
- Use Hinglish when appropriate.
- Keep the briefing concise, encouraging and actionable.
- Do not expose private database identifiers or access tokens.
`,

      input: JSON.stringify(briefingData, null, 2),
      max_output_tokens: 1300,
      store: false,
    });

    const briefing = response.output_text?.trim();

    if (!briefing) {
      return NextResponse.json(
        { error: "AI could not generate your briefing. Please try again." },
        { status: 502 }
      );
    }

    // 9. Return dashboard-compatible response
    return NextResponse.json({
      success: true,
      date: today,
      briefing,

      dataSummary: {
        pendingTasks: briefingData.pendingTasks.length,
        upcomingExams: briefingData.upcomingExams.length,
        pendingAssignments: briefingData.pendingAssignments.length,
        habits: habits.length,
        completedHabits: habitLogs.filter((log) => log.completed).length,
      },
    });
  } catch (error) {
    console.error("Daily briefing API error:", error);

    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "development" && error instanceof Error
            ? error.message
            : "Daily briefing service is temporarily unavailable.",
      },
      { status: 500 }
    );
  }
}
