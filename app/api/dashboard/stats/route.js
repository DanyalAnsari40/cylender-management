import dbConnect from "@/lib/mongodb"
import Sale from "@/models/Sale"
import Customer from "@/models/Customer"
import User from "@/models/User"
import Product from "@/models/Product"
import CylinderTransaction from "@/models/Cylinder"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    await dbConnect()

    // Calculate gas sales revenue (sum of all sales)
    const gasSalesResult = await Sale.aggregate([
      {
        $group: {
          _id: null,
          gasSalesRevenue: { $sum: "$totalAmount" },
          gasSalesPaid: { $sum: "$amountPaid" },
          totalDue: { $sum: { $subtract: ["$totalAmount", "$amountPaid"] } },
          totalSales: { $sum: 1 },
        },
      },
    ])

    const gasSales = gasSalesResult[0] || { gasSalesRevenue: 0, gasSalesPaid: 0, totalDue: 0, totalSales: 0 }

    // Calculate cylinder revenue (sum of all cylinder transactions)
    const cylinderRevenueResult = await CylinderTransaction.aggregate([
      {
        $group: {
          _id: null,
          cylinderRevenue: { $sum: "$amount" },
          totalTransactions: { $sum: 1 },
        },
      },
    ])

    const cylinderRevenue = cylinderRevenueResult[0] || { cylinderRevenue: 0, totalTransactions: 0 }

    // Get customer count
    const customerCount = await Customer.countDocuments()

    // Get employee count
    const employeeCount = await User.countDocuments({ role: "employee" })

    // Get product count
    const productCount = await Product.countDocuments()

    // Calculate products sold (sum of quantities from sales items)
    const productsSoldResult = await Sale.aggregate([
      { $unwind: "$items" },
      {
        $group: {
          _id: null,
          totalQuantity: { $sum: "$items.quantity" },
        },
      },
    ])

    const productsSold = productsSoldResult[0]?.totalQuantity || 0

    // Calculate total combined revenue
    const totalCombinedRevenue = gasSales.gasSalesRevenue + cylinderRevenue.cylinderRevenue

    return NextResponse.json({
      totalRevenue: totalCombinedRevenue, // Total business revenue (gas + cylinder)
      gasSales: gasSales.gasSalesRevenue, // Total gas sales revenue
      cylinderRefills: cylinderRevenue.cylinderRevenue, // Cylinder revenue
      totalDue: gasSales.totalDue, // Outstanding amounts
      totalCustomers: customerCount,
      totalEmployees: employeeCount,
      totalProducts: productCount,
      productsSold: productsSold,
      totalSales: gasSales.totalSales,
      totalCombinedRevenue: totalCombinedRevenue,
      totalPaid: gasSales.gasSalesPaid, // Amount actually received
    })
  } catch (error) {
    console.error("Dashboard stats error:", error)
    return NextResponse.json({ error: "Failed to fetch dashboard stats" }, { status: 500 })
  }
}
