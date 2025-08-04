import dbConnect from "@/lib/mongodb";
import Customer from "@/models/Customer";
import Sale from "@/models/Sale";
import CylinderTransaction from "@/models/Cylinder";
import User from "@/models/User";
import Product from "@/models/Product";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await dbConnect();

    // Get all basic counts
    const [
      totalCustomers,
      totalEmployees,
      totalProducts,
      sales,
      cylinderTransactions
    ] = await Promise.all([
      Customer.countDocuments(),
      User.countDocuments({ role: 'employee' }),
      Product.countDocuments(),
      Sale.find({}).populate('items.product').lean(),
      CylinderTransaction.find({}).lean()
    ]);

    // Calculate revenue from sales
    const totalRevenue = sales.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0);
    const totalPaid = sales.reduce((sum, sale) => sum + (sale.amountPaid || 0), 0);
    const totalPending = totalRevenue - totalPaid;

    // Calculate gas sales (sales with gas products)
    const gasSales = sales.filter(sale => 
      sale.items && sale.items.some(item => 
        item.product && item.product.category === 'gas'
      )
    ).length;

    // Calculate cylinder statistics
    const cylinderRefills = cylinderTransactions.filter(t => t.type === 'refill').length;
    const cylinderDeposits = cylinderTransactions.filter(t => t.type === 'deposit').length;
    const cylinderReturns = cylinderTransactions.filter(t => t.type === 'return').length;

    // Calculate cylinder revenue (only from deposits)
    const cylinderRevenue = cylinderTransactions
      .filter(t => t.type === 'deposit')
      .reduce((sum, transaction) => sum + (transaction.amount || 0), 0);


    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const recentSales = sales.filter(sale => 
      new Date(sale.createdAt) > thirtyDaysAgo
    ).length;
    
    const recentCylinderTransactions = cylinderTransactions.filter(transaction => 
      new Date(transaction.createdAt) > thirtyDaysAgo
    ).length;

    // Calculate monthly trends (last 6 months)
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date();
      monthStart.setMonth(monthStart.getMonth() - i);
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      monthEnd.setDate(0);
      monthEnd.setHours(23, 59, 59, 999);

      const monthSales = sales.filter(sale => {
        const saleDate = new Date(sale.createdAt);
        return saleDate >= monthStart && saleDate <= monthEnd;
      });

      const monthCylinderTransactions = cylinderTransactions.filter(transaction => {
        const transactionDate = new Date(transaction.createdAt);
        return transactionDate >= monthStart && transactionDate <= monthEnd;
      });

      const monthRevenue = monthSales.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0);
      const monthCylinderRevenue = monthCylinderTransactions
        .filter(t => t.type === 'deposit')
        .reduce((sum, transaction) => 
        sum + (transaction.amount || 0), 0
      );

      monthlyData.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        sales: monthSales.length,
        revenue: monthRevenue,
        cylinderTransactions: monthCylinderTransactions.length,
        cylinderRevenue: monthCylinderRevenue,
        totalRevenue: monthRevenue + monthCylinderRevenue
      });
    }

    // Get top customers by transaction volume
    const customerStats = await Customer.aggregate([
      {
        $lookup: {
          from: 'sales',
          localField: '_id',
          foreignField: 'customer',
          as: 'sales'
        }
      },
      {
        $lookup: {
          from: 'cylindertransactions',
          localField: '_id',
          foreignField: 'customer',
          as: 'cylinderTransactions'
        }
      },
      {
        $addFields: {
          totalTransactions: { $add: [{ $size: '$sales' }, { $size: '$cylinderTransactions' }] },
          totalSalesAmount: { $sum: '$sales.totalAmount' },
          totalCylinderAmount: { 
            $sum: { 
              $map: { 
                input: { 
                  $filter: { 
                    input: '$cylinderTransactions', 
                    as: 'txn', 
                    cond: { $eq: ['$$txn.type', 'deposit'] } 
                  } 
                }, 
                as: 'filteredTxn', 
                in: '$$filteredTxn.amount' 
              } 
            } 
          },
          totalAmount: { 
            $add: [
              { $sum: '$sales.totalAmount' }, 
              { 
                $sum: { 
                  $map: { 
                    input: { 
                      $filter: { 
                        input: '$cylinderTransactions', 
                        as: 'txn', 
                        cond: { $eq: ['$$txn.type', 'deposit'] } 
                      } 
                    }, 
                    as: 'filteredTxn', 
                    in: '$$filteredTxn.amount' 
                  } 
                } 
              }
            ] 
          }
        }
      },
      {
        $sort: { totalAmount: -1 }
      },
      {
        $limit: 5
      },
      {
        $project: {
          name: 1,
          totalTransactions: 1,
          totalAmount: 1,
          balance: 1
        }
      }
    ]);

    // Ensure all values are numbers and not null/undefined
    const stats = {
      // Basic counts
      totalCustomers: Number(totalCustomers) || 0,
      totalEmployees: Number(totalEmployees) || 0,
      totalProducts: Number(totalProducts) || 0,
      totalSales: Number(sales.length) || 0,
      
      // Financial data
      totalRevenue: Number(totalRevenue) || 0,
      totalPaid: Number(totalPaid) || 0,
      totalPending: Number(totalPending) || 0,
      cylinderRevenue: Number(cylinderRevenue) || 0,
      totalCombinedRevenue: Number(totalRevenue + cylinderRevenue) || 0,
      
      // Activity data
      gasSales: Number(gasSales) || 0,
      cylinderRefills: Number(cylinderRefills) || 0,
      cylinderDeposits: Number(cylinderDeposits) || 0,
      cylinderReturns: Number(cylinderReturns) || 0,
      totalCylinderTransactions: Number(cylinderTransactions.length) || 0,
      
      // Recent activity
      recentSales: Number(recentSales) || 0,
      recentCylinderTransactions: Number(recentCylinderTransactions) || 0,
      
      // Trends and analytics
      monthlyData: monthlyData || [],
      topCustomers: customerStats || [],
      
      // Additional metrics
      averageSaleAmount: sales.length > 0 ? Number(totalRevenue / sales.length) || 0 : 0,
      averageCylinderAmount: cylinderTransactions.length > 0 ? Number(cylinderRevenue / cylinderTransactions.length) || 0 : 0,
      
      // Status breakdown
      pendingCustomers: Number(await Customer.countDocuments({ balance: { $gt: 0 } })) || 0,
      overdueCustomers: Number(await Customer.countDocuments({ balance: { $lt: 0 } })) || 0,
      clearedCustomers: Number(await Customer.countDocuments({ balance: 0 })) || 0
    };

    console.log('Reports stats response:', stats);
    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error("Reports Stats API error:", error);
    // Return default zero values when there's an error to ensure frontend displays 0 values
    return NextResponse.json({
      success: true,
      data: {
        // Basic counts
        totalCustomers: 0,
        totalEmployees: 0,
        totalProducts: 0,
        totalSales: 0,
        
        // Financial data
        totalRevenue: 0,
        totalPaid: 0,
        totalPending: 0,
        cylinderRevenue: 0,
        totalCombinedRevenue: 0,
        
        // Activity data
        gasSales: 0,
        cylinderRefills: 0,
        cylinderDeposits: 0,
        cylinderReturns: 0,
        totalCylinderTransactions: 0,
        
        // Recent activity
        recentSales: 0,
        recentCylinderTransactions: 0,
        
        // Trends and analytics
        monthlyData: [],
        topCustomers: [],
        
        // Additional metrics
        averageSaleAmount: 0,
        averageCylinderAmount: 0,
        
        // Status breakdown
        pendingCustomers: 0,
        overdueCustomers: 0,
        clearedCustomers: 0
      },
      error: "Failed to fetch stats data - showing default values"
    }, { status: 200 }); // Return 200 status so frontend can still show 0 values
  }
}
