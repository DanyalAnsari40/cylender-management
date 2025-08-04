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
    const totalCombinedRevenue = (gasSales.gasSalesRevenue || 0) + (cylinderRevenue.cylinderRevenue || 0)

    // Ensure all values are numbers and not null/undefined
    const statsResponse = {
      totalRevenue: Number(totalCombinedRevenue) || 0, // Total business revenue (gas + cylinder)
      gasSales: Number(gasSales.gasSalesRevenue) || 0, // Total gas sales revenue
      cylinderRefills: Number(cylinderRevenue.cylinderRevenue) || 0, // Cylinder revenue
      totalDue: Number(gasSales.totalDue) || 0, // Outstanding amounts
      totalCustomers: Number(customerCount) || 0,
      totalEmployees: Number(employeeCount) || 0,
      totalProducts: Number(productCount) || 0,
      productsSold: Number(productsSold) || 0,
      totalSales: Number(gasSales.totalSales) || 0,
      totalCombinedRevenue: Number(totalCombinedRevenue) || 0,
      totalPaid: Number(gasSales.gasSalesPaid) || 0, // Amount actually received
    }

    console.log('Dashboard stats response:', statsResponse)
    return NextResponse.json(statsResponse)
  } catch (error) {
    console.error("Dashboard stats error:", error)
    // Return default zeros when there's an error to ensure frontend displays 0 values
    return NextResponse.json({
      totalRevenue: 0,
      gasSales: 0,
      cylinderRefills: 0,
      totalDue: 0,
      totalCustomers: 0,
      totalEmployees: 0,
      totalProducts: 0,
      productsSold: 0,
      totalSales: 0,
      totalCombinedRevenue: 0,
      totalPaid: 0,
      error: "Failed to fetch dashboard stats"
    }, { status: 200 }) // Return 200 status with error message so frontend can still show 0 values
  }
}
