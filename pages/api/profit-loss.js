import dbConnect from "../../lib/mongodb";
import Sale from "../../models/Sale";
import EmployeeSale from "../../models/EmployeeSale";
import Cylinder from "../../models/Cylinder";
import EmployeeCylinderTransaction from "../../models/EmployeeCylinderTransaction";
import Expense from "../../models/Expense";
import Product from "../../models/Product";

export default async function handler(req, res) {
  await dbConnect();

  try {
    // Set Cache-Control header to prevent caching
    res.setHeader('Cache-Control', 'no-store, max-age=0');

    const adminGasSales = await Sale.find({});
    const employeeGasSales = await EmployeeSale.find({});
    const adminCylinderSales = await Cylinder.find({});
    const employeeCylinderSales = await EmployeeCylinderTransaction.find({});
    const expenses = await Expense.find({});

    const allGasSales = [...adminGasSales, ...employeeGasSales];
    const allCylinderSales = [...adminCylinderSales, ...employeeCylinderSales];

    const gasSalesRevenue = allGasSales.reduce((acc, sale) => acc + sale.totalAmount, 0);
    const cylinderRevenue = allCylinderSales.reduce((acc, sale) => acc + sale.amount, 0);
    const totalRevenue = gasSalesRevenue + cylinderRevenue;

    let totalCostOfGoods = 0;
    for (const sale of allGasSales) {
      for (const item of sale.items) {
        const product = await Product.findById(item.productId);
        if (product) {
          totalCostOfGoods += (product.costPrice || 0) * item.quantity;
        }
      }
    }

    for (const sale of allCylinderSales) {
        const product = await Product.findById(sale.productId);
        if (product) {
          totalCostOfGoods += (product.costPrice || 0) * sale.quantity;
        }
    }

    const totalExpenses = expenses.reduce((acc, expense) => acc + expense.amount, 0);
    const totalCosts = totalCostOfGoods + totalExpenses;

    const netProfit = totalRevenue - totalCosts;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    const totalDue = allGasSales.reduce((acc, sale) => acc + sale.dueAmount, 0);

    const productsSoldCount = allGasSales.reduce((acc, sale) => acc + sale.items.reduce((itemAcc, item) => itemAcc + item.quantity, 0), 0) + allCylinderSales.reduce((acc, sale) => acc + sale.quantity, 0);

    res.status(200).json({
      success: true,
      data: {
        totalRevenue,
        gasSalesRevenue,
        cylinderRevenue,
        totalCosts,
        netProfit,
        profitMargin,
        totalDue,
        productsSoldCount
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
}

import Sale from "../../models/Sale"
import EmployeeSale from "../../models/EmployeeSale"
import Cylinder from "../../models/Cylinder"
import EmployeeCylinderTransaction from "../../models/EmployeeCylinderTransaction"
import Product from "../../models/Product"
import Expense from "../../models/Expense"

export default async function handler(req, res) {
  await dbConnect()

  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"])
    return res.status(405).json({ success: false, error: `Method ${req.method} not allowed` })
  }

  try {
    // Get all sales data
    const [adminSales, employeeSales, adminCylinders, employeeCylinders, products, expenses] = await Promise.all([
      Sale.find({}).populate('items.product'),
      EmployeeSale.find({}).populate('items.product'),
      Cylinder.find({}),
      EmployeeCylinderTransaction.find({}),
      Product.find({}),
      Expense.find({})
    ])

    // Calculate revenue and costs from admin gas sales
    let adminGasRevenue = 0
    let adminGasCost = 0
    
    adminSales.forEach(sale => {
      sale.items.forEach(item => {
        const revenue = item.price * item.quantity
        adminGasRevenue += revenue
        
        // Calculate cost using product's costPrice
        if (item.product && item.product.costPrice) {
          adminGasCost += item.product.costPrice * item.quantity
        }
      })
    })

    // Calculate revenue and costs from employee gas sales
    let employeeGasRevenue = 0
    let employeeGasCost = 0
    
    employeeSales.forEach(sale => {
      sale.items.forEach(item => {
        const revenue = item.price * item.quantity
        employeeGasRevenue += revenue
        
        // Calculate cost using product's costPrice
        if (item.product && item.product.costPrice) {
          employeeGasCost += item.product.costPrice * item.quantity
        }
      })
    })

    // Calculate revenue from admin cylinder transactions
    let adminCylinderRevenue = 0
    adminCylinders.forEach(transaction => {
      if (transaction.type === 'deposit') {
        adminCylinderRevenue += transaction.depositAmount || transaction.amount
      } else if (transaction.type === 'refill') {
        adminCylinderRevenue += transaction.refillAmount || transaction.amount
      }
      // Returns are typically refunds, so we don't count them as revenue
    })

    // Calculate revenue from employee cylinder transactions
    let employeeCylinderRevenue = 0
    employeeCylinders.forEach(transaction => {
      if (transaction.type === 'deposit') {
        employeeCylinderRevenue += transaction.depositAmount || transaction.amount
      } else if (transaction.type === 'refill') {
        employeeCylinderRevenue += transaction.refillAmount || transaction.amount
      }
    })

    // Calculate total expenses
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.expense, 0)

    // Calculate totals
    const totalRevenue = adminGasRevenue + employeeGasRevenue + adminCylinderRevenue + employeeCylinderRevenue
    const totalCosts = adminGasCost + employeeGasCost + totalExpenses
    const netProfit = totalRevenue - totalCosts

    // Prepare detailed breakdown
    const breakdown = {
      revenue: {
        adminGasSales: adminGasRevenue,
        employeeGasSales: employeeGasRevenue,
        adminCylinderSales: adminCylinderRevenue,
        employeeCylinderSales: employeeCylinderRevenue,
        total: totalRevenue
      },
      costs: {
        adminGasCosts: adminGasCost,
        employeeGasCosts: employeeGasCost,
        expenses: totalExpenses,
        total: totalCosts
      },
      profit: {
        gross: totalRevenue - (adminGasCost + employeeGasCost), // Revenue minus product costs only
        net: netProfit, // Revenue minus all costs including expenses
        margin: totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(2) : 0
      },
      transactions: {
        adminSalesCount: adminSales.length,
        employeeSalesCount: employeeSales.length,
        adminCylinderCount: adminCylinders.length,
        employeeCylinderCount: employeeCylinders.length,
        expenseCount: expenses.length
      },
      allCylinderTransactions: [...adminCylinders, ...employeeCylinders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    }

    res.status(200).json({ 
      success: true, 
      data: breakdown 
    })

  } catch (error) {
    console.error("Error calculating profit and loss:", error)
    res.status(500).json({ 
      success: false, 
      error: "Failed to calculate profit and loss" 
    })
  }
}
