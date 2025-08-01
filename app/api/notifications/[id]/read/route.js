import dbConnect from "@/lib/mongodb"
import Notification from "@/models/Notification"
import { NextResponse } from "next/server"

export async function PUT(request, { params }) {
  try {
    await dbConnect()

    const notification = await Notification.findByIdAndUpdate(params.id, { isRead: true }, { new: true }).populate(
      "sender",
      "name",
    )

    if (!notification) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 })
    }

    return NextResponse.json(notification)
  } catch (error) {
    console.error("Mark notification as read error:", error)
    return NextResponse.json({ error: "Failed to mark notification as read" }, { status: 500 })
  }
}
