import { NextResponse } from "next/server";
import StockManager from "@/lib/stock-manager";

/**
 * Enhanced Stock Synchronization API
 * 
 * Uses the centralized StockManager to ensure consistent stock calculations
 * across all operations including sales, inventory, assignments, and cylinder transactions.
 */

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, productId } = body;

    console.log(`🔄 Stock sync request: ${action}${productId ? ` for product ${productId}` : ''}`);

    switch (action) {
      case 'sync-all':
        const allResults = await StockManager.syncAllProductsStock();
        return NextResponse.json({
          success: true,
          action: 'sync-all',
          ...allResults
        });

      case 'sync-product':
        if (!productId) {
          return NextResponse.json({
            success: false,
            error: 'Product ID is required for product sync'
          }, { status: 400 });
        }
        
        const productResult = await StockManager.syncProductStock(productId);
        return NextResponse.json({
          success: true,
          action: 'sync-product',
          result: productResult
        });

      case 'validate-stock':
        const { quantity, operation } = body;
        if (!productId || !quantity) {
          return NextResponse.json({
            success: false,
            error: 'Product ID and quantity are required for stock validation'
          }, { status: 400 });
        }
        
        const validation = await StockManager.validateStockOperation(productId, quantity, operation);
        return NextResponse.json({
          success: true,
          action: 'validate-stock',
          validation
        });

      case 'get-breakdown':
        if (!productId) {
          return NextResponse.json({
            success: false,
            error: 'Product ID is required for stock breakdown'
          }, { status: 400 });
        }
        
        const breakdown = await StockManager.getStockBreakdown(productId);
        return NextResponse.json({
          success: true,
          action: 'get-breakdown',
          breakdown
        });

      case 'calculate-stock':
        if (!productId) {
          return NextResponse.json({
            success: false,
            error: 'Product ID is required for stock calculation'
          }, { status: 400 });
        }
        
        const calculatedStock = await StockManager.calculateCurrentStock(productId);
        return NextResponse.json({
          success: true,
          action: 'calculate-stock',
          productId,
          calculatedStock
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Supported actions: sync-all, sync-product, validate-stock, get-breakdown, calculate-stock'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Stock sync API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error during stock synchronization',
      details: error.message
    }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'sync-all';
    const productId = searchParams.get('productId');
    const quantity = searchParams.get('quantity');
    const operation = searchParams.get('operation') || 'check';

    console.log(`📊 Stock sync GET request: ${action}`);

    switch (action) {
      case 'sync-all':
        const allResults = await StockManager.syncAllProductsStock();
        return NextResponse.json({
          success: true,
          action: 'sync-all',
          ...allResults
        });

      case 'sync-product':
        if (!productId) {
          return NextResponse.json({
            success: false,
            error: 'Product ID is required for product sync'
          }, { status: 400 });
        }
        
        const productResult = await StockManager.syncProductStock(productId);
        return NextResponse.json({
          success: true,
          action: 'sync-product',
          result: productResult
        });

      case 'validate-stock':
        if (!productId || !quantity) {
          return NextResponse.json({
            success: false,
            error: 'Product ID and quantity are required for stock validation'
          }, { status: 400 });
        }
        
        const validation = await StockManager.validateStockOperation(productId, parseInt(quantity), operation);
        return NextResponse.json({
          success: true,
          action: 'validate-stock',
          validation
        });

      case 'get-breakdown':
        if (!productId) {
          return NextResponse.json({
            success: false,
            error: 'Product ID is required for stock breakdown'
          }, { status: 400 });
        }
        
        const breakdown = await StockManager.getStockBreakdown(productId);
        return NextResponse.json({
          success: true,
          action: 'get-breakdown',
          breakdown
        });

      case 'calculate-stock':
        if (!productId) {
          return NextResponse.json({
            success: false,
            error: 'Product ID is required for stock calculation'
          }, { status: 400 });
        }
        
        const calculatedStock = await StockManager.calculateCurrentStock(productId);
        return NextResponse.json({
          success: true,
          action: 'calculate-stock',
          productId,
          calculatedStock
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Supported actions: sync-all, sync-product, validate-stock, get-breakdown, calculate-stock'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Stock sync GET API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error during stock synchronization',
      details: error.message
    }, { status: 500 });
  }
}
