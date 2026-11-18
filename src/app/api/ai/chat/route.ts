
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const modeInstructions: Record<string, string> = {
  "Study Tutor": `
You are CareerOS AI Study Tutor.
Teach B.Tech engineering subjects in simple Hinglish when appropriate.
Explain concepts step by step with examples, diagrams in text, and exam-focused points.
Check understanding before moving to difficult concepts.
`,

  "Career Mentor": `
You are CareerOS AI Career Mentor.
Guide engineering students toward internships and placements.
Give realistic career roadmaps, skill-gap analysis and actionable advice.
Be supportive but honest.
`,

  "Coding Buddy": `
You are CareerOS AI Coding Buddy.
Help with programming, C++, Python, Java, web development and DSA.
Explain code line by line when needed.
Never assume the student already understands advanced concepts.
`,

  "Exam Coach": `
You are CareerOS AI Exam Coach.
Prepare students for university exams, MCQs, viva and sessionals.
Prioritize important topics, concise revision, practice questions and explanations.
`,

  "Accountability Coach": `
You are CareerOS AI Accountability Coach.
Help students build discipline and consistent study habits.
Be firm but respectful.
Break large goals into small daily actions.
`,

  "Project Guide": `
You are CareerOS AI Project Guide.
Help with engineering projects, PBL, hackathons, documentation and implementation.
Recommend practical architectures and explain technical decisions.
`,

  "Daily Planner": `
You are CareerOS AI Daily Planner.
Create realistic daily schedules based on priorities, classes, study time, breaks and rest.
Avoid unrealistic or overloaded schedules.
`,
};

const allowedModes = Object.keys(modeInstructions);

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function POST(request: NextRequest) {
  try {
    // 1. Validate environment variables
    const openaiKey = process.env.OPENAI_API_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!openaiKey || !supabaseUrl || !supabaseKey) {
      console.error("Missing AI or Supabase environment configuration.");

      return NextResponse.json(
        { error: "AI service is not properly configured." },
        { status: 500 }
      );
    }

    // 2. Validate authentication
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

    const supabase = createClient(supabaseUrl, supabaseKey, {
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
        { error: "Invalid or expired session. Please log in again." },
        { status: 401 }
      );
    }

    // 3. Validate request body
    let body: {
      mode?: unknown;
      messages?: unknown;
    };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request format." },
        { status: 400 }
      );
    }

    const mode = body.mode;
    const messages = body.messages;

    if (typeof mode !== "string" || !allowedModes.includes(mode)) {
      return NextResponse.json(
        { error: "Invalid AI mode." },
        { status: 400 }
      );
    }

    if (
      !Array.isArray(messages) ||
      messages.length === 0 ||
      messages.length > 20
    ) {
      return NextResponse.json(
        { error: "Please provide between 1 and 20 messages." },
        { status: 400 }
      );
    }

    // 4. Validate individual messages and total input
    const validMessages = messages.every(
      (message: unknown) => {
        if (!message || typeof message !== "object") {
          return false;
        }

        const item = message as Record<string, unknown>;

        return (
          (item.role === "user" || item.role === "assistant") &&
          typeof item.content === "string" &&
          item.content.trim().length > 0 &&
          item.content.length <= 8000
        );
      }
    );

    if (!validMessages) {
      return NextResponse.json(
        { error: "Invalid message format or message length." },
        { status: 400 }
      );
    }

    const chatMessages = messages as ChatMessage[];

    const totalCharacters = chatMessages.reduce(
      (total, message) => total + message.content.length,
      0
    );

    if (totalCharacters > 24000) {
      return NextResponse.json(
        { error: "Conversation is too long. Please start a new chat." },
        { status: 400 }
      );
    }

    if (chatMessages[chatMessages.length - 1].role !== "user") {
      return NextResponse.json(
        { error: "The latest message must be from the user." },
        { status: 400 }
      );
    }

    // 5. Initialize OpenAI only after configuration validation
    const openai = new OpenAI({
      apiKey: openaiKey,
      timeout: 60000,
      maxRetries: 1,
    });

    // 6. Generate AI response
    const response = await openai.responses.create({
      model: "gpt-6-luna",
      instructions: modeInstructions[mode],
      input: chatMessages.map((message) => ({
        role: message.role,
        content: message.content.trim(),
      })),
      max_output_tokens: 1200,
      store: false,
    });

    const reply = response.output_text?.trim();

    if (!reply) {
      return NextResponse.json(
        { error: "AI returned an empty response. Please try again." },
        { status: 502 }
      );
    }

    // 7. Return response
    return NextResponse.json({
      success: true,
      reply,
      mode,
    });

  } catch (error) {
    console.error("CareerOS AI error:", error);

    return NextResponse.json(
      {
        error: "AI service is temporarily unavailable. Please try again.",
      },
      { status: 500 }
    );
  }
}
