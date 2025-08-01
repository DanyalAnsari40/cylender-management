import { NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import Sale from "@/models/Sale"
import Customer from "@/models/Customer"
import Product from "@/models/Product"

export async function GET() {
  try {
    await dbConnect()

    const sales = await Sale.find()
      .populate("customer", "name phone address email")
      .populate("items.product", "name price category")
      .sort({ createdAt: -1 })

    return NextResponse.json({ data: sales })
  } catch (error) {
    console.error("Sales GET error:", error)
    return NextResponse.json({ error: "Failed to fetch sales" }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    await dbConnect()

    const body = await request.json()
    const { customer, items, totalAmount, paymentMethod, paymentStatus, notes } = body

    // Validate required fields
    if (!customer || !items || items.length === 0 || !totalAmount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Verify customer exists
    const customerDoc = await Customer.findById(customer)
    if (!customerDoc) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    // Verify all products exist and get their details
    const productIds = items.map((item) => item.product)
    const products = await Product.find({ _id: { $in: productIds } })

    if (products.length !== productIds.length) {
      return NextResponse.json({ error: "One or more products not found" }, { status: 404 })
    }

    // Generate sequential invoice number like INV-2025-01
    const currentYear = new Date().getFullYear()
    const yearPrefix = `INV-${currentYear}-`
    
    // Find the latest invoice number for this year
    const latestSale = await Sale.findOne({
      invoiceNumber: { $regex: `^${yearPrefix}` }
    }).sort({ invoiceNumber: -1 })
    
    let nextNumber = 1
    if (latestSale) {
      const lastNumber = parseInt(latestSale.invoiceNumber.split('-')[2]) || 0
      nextNumber = lastNumber + 1
    }
    
    const invoiceNumber = `${yearPrefix}${nextNumber.toString().padStart(2, '0')}`

    // Create the sale
    const sale = new Sale({
      invoiceNumber,
      customer,
      items,
      totalAmount,
      paymentMethod: paymentMethod || "cash",
      paymentStatus: paymentStatus || "paid",
      notes: notes || "",
    })

    // Try to save with retry logic for duplicate key errors
    let savedSale = null
    let attempts = 0
    const maxAttempts = 5
    
    while (!savedSale && attempts < maxAttempts) {
      try {
        await sale.save()
        savedSale = sale
        break
      } catch (saveError) {
        attempts++
        
        // Handle duplicate key error by generating a new invoice number
        if (saveError.code === 11000) {
          console.log(`Duplicate invoice number ${invoiceNumber}, generating new one (attempt ${attempts})...`)
          
          // Generate a new invoice number with timestamp to ensure uniqueness
          const timestamp = Date.now().toString().slice(-4)
          const newInvoiceNumber = `${yearPrefix}${nextNumber.toString().padStart(2, '0')}-${timestamp}`
          sale.invoiceNumber = newInvoiceNumber
          nextNumber++
        } else {
          throw saveError
        }
      }
    }
    
    if (!savedSale) {
      throw new Error(`Failed to save sale after ${maxAttempts} attempts`)
    }

    // Populate the created sale for response
    const populatedSale = await Sale.findById(savedSale._id)
      .populate("customer", "name phone address email")
      .populate("items.product", "name price category")

    return NextResponse.json({
      data: populatedSale,
      message: "Sale created successfully",
    })
  } catch (error) {
    console.error("Sales POST error:", error)
    return NextResponse.json({ error: "Failed to create sale" }, { status: 500 })
  }
}
