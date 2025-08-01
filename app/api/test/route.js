import dbConnect from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await dbConnect();
    return NextResponse.json({ message: "MongoDB connection successful" });
  } catch (error) {
    console.error("Test route error:", error);
    return NextResponse.json(
      { error: "MongoDB connection failed", details: error.message },
      { status: 500 }
    );
  }
}
