import dbConnect from "@/lib/mongodb"
import StockAssignment from "@/models/StockAssignment"
import Notification from "@/models/Notification"
import { NextResponse } from "next/server"

export async function PUT(request, { params }) {
  try {
    await dbConnect()

    const assignment = await StockAssignment.findByIdAndUpdate(
      params.id,
      {
        status: "received",
        receivedDate: new Date(),
      },
      { new: true },
    )
      .populate("employee", "name")
      .populate("assignedBy", "name")

    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
    }

    // Create notification for admin
    await Notification.create({
      recipient: assignment.assignedBy._id,
      sender: assignment.employee._id,
      type: "stock_received",
      title: "Stock Received",
      message: `${assignment.employee.name} has received the assigned stock.`,
      relatedId: assignment._id,
    })

    return NextResponse.json(assignment)
  } catch (error) {
    return NextResponse.json({ error: "Failed to update assignment" }, { status: 500 })
  }
}
