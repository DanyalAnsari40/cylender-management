import { NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import EmployeeSale from "@/models/EmployeeSale"
import Product from "@/models/Product"
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

    const sales = await EmployeeSale.find({ employee: employeeId })
      .populate("customer", "name email phone")
      .populate("items.product", "name category")
      .populate("employee", "name email")
      .sort({ createdAt: -1 })

    return NextResponse.json(sales)
  } catch (error) {
    console.error("Error fetching employee sales:", error)
    return NextResponse.json({ error: "Failed to fetch employee sales" }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    await dbConnect()
    
    const body = await request.json()
    const { employeeId, customer, items, totalAmount, paymentMethod, paymentStatus, notes, customerSignature } = body

    // Validate required fields
    if (!employeeId || !customer || !items || items.length === 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Generate invoice number
    const lastSale = await EmployeeSale.findOne().sort({ createdAt: -1 })
    const lastInvoiceNumber = lastSale?.invoiceNumber || "EMP-0000"
    const invoiceNumber = `EMP-${String(parseInt(lastInvoiceNumber.split("-")[1]) + 1).padStart(4, "0")}`

    // Validate stock availability and calculate totals
    let calculatedTotal = 0
    const validatedItems = []

    for (const item of items) {
      const product = await Product.findById(item.product)
      if (!product) {
        return NextResponse.json({ error: `Product not found: ${item.product}` }, { status: 400 })
      }

      // Check stock availability
      if (product.currentStock < item.quantity) {
        return NextResponse.json({ 
          error: `Insufficient stock for ${product.name}. Available: ${product.currentStock}, Requested: ${item.quantity}` 
        }, { status: 400 })
      }

      // Use product's cost price
      const itemTotal = product.costPrice * item.quantity
      calculatedTotal += itemTotal

      validatedItems.push({
        product: item.product,
        quantity: item.quantity,
        price: product.costPrice,
        total: itemTotal
      })
    }

    // Create the sale
    const newSale = new EmployeeSale({
      invoiceNumber,
      employee: employeeId,
      customer,
      items: validatedItems,
      totalAmount: calculatedTotal,
      paymentMethod: paymentMethod || "cash",
      paymentStatus: paymentStatus || "paid",
      notes: notes || "",
      customerSignature: customerSignature || ""
    })

    const savedSale = await newSale.save()

    // Update product stock
    for (const item of validatedItems) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { currentStock: -item.quantity } }
      )
      console.log(`Updated stock for product ${item.product}: reduced by ${item.quantity}`)
    }

    // Populate the response
    const populatedSale = await EmployeeSale.findById(savedSale._id)
      .populate("customer", "name email phone")
      .populate("items.product", "name category")
      .populate("employee", "name email")

    console.log("Employee sale created successfully:", populatedSale.invoiceNumber)
    return NextResponse.json(populatedSale, { status: 201 })
  } catch (error) {
    console.error("Error creating employee sale:", error)
    return NextResponse.json({ error: "Failed to create employee sale" }, { status: 500 })
  }
}
