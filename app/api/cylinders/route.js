import dbConnect from "@/lib/mongodb";
import CylinderTransaction from "@/models/Cylinder";
import Customer from "@/models/Customer";
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
    const transactions = await CylinderTransaction.find({})
      .populate("customer", "name phone address email")
      .populate({
        path: "product",
        select: "name category cylinderType",
        options: { strictPopulate: false }
      })
      .sort({ createdAt: -1 });
    
    console.log(`Fetched ${transactions.length} cylinder transactions`);
    console.log('Sample transaction:', transactions[0] ? {
      id: transactions[0]._id,
      hasProduct: !!transactions[0].product,
      productName: transactions[0].product?.name || 'No product'
    } : 'No transactions found');
    
    return NextResponse.json({ data: transactions });
  } catch (error) {
    console.error("Cylinders GET error:", error);
    console.error("Error stack:", error.stack);
    return NextResponse.json(
      { error: "Failed to fetch cylinder transactions", details: error.message },
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
    
    // Validate customer exists
    const customer = await Customer.findById(data.customer);
    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    const transaction = await CylinderTransaction.create(data);
    const populatedTransaction = await CylinderTransaction.findById(transaction._id)
      .populate("customer", "name phone address email")
      .populate("product", "name category cylinderType");

    return NextResponse.json(populatedTransaction, { status: 201 });
  } catch (error) {
    console.error("Cylinders POST error:", error);
    return NextResponse.json(
      { error: "Failed to create cylinder transaction", details: error.message },
      { status: 500 }
    );
  }
}
