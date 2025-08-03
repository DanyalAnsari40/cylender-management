import { NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import EmployeeCylinderTransaction from "@/models/EmployeeCylinderTransaction"

// GET a single transaction by ID
export async function GET(request, { params }) {
  try {
    await dbConnect()
    const transaction = await EmployeeCylinderTransaction.findById(params.id)
      .populate('customer', 'name phone address')
      .populate('employee', 'name')
      .populate('product')

    if (!transaction) {
      return NextResponse.json({ success: false, error: "Transaction not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: transaction })
  } catch (error) {
    console.error('Error fetching employee cylinder transaction:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch transaction' }, { status: 500 })
  }
}

// UPDATE a transaction by ID
export async function PUT(request, { params }) {
  try {
    await dbConnect()
    const body = await request.json()

    const transaction = await EmployeeCylinderTransaction.findByIdAndUpdate(
      params.id,
      body,
      { new: true, runValidators: true }
    )

    if (!transaction) {
      return NextResponse.json({ success: false, error: "Transaction not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: transaction })
  } catch (error) {
    console.error('Error updating employee cylinder transaction:', error)
    return NextResponse.json({ success: false, error: 'Failed to update transaction' }, { status: 500 })
  }
}

// DELETE a transaction by ID
export async function DELETE(request, { params }) {
  try {
    await dbConnect()
    const deletedTransaction = await EmployeeCylinderTransaction.findByIdAndDelete(params.id)

    if (!deletedTransaction) {
      return NextResponse.json({ success: false, error: "Transaction not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: {} })
  } catch (error) {
    console.error('Error deleting employee cylinder transaction:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete transaction' }, { status: 500 })
  }
}
