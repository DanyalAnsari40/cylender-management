import dbConnect from "@/lib/mongodb";
import Customer from "@/models/Customer";
import Sale from "@/models/Sale";
import CylinderTransaction from "@/models/Cylinder";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const customerName = searchParams.get('customerName');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build customer query
    let customerQuery = {};
    if (customerName) {
      customerQuery.name = { $regex: customerName, $options: 'i' };
    }

    // Get all customers
    const customers = await Customer.find(customerQuery).lean();

    // Get comprehensive data for each customer
    const customerLedgerData = await Promise.all(
      customers.map(async (customer) => {
        try {
          // Get sales data for this customer
          let salesQuery = { customer: customer._id };
          if (startDate || endDate) {
            salesQuery.createdAt = {};
            if (startDate) salesQuery.createdAt.$gte = new Date(startDate);
            if (endDate) salesQuery.createdAt.$lte = new Date(endDate + 'T23:59:59.999Z');
          }

          const sales = await Sale.find(salesQuery)
            .populate('items.product', 'name category')
            .lean();

          // Get cylinder transactions for this customer
          let cylinderQuery = { customer: customer._id };
          if (startDate || endDate) {
            cylinderQuery.createdAt = {};
            if (startDate) cylinderQuery.createdAt.$gte = new Date(startDate);
            if (endDate) cylinderQuery.createdAt.$lte = new Date(endDate + 'T23:59:59.999Z');
          }

          const cylinderTransactions = await CylinderTransaction.find(cylinderQuery).lean();

          // Calculate totals
          const totalSalesAmount = sales.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0);
          const totalPaidAmount = sales.reduce((sum, sale) => sum + (sale.amountPaid || 0), 0);
          const totalCylinderAmount = cylinderTransactions.reduce((sum, transaction) => sum + (transaction.amount || 0), 0);

          // Calculate transaction counts
          const totalSales = sales.length;
          const totalDeposits = cylinderTransactions.filter(t => t.type === 'deposit').length;
          const totalRefills = cylinderTransactions.filter(t => t.type === 'refill').length;
          const totalReturns = cylinderTransactions.filter(t => t.type === 'return').length;

          // Determine overall status based on balance and recent transactions
          const balance = customer.balance || 0;
          const hasRecentTransactions = [...sales, ...cylinderTransactions].some(
            t => new Date(t.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days
          );

          let overallStatus = 'cleared';
          if (balance > 0) {
            overallStatus = 'pending';
          } else if (balance < 0) {
            overallStatus = 'overdue';
          }

          // Filter by status if provided
          if (status && status !== 'all' && overallStatus !== status) {
            return null;
          }

          return {
            _id: customer._id,
            name: customer.name,
            trNumber: customer.trNumber,
            phone: customer.phone,
            email: customer.email,
            address: customer.address,
            balance: balance,
            totalDebit: customer.totalDebit || 0,
            totalCredit: customer.totalCredit || 0,
            status: overallStatus,
            
            // Transaction summaries
            totalSales,
            totalSalesAmount,
            totalPaidAmount,
            totalCylinderAmount,
            totalDeposits,
            totalRefills,
            totalReturns,
            
            // Recent activity
            hasRecentActivity: hasRecentTransactions,
            lastTransactionDate: [...sales, ...cylinderTransactions]
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]?.createdAt || null,
            
            // Detailed transactions for drill-down
            recentSales: sales.slice(0, 5).map(sale => ({
              _id: sale._id,
              invoiceNumber: sale.invoiceNumber,
              totalAmount: sale.totalAmount,
              amountPaid: sale.amountPaid,
              createdAt: sale.createdAt,
              items: sale.items
            })),
            
            recentCylinderTransactions: cylinderTransactions.slice(0, 5).map(transaction => ({
              _id: transaction._id,
              type: transaction.type,
              cylinderSize: transaction.cylinderSize,
              quantity: transaction.quantity,
              amount: transaction.amount,
              status: transaction.status,
              createdAt: transaction.createdAt
            }))
          };
        } catch (error) {
          console.error(`Error processing customer ${customer._id}:`, error);
          return {
            _id: customer._id,
            name: customer.name,
            trNumber: customer.trNumber,
            phone: customer.phone,
            email: customer.email,
            address: customer.address,
            balance: customer.balance || 0,
            status: 'error',
            error: 'Failed to load transaction data'
          };
        }
      })
    );

    // Filter out null results (customers that didn't match status filter)
    const filteredData = customerLedgerData.filter(customer => customer !== null);

    return NextResponse.json({
      success: true,
      data: filteredData,
      total: filteredData.length,
      filters: {
        customerName,
        status,
        startDate,
        endDate
      }
    });

  } catch (error) {
    console.error("Ledger API error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to fetch ledger data", 
        details: error.message 
      },
      { status: 500 }
    );
  }
}
