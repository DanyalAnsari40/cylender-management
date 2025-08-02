import dbConnect from "@/lib/mongodb";
import Notification from "@/models/Notification";
import { NextResponse } from "next/server";

export async function GET(request) {
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
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const type = searchParams.get("type");
    const unread = searchParams.get("unread");

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    // Build query object
    const query = { recipient: userId };
    if (type) {
      query.type = type;
    }
    if (unread === "true") {
      query.isRead = false;
    }

    const notifications = await Notification.find(query)
      .populate("sender", "name")
      .sort({ createdAt: -1 })
      .limit(50);

    return NextResponse.json(notifications);
  } catch (error) {
    console.error("Notifications GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
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
    const data = await request.json();

    // Validate required fields
    if (!data.userId || !data.message) {
      return NextResponse.json(
        { error: "userId and message are required" },
        { status: 400 }
      );
    }

    // Create notification
    const notification = await Notification.create({
      recipient: data.userId,
      sender: data.senderId || null,
      type: data.type || 'general',
      title: data.title || 'Notification',
      message: data.message,
      isRead: data.read || false,
    });

    const populatedNotification = await Notification.findById(notification._id)
      .populate("sender", "name")
      .populate("recipient", "name");

    return NextResponse.json(populatedNotification, { status: 201 });
  } catch (error) {
    console.error("Notifications POST error:", error);
    return NextResponse.json(
      { error: "Failed to create notification", details: error.message },
      { status: 500 }
    );
  }
}
