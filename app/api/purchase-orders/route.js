import { NextRequest, NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import PurchaseOrder from "@/models/PurchaseOrder"
import Supplier from "@/models/Supplier"
import Product from "@/models/Product"
import { verifyToken } from "@/lib/auth"

// GET - Fetch all purchase orders
export async function GET(request) {
  try {
    console.log("GET /api/purchase-orders - Starting request")
    
    // Verify authentication
    console.log("Verifying authentication...")
    const user = await verifyToken(request)
    if (!user) {
      console.log("Authentication failed")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.log("User authenticated:", user.role)

    console.log("Connecting to database...")
    await dbConnect()
    console.log("Database connected")
    
    console.log("Fetching purchase orders...")
    const purchaseOrders = await PurchaseOrder.find({})
      .populate('supplier', 'companyName')
      .populate('product', 'name')
      .sort({ createdAt: -1 })
    
    console.log(`Found ${purchaseOrders.length} purchase orders`)
    return NextResponse.json({ data: purchaseOrders })
  } catch (error) {
    console.error("Error fetching purchase orders:", error)
    console.error("Error stack:", error.stack)
    return NextResponse.json({ error: "Failed to fetch purchase orders", details: error.message }, { status: 500 })
  }
}

// POST - Create new purchase order
export async function POST(request) {
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
      status = "pending"
    } = body

    // Validate required fields
    if (!supplier || !product || !purchaseDate || !purchaseType || !quantity || !unitPrice) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Generate PO Number
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0")
    const poNumber = `PO-${year}${month}${day}-${random}`

    const purchaseOrder = new PurchaseOrder({
      supplier,
      product,
      purchaseDate,
      purchaseType,
      quantity: Number(quantity),
      unitPrice: Number(unitPrice),
      totalAmount: Number(totalAmount),
      notes: notes || "",
      status,
      poNumber,
      createdBy: user.id
    })

    await purchaseOrder.save()
    
    // Populate the saved order before returning
    const populatedOrder = await PurchaseOrder.findById(purchaseOrder._id)
      .populate('supplier', 'companyName')
      .populate('product', 'name')
    
    return NextResponse.json({ data: populatedOrder }, { status: 201 })
  } catch (error) {
    console.error("Error creating purchase order:", error)
    return NextResponse.json({ error: "Failed to create purchase order" }, { status: 500 })
  }
}
