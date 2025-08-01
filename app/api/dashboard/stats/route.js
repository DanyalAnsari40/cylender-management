import dbConnect from "@/lib/mongodb"
import Sale from "@/models/Sale"
import Customer from "@/models/Customer"
import User from "@/models/User"
import Product from "@/models/Product"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    await dbConnect()

    // Calculate total revenue (sum of all amountPaid)
    const revenueResult = await Sale.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$amountPaid" },
          totalDue: { $sum: "$amountDue" },
          totalSales: { $sum: 1 },
        },
      },
    ])

    const revenue = revenueResult[0] || { totalRevenue: 0, totalDue: 0, totalSales: 0 }

    // Get customer count
    const customerCount = await Customer.countDocuments()

    // Get employee count
    const employeeCount = await User.countDocuments({ role: "employee" })

    // Get product count
    const productCount = await Product.countDocuments()

    // Calculate products sold (sum of quantities)
    const productsSoldResult = await Sale.aggregate([
      {
        $group: {
          _id: null,
          totalQuantity: { $sum: "$quantity" },
        },
      },
    ])

    const productsSold = productsSoldResult[0]?.totalQuantity || 0

    return NextResponse.json({
      totalRevenue: revenue.totalRevenue,
      totalDue: revenue.totalDue,
      totalCustomers: customerCount,
      totalEmployees: employeeCount,
      totalProducts: productCount,
      productsSold: productsSold,
      totalSales: revenue.totalSales,
    })
  } catch (error) {
    console.error("Dashboard stats error:", error)
    return NextResponse.json({ error: "Failed to fetch dashboard stats" }, { status: 500 })
  }
}
