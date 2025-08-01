import dbConnect from "@/lib/mongodb";
import CylinderTransaction from "@/models/Cylinder";
import Customer from "@/models/Customer";
import { NextResponse } from "next/server";

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
    
    // Validate customer exists
    const customer = await Customer.findById(data.customer);
    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // Create return transaction
    const transactionData = {
      ...data,
      type: "return",
      status: data.status || "pending"
    };

    const transaction = await CylinderTransaction.create(transactionData);
    const populatedTransaction = await CylinderTransaction.findById(transaction._id)
      .populate("customer", "name phone address email");

    return NextResponse.json(populatedTransaction, { status: 201 });
  } catch (error) {
    console.error("Cylinder return POST error:", error);
    return NextResponse.json(
      { error: "Failed to create cylinder return", details: error.message },
      { status: 500 }
    );
  }
}
