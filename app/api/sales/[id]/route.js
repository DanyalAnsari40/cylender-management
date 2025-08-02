import { NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import Sale from "@/models/Sale"
import Customer from "@/models/Customer"

export async function PUT(request, { params }) {
  try {
    await dbConnect()

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
    await dbConnect()

    const { id } = params

    // Get the sale with populated product details
    const sale = await Sale.findById(id).populate('items.product')
    if (!sale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 })
    }

    console.log('Deleting sale:', sale.invoiceNumber)

    // Restore stock quantities back to products
    try {
      for (const item of sale.items) {
        if (item.product && item.product._id) {
          const currentProduct = await Product.findById(item.product._id)
          if (currentProduct) {
            const newStock = currentProduct.currentStock + item.quantity
            await Product.findByIdAndUpdate(item.product._id, {
              currentStock: newStock
            })
            console.log(`✅ Restored ${item.product.name} stock from ${currentProduct.currentStock} to ${newStock} (returned ${item.quantity} units)`)
          }
        }
      }
    } catch (stockError) {
      console.error('❌ Failed to restore product stock after sale deletion:', stockError)
      // Continue with deletion even if stock restoration fails
    }

    // Delete the sale
    await Sale.findByIdAndDelete(id)

    return NextResponse.json({ message: "Sale deleted successfully" })
  } catch (error) {
    console.error("Error deleting sale:", error)
    return NextResponse.json({ error: "Failed to delete sale" }, { status: 500 })
  }
}
