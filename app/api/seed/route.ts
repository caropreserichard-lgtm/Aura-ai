import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { requireUserId } from "@/lib/auth-helpers";
import { calculateFlowScore, calculateXP } from "@/lib/scoring";
import { Category, Priority } from "@/lib/types";

const SEED_TASKS = [
  {
    title: "Configurar .env y revivir QOVE",
    category: "proyectos" as Category,
    subcategory: "QOVE Platform",
    priority: 1 as Priority,
    roi: 9,
    joy: 5,
  },
  {
    title: "Build AI Hype Engine MVP \u2014 POS \u2192 Instagram",
    category: "proyectos" as Category,
    subcategory: "AI Hype Engine",
    priority: 1 as Priority,
    roi: 10,
    joy: 8,
  },
  {
    title: "Deploy WhatsApp reservation bot",
    category: "proyectos" as Category,
    subcategory: "WhatsApp Reservation Bot",
    priority: 1 as Priority,
    roi: 9,
    joy: 7,
  },
  {
    title: "Analizar memecoins trending del d\u00EDa",
    category: "trabajo" as Category,
    subcategory: "Crypto / Memecoin",
    priority: 2 as Priority,
    roi: 8,
    joy: 7,
  },
  {
    title: "Dise\u00F1ar men\u00FA digital para el gastro bar",
    category: "trabajo" as Category,
    subcategory: "Gastro Bar Ops",
    priority: 2 as Priority,
    roi: 7,
    joy: 6,
  },
  {
    title: "Sesi\u00F3n historia: La Regeneraci\u00F3n en Colombia",
    category: "aprendizaje" as Category,
    subcategory: "Historia Colombia / LatAm",
    priority: 3 as Priority,
    roi: 2,
    joy: 9,
  },
  {
    title: "Gym \u2014 Push day",
    category: "lifestyle" as Category,
    subcategory: "Gym / Fitness",
    priority: 2 as Priority,
    roi: 1,
    joy: 7,
  },
  {
    title: "Meditaci\u00F3n 15 min",
    category: "lifestyle" as Category,
    subcategory: "Meditaci\u00F3n / Mindfulness",
    priority: 3 as Priority,
    roi: 1,
    joy: 8,
  },
];

export async function POST() {
  let userId: string;
  try { userId = await requireUserId(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  try {
    const db = await getDb();

    // Only seed if DB is empty for this user
    const count = await db.collection("tasks").countDocuments({ userId });
    if (count > 0) {
      return NextResponse.json({
        message: "La base de datos ya tiene tareas",
        count,
      });
    }

    const tasks = SEED_TASKS.map((seed) => {
      const flowScore = calculateFlowScore(seed.roi, seed.joy);
      const xp = calculateXP(flowScore, seed.category);

      return {
        ...seed,
        userId,
        description: "",
        flowScore,
        xp,
        status: "pending" as const,
        timeSpent: 0,
        dueDate: null,
        recurring: null,
        tags: [],
        sourceUrl: null,
        createdAt: new Date().toISOString(),
        completedAt: null,
      };
    });

    await db.collection("tasks").insertMany(tasks);

    return NextResponse.json({
      message: `${tasks.length} tareas seed creadas`,
      tasks,
    });
  } catch (error) {
    console.error("POST /api/seed error:", error);
    return NextResponse.json(
      { error: "Error al crear seed data" },
      { status: 500 }
    );
  }
}
