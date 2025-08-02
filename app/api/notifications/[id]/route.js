import dbConnect from "@/lib/mongodb";
import Notification from "@/models/Notification";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  try {
    await dbConnect();
  } catch (error) {
    console.error("Database connection error:", error);
    return NextResponse.json(
      { error: "Database connection failed", details: error.message },
      { status: 500 }
    );
  }

  try {
    const { id } = params;
    const notification = await Notification.findById(id)
      .populate("sender", "name")
      .populate("recipient", "name");

    if (!notification) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(notification);
  } catch (error) {
    console.error("Notification GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch notification", details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    await dbConnect();
  } catch (error) {
    console.error("Database connection error:", error);
    return NextResponse.json(
      { error: "Database connection failed", details: error.message },
      { status: 500 }
    );
  }

  try {
    const { id } = params;
    const data = await request.json();

    // Find the existing notification
    const existingNotification = await Notification.findById(id);
    if (!existingNotification) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    // Update the notification
    const updatedNotification = await Notification.findByIdAndUpdate(
      id,
      {
        ...(data.isRead !== undefined && { isRead: data.isRead }),
        ...(data.title !== undefined && { title: data.title }),
        ...(data.message !== undefined && { message: data.message }),
        updatedAt: new Date(),
      },
      { new: true, runValidators: true }
    )
      .populate("sender", "name")
      .populate("recipient", "name");

    return NextResponse.json(updatedNotification);
  } catch (error) {
    console.error("Notification PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update notification", details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    await dbConnect();
  } catch (error) {
    console.error("Database connection error:", error);
    return NextResponse.json(
      { error: "Database connection failed", details: error.message },
      { status: 500 }
    );
  }

  try {
    const { id } = params;
    
    const deletedNotification = await Notification.findByIdAndDelete(id);
    
    if (!deletedNotification) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Notification deleted successfully" });
  } catch (error) {
    console.error("Notification DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete notification", details: error.message },
      { status: 500 }
    );
  }
}
