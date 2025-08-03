import dbConnect from "@/lib/mongodb";
import PurchaseOrder from "@/models/PurchaseOrder";
import Product from "@/models/Product";
import { NextResponse } from "next/server";

// Manual stock synchronization endpoint for testing and maintenance
export async function POST() {
  try {
    await dbConnect();
    console.log("🔄 Starting manual stock synchronization...");
    
    // Get all products
    const products = await Product.find({}).lean();
    const syncResults = [];
    
    for (const product of products) {
      try {
        // Calculate total received stock for this product from all inventory items
        const allReceivedOrders = await PurchaseOrder.find({
          product: product._id,
          inventoryStatus: 'received'
        }).lean();

        const totalReceivedStock = allReceivedOrders.reduce((total, po) => {
          return total + (po.quantity || 0);
        }, 0);

        const previousStock = product.currentStock || 0;
        
        // Update product stock
        await Product.findByIdAndUpdate(product._id, {
          currentStock: totalReceivedStock
        });

        syncResults.push({
          productId: product._id,
          productName: product.name,
          previousStock,
          newStock: totalReceivedStock,
          difference: totalReceivedStock - previousStock,
          receivedOrders: allReceivedOrders.length
        });

        console.log(`✅ Synced ${product.name}: ${previousStock} → ${totalReceivedStock} (${allReceivedOrders.length} received orders)`);
        
      } catch (productError) {
        console.error(`❌ Failed to sync stock for product ${product.name}:`, productError);
        syncResults.push({
          productId: product._id,
          productName: product.name,
          error: productError.message
        });
      }
    }

    console.log("🎉 Stock synchronization completed!");

    return NextResponse.json({
      success: true,
      message: "Stock synchronization completed",
      results: syncResults,
      totalProducts: products.length,
      successfulSyncs: syncResults.filter(r => !r.error).length
    });

  } catch (error) {
    console.error("Stock synchronization error:", error);
    return NextResponse.json({
      success: false,
      error: "Failed to synchronize stock",
      details: error.message
    }, { status: 500 });
  }
}
