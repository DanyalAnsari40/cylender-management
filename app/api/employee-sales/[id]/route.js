import { NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import EmployeeSale from "@/models/EmployeeSale"

// PUT /api/employee-sales/[id]
// Aligns with POST schema: items[], totalAmount, paymentMethod, paymentStatus, receivedAmount, notes, customer
export async function PUT(request, { params }) {
  try {
    await dbConnect()

    const { id } = params
    const body = await request.json()

    const {
      customer,
      items,
      totalAmount,
      paymentMethod,
      paymentStatus,
      receivedAmount,
      notes,
      customerSignature,
    } = body

    const existing = await EmployeeSale.findById(id)
    if (!existing) {
      return NextResponse.json({ error: "Employee sale not found" }, { status: 404 })
    }

    const updateData = {}

    if (customer !== undefined) updateData.customer = customer
    if (items !== undefined) updateData.items = items
    if (totalAmount !== undefined) {
      const ta = Number(totalAmount)
      if (Number.isNaN(ta)) {
        return NextResponse.json({ error: "totalAmount must be a number" }, { status: 400 })
      }
      updateData.totalAmount = ta
    }
    if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod
    if (paymentStatus !== undefined) updateData.paymentStatus = paymentStatus
    if (receivedAmount !== undefined) {
      const ra = Number(receivedAmount)
      if (Number.isNaN(ra) || ra < 0) {
        return NextResponse.json({ error: "receivedAmount must be a non-negative number" }, { status: 400 })
      }
      updateData.receivedAmount = ra
    }
    if (notes !== undefined) updateData.notes = notes
    if (customerSignature !== undefined) updateData.customerSignature = customerSignature

    const updated = await EmployeeSale.findByIdAndUpdate(id, updateData, { new: true })
      .populate("customer", "name email phone")
      .populate("items.product", "name category")
      .populate("employee", "name email")

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating employee sale:", error)
    return NextResponse.json({ error: "Failed to update employee sale" }, { status: 500 })
  }
}
