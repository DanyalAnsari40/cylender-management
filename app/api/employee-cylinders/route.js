import { NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import EmployeeCylinderTransaction from "@/models/EmployeeCylinderTransaction"
import Customer from "@/models/Customer"
import User from "@/models/User"

export async function GET(request) {
  try {
    await dbConnect()
    
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    
    if (!employeeId) {
      return NextResponse.json({ error: "Employee ID is required" }, { status: 400 })
    }

    const transactions = await EmployeeCylinderTransaction.find({ employee: employeeId })
      .populate("customer", "name email phone")
      .populate("employee", "name email")
      .sort({ createdAt: -1 })

    return NextResponse.json(transactions)
  } catch (error) {
    console.error("Error fetching employee cylinder transactions:", error)
    return NextResponse.json({ error: "Failed to fetch employee cylinder transactions" }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    await dbConnect()
    
    const body = await request.json()
    console.log("Received employee cylinder transaction data:", body)

    const {
      employeeId,
      type,
      customer,
      cylinderSize,
      quantity,
      amount,
      depositAmount,
      refillAmount,
      returnAmount,
      paymentMethod,
      cashAmount,
      bankName,
      checkNumber,
      status,
      notes
    } = body

    // Validate required fields
    if (!employeeId || !type || !customer || !cylinderSize || !quantity || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Validate cylinder size
    if (!["small", "large"].includes(cylinderSize)) {
      return NextResponse.json({ error: "Invalid cylinder size" }, { status: 400 })
    }

    // Create transaction data
    const transactionData = {
      type,
      employee: employeeId,
      customer,
      cylinderSize,
      quantity: parseInt(quantity),
      amount: parseFloat(amount),
      depositAmount: depositAmount ? parseFloat(depositAmount) : 0,
      refillAmount: refillAmount ? parseFloat(refillAmount) : 0,
      returnAmount: returnAmount ? parseFloat(returnAmount) : 0,
      paymentMethod: paymentMethod || "cash",
      cashAmount: cashAmount ? parseFloat(cashAmount) : 0,
      bankName: bankName || "",
      checkNumber: checkNumber || "",
      status: status || "pending",
      notes: notes || ""
    }

    console.log("Creating employee cylinder transaction:", transactionData)

    const newTransaction = new EmployeeCylinderTransaction(transactionData)
    const savedTransaction = await newTransaction.save()

    // Populate the response
    const populatedTransaction = await EmployeeCylinderTransaction.findById(savedTransaction._id)
      .populate("customer", "name email phone")
      .populate("employee", "name email")

    console.log("Employee cylinder transaction created successfully:", populatedTransaction._id)
    return NextResponse.json(populatedTransaction, { status: 201 })
  } catch (error) {
    console.error("Error creating employee cylinder transaction:", error)
    return NextResponse.json({ error: "Failed to create employee cylinder transaction" }, { status: 500 })
  }
}
