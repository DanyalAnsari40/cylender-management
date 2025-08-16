import { NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import EmployeeCylinderTransaction from "@/models/EmployeeCylinderTransaction"
import Customer from "@/models/Customer"
import User from "@/models/User"
import mongoose from "mongoose"

export async function GET(request) {
  try {
    await dbConnect()

    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    const fetchAll = searchParams.get('all') === 'true'

    let query = {}

    if (fetchAll) {
      // No additional filter, fetch all transactions for admin view
    } else if (employeeId) {
      query = { employee: employeeId }
    } else {
      return NextResponse.json(
        { error: "Employee ID is required, or specify 'all=true' for admin access." },
        { status: 400 }
      )
    }

    let transactions
    try {
      transactions = await EmployeeCylinderTransaction.find(query)
        .populate('customer', 'name phone address')
        .populate('supplier', 'companyName contactPerson phone email')
        .populate('employee', 'name')
        .populate('product', 'name')
        .populate({ path: 'items.productId', model: 'Product', select: 'name', strictPopulate: false })
        .sort({ createdAt: -1 })
      console.log('[GET /api/employee-cylinders] fetched:', Array.isArray(transactions) ? transactions.length : 0,
        'sample items lens:', (transactions || []).slice(0,3).map(t => ({ id: t._id, itemsLen: Array.isArray(t.items) ? t.items.length : 0 })))
    } catch (e) {
      console.error('employee-cylinders GET populate error (items.productId). Falling back without nested populate:', e?.message)
      transactions = await EmployeeCylinderTransaction.find(query)
        .populate('customer', 'name phone address')
        .populate('supplier', 'companyName contactPerson phone email')
        .populate('employee', 'name')
        .populate('product', 'name')
        .sort({ createdAt: -1 })
    }

    return NextResponse.json({ success: true, data: transactions })
  } catch (error) {
    console.error('Error fetching employee cylinder transactions:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch employee cylinder transactions' },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    await dbConnect()
    
    const body = await request.json()
    console.log("[POST /api/employee-cylinders] received body type=", body?.type, 
      'itemsLen=', Array.isArray(body?.items) ? body.items.length : 0)

    const {
      employeeId,
      type,
      customer,
      supplier,
      product, // Single item fallback
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
      notes,
      items // optional multi-item array
    } = body

    // Validate required fields: either items[] exists with at least 1 entry, or single product fields provided
    if (!employeeId || !type) {
      return NextResponse.json({ error: "Missing required fields: employeeId and type are required" }, { status: 400 })
    }

    const hasItems = Array.isArray(items) && items.length > 0
    if (!hasItems) {
      if (!product || !cylinderSize || !quantity) {
        return NextResponse.json({ error: "Missing required fields for single-item transaction" }, { status: 400 })
      }
      if (!["small", "large"].includes(cylinderSize)) {
        return NextResponse.json({ error: "Invalid cylinder size" }, { status: 400 })
      }
      if (!mongoose.isValidObjectId(product)) {
        return NextResponse.json({ error: "Invalid product id" }, { status: 400 })
      }
    } else {
      // basic validation on items
      for (const [idx, it] of items.entries()) {
        if (!it.productId || !it.cylinderSize || !it.quantity) {
          return NextResponse.json({ error: `Invalid item at index ${idx}` }, { status: 400 })
        }
        if (!["small", "large"].includes(it.cylinderSize)) {
          return NextResponse.json({ error: `Invalid cylinder size for item at index ${idx}` }, { status: 400 })
        }
        if (!mongoose.isValidObjectId(it.productId)) {
          return NextResponse.json({ error: `Invalid product id for item at index ${idx}` }, { status: 400 })
        }
        if ((Number(it.quantity) || 0) <= 0) {
          return NextResponse.json({ error: `Quantity must be > 0 for item at index ${idx}` }, { status: 400 })
        }
        if ((Number(it.amount) || 0) < 0) {
          return NextResponse.json({ error: `Amount must be >= 0 for item at index ${idx}` }, { status: 400 })
        }
      }
    }

    if (type === 'refill') {
      if (!supplier) {
        return NextResponse.json({ error: "Supplier is required for refill" }, { status: 400 })
      }
    } else {
      if (!customer) {
        return NextResponse.json({ error: "Customer is required for this transaction" }, { status: 400 })
      }
    }

    // Compute totals
    let totalQuantity = 0
    let totalAmount = 0
    if (hasItems) {
      totalQuantity = items.reduce((s, it) => s + (Number(it.quantity) || 0), 0)
      totalAmount = items.reduce((s, it) => s + (Number(it.amount) || 0), 0)
    } else {
      totalQuantity = parseInt(quantity)
      totalAmount = parseFloat(amount)
    }

    // Create transaction data
    const transactionData = {
      type,
      employee: employeeId,
      // Backward-compat single fields: when items present, copy from first item for quick views
      product: hasItems ? items[0].productId : product,
      cylinderSize: hasItems ? items[0].cylinderSize : cylinderSize,
      quantity: totalQuantity,
      amount: totalAmount,
      depositAmount: depositAmount ? parseFloat(depositAmount) : 0,
      refillAmount: refillAmount ? parseFloat(refillAmount) : 0,
      returnAmount: returnAmount ? parseFloat(returnAmount) : 0,
      paymentMethod: paymentMethod || "cash",
      cashAmount: cashAmount ? parseFloat(cashAmount) : 0,
      bankName: bankName || "",
      checkNumber: checkNumber || "",
      status: status || "pending",
      notes: notes || "",
      items: hasItems ? items.map(it => ({
        productId: it.productId,
        productName: it.productName || '',
        cylinderSize: it.cylinderSize,
        quantity: Number(it.quantity) || 0,
        amount: Number(it.amount) || 0,
      })) : undefined,
    }

    if (type === 'refill') {
      transactionData.supplier = supplier
    } else {
      transactionData.customer = customer
    }

    console.log("[POST /api/employee-cylinders] creating with itemsLen=", Array.isArray(transactionData.items) ? transactionData.items.length : 0,
      'totalQty=', transactionData.quantity, 'totalAmt=', transactionData.amount)

    const newTransaction = new EmployeeCylinderTransaction(transactionData)
    const savedTransaction = await newTransaction.save()
    console.log('[POST /api/employee-cylinders] saved _id=', savedTransaction._id, 'itemsLen=', Array.isArray(savedTransaction.items) ? savedTransaction.items.length : 0)

    // Populate the response
    const populatedTransaction = await EmployeeCylinderTransaction.findById(savedTransaction._id)
      .populate("customer", "name email phone")
      .populate("supplier", "companyName contactPerson phone email")
      .populate("employee", "name email")
      .populate("product", "name")
      .populate({ path: 'items.productId', model: 'Product', select: 'name', strictPopulate: false })
    console.log('[POST /api/employee-cylinders] populated itemsLen=', Array.isArray(populatedTransaction?.items) ? populatedTransaction.items.length : 0)

    console.log("Employee cylinder transaction created successfully:", populatedTransaction._id)
    return NextResponse.json(populatedTransaction, { status: 201 })
  } catch (error) {
    console.error("Error creating employee cylinder transaction:", error?.message, error?.stack)
    return NextResponse.json({ error: error?.message || "Failed to create employee cylinder transaction" }, { status: 500 })
  }
}
