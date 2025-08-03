import dbConnect from "@/lib/mongodb";
import StockAssignment from "@/models/StockAssignment";
import Product from "@/models/Product";
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
      .populate("product", "name category cylinderType")
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

    // Find the existing assignment with product details
    const existingAssignment = await StockAssignment.findById(id)
      .populate("product", "name currentStock category cylinderType");
    if (!existingAssignment) {
      return NextResponse.json(
        { error: "Stock assignment not found" },
        { status: 404 }
      );
    }

    // Handle stock synchronization when quantity is being updated
    if (data.quantity !== undefined && data.quantity !== existingAssignment.quantity) {
      const product = existingAssignment.product;
      const oldQuantity = existingAssignment.quantity;
      const newQuantity = data.quantity;
      const quantityDifference = newQuantity - oldQuantity;
      
      // Calculate new stock (if increasing assignment, reduce stock; if decreasing assignment, increase stock)
      const newStock = product.currentStock - quantityDifference;
      
      // Validate stock availability
      if (newStock < 0) {
        return NextResponse.json(
          { error: `Insufficient stock. Available: ${product.currentStock}, Additional needed: ${Math.abs(newStock)}` },
          { status: 400 }
        );
      }
      
      // Update product stock
      await Product.findByIdAndUpdate(product._id, {
        currentStock: newStock
      });
      
      console.log(`Stock updated for assignment change: Product ${product.name}, Old Qty: ${oldQuantity}, New Qty: ${newQuantity}, New Stock: ${newStock}`);
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
      .populate("product", "name category cylinderType")
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
    
    // Get assignment details before deletion to restore stock
    const assignmentToDelete = await StockAssignment.findById(id)
      .populate("product", "name currentStock");
    
    if (!assignmentToDelete) {
      return NextResponse.json(
        { error: "Stock assignment not found" },
        { status: 404 }
      );
    }

    // Only restore stock if the assignment was still "assigned" (not returned)
    if (assignmentToDelete.status === "assigned") {
      const product = assignmentToDelete.product;
      const restoredStock = product.currentStock + assignmentToDelete.quantity;
      
      await Product.findByIdAndUpdate(product._id, {
        currentStock: restoredStock
      });
      
      console.log(`Stock restored after deletion: Product ${product.name}, Quantity: ${assignmentToDelete.quantity}, New Stock: ${restoredStock}`);
    }
    
    const deletedAssignment = await StockAssignment.findByIdAndDelete(id);

    return NextResponse.json({ message: "Stock assignment deleted successfully" });
  } catch (error) {
    console.error("Stock assignment DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete assignment", details: error.message },
      { status: 500 }
    );
  }
}
