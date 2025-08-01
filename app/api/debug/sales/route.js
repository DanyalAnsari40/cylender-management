import { NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import Sale from "@/models/Sale"
import Customer from "@/models/Customer"
import Product from "@/models/Product"

export async function GET() {
  try {
    console.log("=== DEBUG: Checking Database Contents ===")
    await dbConnect()
    console.log("Database connected")

    // Check collections exist and have data
    const salesCount = await Sale.countDocuments()
    const customersCount = await Customer.countDocuments()
    const productsCount = await Product.countDocuments()

    console.log(`Sales count: ${salesCount}`)
    console.log(`Customers count: ${customersCount}`)
    console.log(`Products count: ${productsCount}`)

    // Get raw sales without population first
    const rawSales = await Sale.find().limit(5)
    console.log("Raw sales:", rawSales)

    // Get sales with population
    const populatedSales = await Sale.find()
      .populate("customer", "name phone address email")
      .populate("items.product", "name price category")
      .limit(5)
    
    console.log("Populated sales:", populatedSales)

    // Check for any sample customers and products
    const sampleCustomers = await Customer.find().limit(3)
    const sampleProducts = await Product.find().limit(3)

    return NextResponse.json({
      counts: {
        sales: salesCount,
        customers: customersCount,
        products: productsCount
      },
      sampleData: {
        sales: populatedSales,
        customers: sampleCustomers,
        products: sampleProducts
      },
      rawSales: rawSales
    })
  } catch (error) {
    console.error("Debug error:", error)
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 })
  }
}
