import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import PurchaseOrder from "@/models/PurchaseOrder";
import Sale from "@/models/Sale";
import EmployeeSale from "@/models/EmployeeSale";
import StockAssignment from "@/models/StockAssignment";
import CylinderTransaction from "@/models/Cylinder";

/**
 * Centralized Stock Manager
 * 
 * This utility ensures consistent stock calculations across all operations.
 * It recalculates stock from the ground up based on all transactions.
 */

export class StockManager {
  
  /**
   * Calculate the correct current stock for a product based on all transactions
   * @param {string} productId - The product ID to calculate stock for
   * @returns {Promise<number>} - The calculated current stock
   */
  static async calculateCurrentStock(productId) {
    try {
      await dbConnect();

      console.log(`📊 Calculating stock for product: ${productId}`);

      // 1. Get total received inventory (purchases)
      const receivedPurchases = await PurchaseOrder.find({
        product: productId,
        inventoryStatus: 'received'
      }).lean();

      const totalReceived = receivedPurchases.reduce((sum, po) => {
        return sum + (po.quantity || 0);
      }, 0);

      console.log(`📦 Total received from purchases: ${totalReceived}`);

      // 2. Get total sold (regular sales)
      const regularSales = await Sale.find({}).lean();
      let totalRegularSold = 0;
      
      for (const sale of regularSales) {
        if (sale.items && Array.isArray(sale.items)) {
          for (const item of sale.items) {
            if (item.product && item.product.toString() === productId) {
              totalRegularSold += (item.quantity || 0);
            }
          }
        }
      }

      console.log(`🛒 Total sold (regular sales): ${totalRegularSold}`);

      // 3. Get total sold (employee sales)
      const employeeSales = await EmployeeSale.find({}).lean();
      let totalEmployeeSold = 0;
      
      for (const sale of employeeSales) {
        if (sale.items && Array.isArray(sale.items)) {
          for (const item of sale.items) {
            if (item.product && item.product.toString() === productId) {
              totalEmployeeSold += (item.quantity || 0);
            }
          }
        }
      }

      console.log(`👥 Total sold (employee sales): ${totalEmployeeSold}`);

      // 4. Get total assigned to employees (but not yet sold)
      const activeAssignments = await StockAssignment.find({
        product: productId,
        status: { $in: ['assigned', 'received'] }
      }).lean();

      const totalAssigned = activeAssignments.reduce((sum, assignment) => {
        return sum + (assignment.remainingQuantity || 0);
      }, 0);

      console.log(`👨‍💼 Total assigned to employees: ${totalAssigned}`);

      // 5. Get cylinder transactions net effect
      const cylinderTransactions = await CylinderTransaction.find({
        product: productId
      }).lean();

      let cylinderStockEffect = 0;
      for (const transaction of cylinderTransactions) {
        const quantity = transaction.quantity || 0;
        if (transaction.type === 'return') {
          cylinderStockEffect += quantity; // Returns increase stock
        } else if (transaction.type === 'deposit' || transaction.type === 'refill') {
          cylinderStockEffect -= quantity; // Deposits/refills decrease stock
        }
      }

      console.log(`🔄 Cylinder transactions net effect: ${cylinderStockEffect}`);

      // Calculate final stock
      // Stock = Total Received + Cylinder Returns - Regular Sales - Employee Sales - Cylinder Deposits/Refills
      // Note: Assigned stock is already accounted for in employee sales
      const calculatedStock = totalReceived + cylinderStockEffect - totalRegularSold - totalEmployeeSold;

      console.log(`🎯 Calculated stock: ${totalReceived} + ${cylinderStockEffect} - ${totalRegularSold} - ${totalEmployeeSold} = ${calculatedStock}`);

      return Math.max(0, calculatedStock); // Ensure stock doesn't go negative

    } catch (error) {
      console.error(`❌ Error calculating stock for product ${productId}:`, error);
      return 0;
    }
  }

  /**
   * Synchronize a single product's stock with calculated value
   * @param {string} productId - The product ID to synchronize
   * @returns {Promise<Object>} - Sync result with before/after values
   */
  static async syncProductStock(productId) {
    try {
      await dbConnect();

      const product = await Product.findById(productId);
      if (!product) {
        throw new Error(`Product not found: ${productId}`);
      }

      const previousStock = product.currentStock || 0;
      const calculatedStock = await this.calculateCurrentStock(productId);

      // Update the product stock
      product.currentStock = calculatedStock;
      await product.save();

      const result = {
        productId,
        productName: product.name,
        previousStock,
        calculatedStock,
        difference: calculatedStock - previousStock,
        synchronized: true
      };

      console.log(`✅ Synchronized ${product.name}: ${previousStock} → ${calculatedStock} (${result.difference >= 0 ? '+' : ''}${result.difference})`);

      return result;

    } catch (error) {
      console.error(`❌ Error syncing product stock for ${productId}:`, error);
      return {
        productId,
        error: error.message,
        synchronized: false
      };
    }
  }

  /**
   * Synchronize all products' stock
   * @returns {Promise<Object>} - Summary of sync results
   */
  static async syncAllProductsStock() {
    try {
      await dbConnect();

      const products = await Product.find({}).lean();
      const results = [];

      console.log(`🔄 Starting stock synchronization for ${products.length} products...`);

      for (const product of products) {
        const result = await this.syncProductStock(product._id);
        results.push(result);
      }

      const successful = results.filter(r => r.synchronized).length;
      const failed = results.filter(r => !r.synchronized).length;

      const summary = {
        totalProducts: products.length,
        successful,
        failed,
        results,
        timestamp: new Date().toISOString()
      };

      console.log(`📊 Stock synchronization complete: ${successful} successful, ${failed} failed`);

      return summary;

    } catch (error) {
      console.error('❌ Error during bulk stock synchronization:', error);
      return {
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Validate if a stock operation is feasible
   * @param {string} productId - Product ID
   * @param {number} requestedQuantity - Quantity to check
   * @param {string} operation - Type of operation ('sale', 'assignment', etc.)
   * @returns {Promise<Object>} - Validation result
   */
  static async validateStockOperation(productId, requestedQuantity, operation = 'operation') {
    try {
      const currentStock = await this.calculateCurrentStock(productId);
      const product = await Product.findById(productId);

      const isValid = currentStock >= requestedQuantity;

      return {
        valid: isValid,
        currentStock,
        requestedQuantity,
        available: currentStock,
        shortfall: isValid ? 0 : requestedQuantity - currentStock,
        productName: product?.name || 'Unknown Product',
        operation
      };

    } catch (error) {
      console.error(`❌ Error validating stock operation for ${productId}:`, error);
      return {
        valid: false,
        error: error.message,
        operation
      };
    }
  }

  /**
   * Get stock breakdown for a product (for debugging/reporting)
   * @param {string} productId - Product ID
   * @returns {Promise<Object>} - Detailed stock breakdown
   */
  static async getStockBreakdown(productId) {
    try {
      await dbConnect();

      const product = await Product.findById(productId);
      if (!product) {
        throw new Error(`Product not found: ${productId}`);
      }

      // Get all the individual components
      const receivedPurchases = await PurchaseOrder.find({
        product: productId,
        inventoryStatus: 'received'
      }).lean();

      const regularSales = await Sale.find({}).lean();
      const employeeSales = await EmployeeSale.find({}).lean();
      const stockAssignments = await StockAssignment.find({
        product: productId,
        status: { $in: ['assigned', 'received'] }
      }).lean();
      const cylinderTransactions = await CylinderTransaction.find({
        product: productId
      }).lean();

      // Calculate each component
      const totalReceived = receivedPurchases.reduce((sum, po) => sum + (po.quantity || 0), 0);
      
      let totalRegularSold = 0;
      for (const sale of regularSales) {
        if (sale.items && Array.isArray(sale.items)) {
          for (const item of sale.items) {
            if (item.product && item.product.toString() === productId) {
              totalRegularSold += (item.quantity || 0);
            }
          }
        }
      }

      let totalEmployeeSold = 0;
      for (const sale of employeeSales) {
        if (sale.items && Array.isArray(sale.items)) {
          for (const item of sale.items) {
            if (item.product && item.product.toString() === productId) {
              totalEmployeeSold += (item.quantity || 0);
            }
          }
        }
      }

      const totalAssigned = stockAssignments.reduce((sum, assignment) => {
        return sum + (assignment.remainingQuantity || 0);
      }, 0);

      let cylinderReturns = 0;
      let cylinderDeposits = 0;
      for (const transaction of cylinderTransactions) {
        const quantity = transaction.quantity || 0;
        if (transaction.type === 'return') {
          cylinderReturns += quantity;
        } else if (transaction.type === 'deposit' || transaction.type === 'refill') {
          cylinderDeposits += quantity;
        }
      }

      const calculatedStock = totalReceived + cylinderReturns - totalRegularSold - totalEmployeeSold - cylinderDeposits;

      return {
        productId,
        productName: product.name,
        currentStockInDB: product.currentStock,
        calculatedStock: Math.max(0, calculatedStock),
        breakdown: {
          totalReceived,
          totalRegularSold,
          totalEmployeeSold,
          totalAssigned,
          cylinderReturns,
          cylinderDeposits,
          cylinderNetEffect: cylinderReturns - cylinderDeposits
        },
        transactions: {
          receivedPurchases: receivedPurchases.length,
          regularSales: regularSales.length,
          employeeSales: employeeSales.length,
          stockAssignments: stockAssignments.length,
          cylinderTransactions: cylinderTransactions.length
        },
        isConsistent: product.currentStock === Math.max(0, calculatedStock),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error(`❌ Error getting stock breakdown for ${productId}:`, error);
      return {
        productId,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

export default StockManager;
