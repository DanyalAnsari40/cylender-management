import dbConnect from "@/lib/mongodb";
import StockAssignment from "@/models/StockAssignment";
import Notification from "@/models/Notification";
import Product from "@/models/Product";
import { NextResponse } from "next/server";

export async function GET() {
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
    const assignments = await StockAssignment.find({})
      .populate("employee", "name email")
      .populate("product", "name")
      .populate("assignedBy", "name")
      .sort({ createdAt: -1 });
    return NextResponse.json(assignments);
  } catch (error) {
    console.error("Stock assignments GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch assignments", details: error.message },
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

    // Get the product to validate and update stock
    const product = await Product.findById(data.product);
    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Check if sufficient stock is available
    if (product.currentStock < data.quantity) {
      return NextResponse.json(
        { error: `Insufficient stock. Available: ${product.currentStock}, Requested: ${data.quantity}` },
        { status: 400 }
      );
    }

    // Deduct stock from product when assigning to employee
    const updatedStock = product.currentStock - data.quantity;
    await Product.findByIdAndUpdate(data.product, {
      currentStock: updatedStock
    });

    console.log(`Stock deducted: Product ${product.name}, Quantity: ${data.quantity}, New Stock: ${updatedStock}`);

    // Create assignment with remainingQuantity initialized to the assigned quantity
    const assignmentData = {
      ...data,
      remainingQuantity: data.quantity
    };
    const assignment = await StockAssignment.create(assignmentData);

    // Create notification for employee
    await Notification.create({
      recipient: data.employee,
      sender: data.assignedBy,
      type: "stock_assignment",
      title: "New Stock Assignment",
      message: `You have been assigned new stock. Please check your dashboard.`,
      relatedId: assignment._id,
    });

    const populatedAssignment = await StockAssignment.findById(assignment._id)
      .populate("employee", "name email")
      .populate("product", "name")
      .populate("assignedBy", "name");

    return NextResponse.json(populatedAssignment, { status: 201 });
  } catch (error) {
    console.error("Stock assignments POST error:", error);
    return NextResponse.json(
      { error: "Failed to create assignment", details: error.message },
      { status: 500 }
    );
  }
}
