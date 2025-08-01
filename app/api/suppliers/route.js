import dbConnect from "@/lib/mongodb"
import Supplier from "@/models/Supplier"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    await dbConnect()
    const suppliers = await Supplier.find({}).sort({ createdAt: -1 })
    return NextResponse.json(suppliers)
  } catch (error) {
    console.error("Get suppliers error:", error)
    return NextResponse.json({ error: "Failed to fetch suppliers" }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    await dbConnect()
    const data = await request.json()
    const supplier = await Supplier.create(data)
    return NextResponse.json(supplier, { status: 201 })
  } catch (error) {
    console.error("Create supplier error:", error)
    if (error.code === 11000) {
      return NextResponse.json({ error: "Invoice number already exists" }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to create supplier" }, { status: 500 })
  }
}
