import dbConnect from "@/lib/mongodb"
import User from "@/models/User"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    await dbConnect()

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: "admin@gmail.com" })
    if (existingAdmin) {
      return NextResponse.json({ message: "Admin already exists" })
    }

    // Create default admin user
    const admin = await User.create({
      name: "Administrator",
      email: "admin@gmail.com",
      password: "admin",
      role: "admin",
    })

    return NextResponse.json({ message: "Admin user created successfully" })
  } catch (error) {
    console.error("Init error:", error)
    return NextResponse.json({ error: "Failed to initialize admin user" }, { status: 500 })
  }
}
