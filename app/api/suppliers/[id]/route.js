import dbConnect from "@/lib/mongodb"
import Supplier from "@/models/Supplier"
import { NextResponse } from "next/server"

export async function PUT(request, { params }) {
  try {
    await dbConnect()
    const data = await request.json()
    // Ensure invoiceNumber is not used anymore
    if (data && Object.prototype.hasOwnProperty.call(data, 'invoiceNumber')) {
      delete data.invoiceNumber
    }
    const supplier = await Supplier.findByIdAndUpdate(params.id, data, { new: true, runValidators: true })

    if (!supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 })
    }

    return NextResponse.json(supplier)
  } catch (error) {
    console.error("Update supplier error:", error)
    if (error?.name === 'ValidationError') {
      const messages = Object.values(error.errors || {}).map((e) => e.message)
      return NextResponse.json({ error: messages.join(', ') || 'Validation failed' }, { status: 400 })
    }
    if (error?.code === 11000) {
      const fields = Object.keys(error.keyValue || {})
      return NextResponse.json({ error: `Duplicate value for: ${fields.join(', ')}` }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to update supplier" }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    await dbConnect()
    const supplier = await Supplier.findByIdAndDelete(params.id)

    if (!supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Supplier deleted successfully" })
  } catch (error) {
    console.error("Delete supplier error:", error)
    return NextResponse.json({ error: "Failed to delete supplier" }, { status: 500 })
  }
}
