import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { email, password, fullName, empireName } = await req.json();

    // Validation
    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: "Email, password y nombre son requeridos" },
        { status: 400 }
      );
    }

    const emailClean = email.toLowerCase().trim();

    // Email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailClean)) {
      return NextResponse.json(
        { error: "Formato de email inválido" },
        { status: 400 }
      );
    }

    // Password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 8 caracteres" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const users = db.collection("users");

    // Check existing
    const existing = await users.findOne({ email: emailClean });
    if (existing) {
      return NextResponse.json(
        { error: "Este email ya está registrado" },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const result = await users.insertOne({
      email: emailClean,
      password: hashedPassword,
      fullName: fullName.trim(),
      empireName: empireName?.trim() || `${fullName.trim()}'s Empire`,
      avatarUrl: null,
      onboardingCompleted: false,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      userId: result.insertedId.toString(),
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Error al crear la cuenta" },
      { status: 500 }
    );
  }
}
