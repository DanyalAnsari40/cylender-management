import { NextRequest, NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import PurchaseOrder from "@/models/PurchaseOrder"
import { verifyToken } from "@/lib/auth"

// GET - Fetch single purchase order
export async function GET(request, { params }) {
  try {
    // Verify authentication
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()
    
    const purchaseOrder = await PurchaseOrder.findById(params.id)
      .populate('supplier', 'companyName')
      .populate('product', 'name')
    
    if (!purchaseOrder) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 })
    }
    
    return NextResponse.json({ data: purchaseOrder })
  } catch (error) {
    console.error("Error fetching purchase order:", error)
    return NextResponse.json({ error: "Failed to fetch purchase order" }, { status: 500 })
  }
}

// PUT - Update purchase order
export async function PUT(request, { params }) {
  try {
    // Verify authentication
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()
    
    const body = await request.json()
    const {
      supplier,
      product,
      purchaseDate,
      purchaseType,
      quantity,
      unitPrice,
      totalAmount,
      notes,
      status
    } = body

    // Validate required fields
    if (!supplier || !product || !purchaseDate || !purchaseType || !quantity || !unitPrice) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const purchaseOrder = await PurchaseOrder.findByIdAndUpdate(
      params.id,
      {
        supplier,
        product,
        purchaseDate,
        purchaseType,
        quantity: Number(quantity),
        unitPrice: Number(unitPrice),
        totalAmount: Number(totalAmount),
        notes: notes || "",
        status: status || "pending"
      },
      { new: true }
    ).populate('supplier', 'companyName')
     .populate('product', 'name')
    
    if (!purchaseOrder) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 })
    }
    
    return NextResponse.json({ data: purchaseOrder })
  } catch (error) {
    console.error("Error updating purchase order:", error)
    return NextResponse.json({ error: "Failed to update purchase order" }, { status: 500 })
  }
}

// DELETE - Delete purchase order
export async function DELETE(request, { params }) {
  try {
    // Verify authentication
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()
    
    const purchaseOrder = await PurchaseOrder.findByIdAndDelete(params.id)
    
    if (!purchaseOrder) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 })
    }
    
    return NextResponse.json({ message: "Purchase order deleted successfully" })
  } catch (error) {
    console.error("Error deleting purchase order:", error)
    return NextResponse.json({ error: "Failed to delete purchase order" }, { status: 500 })
  }
}
