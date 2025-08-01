import dbConnect from "@/lib/mongodb"
import User from "@/models/User"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    await dbConnect()
    const employees = await User.find({ role: "employee" }).select("-password").sort({ createdAt: -1 })
    return NextResponse.json(employees)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch employees" }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    await dbConnect()
    const data = await request.json()

    const employee = await User.create({
      ...data,
      role: "employee",
    })

    const { password, ...employeeData } = employee.toObject()
    return NextResponse.json(employeeData, { status: 201 })
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json({ error: "Email already exists" }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to create employee" }, { status: 500 })
  }
}
