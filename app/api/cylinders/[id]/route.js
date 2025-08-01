import dbConnect from "@/lib/mongodb";
import CylinderTransaction from "@/models/Cylinder";
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
    const transaction = await CylinderTransaction.findById(id)
      .populate("customer", "name phone address email");
    
    if (!transaction) {
      return NextResponse.json(
        { error: "Cylinder transaction not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(transaction);
  } catch (error) {
    console.error("Cylinder GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch cylinder transaction", details: error.message },
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
    
    const transaction = await CylinderTransaction.findByIdAndUpdate(
      id,
      data,
      { new: true, runValidators: true }
    ).populate("customer", "name phone address email");
    
    if (!transaction) {
      return NextResponse.json(
        { error: "Cylinder transaction not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(transaction);
  } catch (error) {
    console.error("Cylinder PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update cylinder transaction", details: error.message },
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
    const transaction = await CylinderTransaction.findByIdAndDelete(id);
    
    if (!transaction) {
      return NextResponse.json(
        { error: "Cylinder transaction not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Cylinder transaction deleted successfully" });
  } catch (error) {
    console.error("Cylinder DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete cylinder transaction", details: error.message },
      { status: 500 }
    );
  }
}
