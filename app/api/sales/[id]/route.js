import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongodb"
import Sale from "@/models/Sale"
import Customer from "@/models/Customer"

export async function PUT(request, { params }) {
  try {
    await connectDB()

    const { id } = params
    const data = await request.json()

    // Get the existing sale to calculate balance changes
    const existingSale = await Sale.findById(id)
    if (!existingSale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 })
    }

    // Calculate new amounts
    const totalAmount = data.quantity * data.unitPrice
    const amountDue = totalAmount - (data.amountPaid || 0)

    const updateData = {
      customer: data.customer,
      product: data.product,
      date: data.date,
      category: data.category,
      quantity: data.quantity,
      unitPrice: data.unitPrice,
      totalAmount,
      amountPaid: data.amountPaid || 0,
      amountDue,
      notes: data.notes || "",
    }

    const sale = await Sale.findByIdAndUpdate(id, updateData, { new: true })
      .populate("customer", "name email")
      .populate("product", "name category")

    // Update customer balance (reverse old transaction and apply new one)
    const balanceDifference = amountDue - existingSale.amountDue
    await Customer.findByIdAndUpdate(data.customer, {
      $inc: { balance: balanceDifference },
    })

    return NextResponse.json({ data: sale })
  } catch (error) {
    console.error("Error updating sale:", error)
    return NextResponse.json({ error: "Failed to update sale" }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    await connectDB()

    const { id } = params

    const sale = await Sale.findById(id)
    if (!sale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 })
    }

    // Reverse customer balance
    await Customer.findByIdAndUpdate(sale.customer, {
      $inc: { balance: -sale.amountDue },
    })

    await Sale.findByIdAndDelete(id)

    return NextResponse.json({ message: "Sale deleted successfully" })
  } catch (error) {
    console.error("Error deleting sale:", error)
    return NextResponse.json({ error: "Failed to delete sale" }, { status: 500 })
  }
}
