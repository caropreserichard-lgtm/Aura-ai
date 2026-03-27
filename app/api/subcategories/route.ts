import { NextRequest, NextResponse } from "next/server";
import { getSubcategories, updateSubcategories } from "@/lib/subcategories";
import { requireUserId } from "@/lib/auth-helpers";
import { Category } from "@/lib/types";

export async function GET() {
  let userId: string;
  try { userId = await requireUserId(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  try {
    const subcategories = await getSubcategories(userId);
    return NextResponse.json({ subcategories });
  } catch (error) {
    console.error("GET /api/subcategories error:", error);
    return NextResponse.json(
      { error: "Error al cargar subcategorías" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  let userId: string;
  try { userId = await requireUserId(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  try {
    const { category, subcategories } = await req.json();

    if (!category || !subcategories) {
      return NextResponse.json(
        { error: "category y subcategories son requeridos" },
        { status: 400 }
      );
    }

    await updateSubcategories(category as Category, subcategories, userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT /api/subcategories error:", error);
    const message = error instanceof Error ? error.message : "Error al actualizar";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
