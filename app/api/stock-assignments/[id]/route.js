import dbConnect from "@/lib/mongodb";
import StockAssignment from "@/models/StockAssignment";
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
    const assignment = await StockAssignment.findById(id)
      .populate("employee", "name email")
      .populate("product", "name")
      .populate("assignedBy", "name");

    if (!assignment) {
      return NextResponse.json(
        { error: "Stock assignment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(assignment);
  } catch (error) {
    console.error("Stock assignment GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch assignment", details: error.message },
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

    // Find the existing assignment
    const existingAssignment = await StockAssignment.findById(id);
    if (!existingAssignment) {
      return NextResponse.json(
        { error: "Stock assignment not found" },
        { status: 404 }
      );
    }

    // Update the assignment
    const updatedAssignment = await StockAssignment.findByIdAndUpdate(
      id,
      {
        ...(data.quantity !== undefined && { quantity: data.quantity }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.status !== undefined && { status: data.status }),
        updatedAt: new Date(),
      },
      { new: true, runValidators: true }
    )
      .populate("employee", "name email")
      .populate("product", "name")
      .populate("assignedBy", "name");

    return NextResponse.json(updatedAssignment);
  } catch (error) {
    console.error("Stock assignment PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update assignment", details: error.message },
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
    
    const deletedAssignment = await StockAssignment.findByIdAndDelete(id);
    
    if (!deletedAssignment) {
      return NextResponse.json(
        { error: "Stock assignment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Stock assignment deleted successfully" });
  } catch (error) {
    console.error("Stock assignment DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete assignment", details: error.message },
      { status: 500 }
    );
  }
}
