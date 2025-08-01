import dbConnect from "@/lib/mongodb";
import PurchaseOrder from "@/models/PurchaseOrder";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await dbConnect();
    console.log("Fetching purchase orders for inventory...");

    // First, try to get purchase orders without population to avoid reference errors
    let purchaseOrders;
    try {
      purchaseOrders = await PurchaseOrder.find({})
        .populate('product', 'name category')
        .populate('supplier', 'companyName')
        .sort({ createdAt: -1 })
        .lean();
    } catch (populateError) {
      console.warn("Population failed, fetching without populate:", populateError.message);
      // Fallback: fetch without populate if references are broken
      purchaseOrders = await PurchaseOrder.find({})
        .sort({ createdAt: -1 })
        .lean();
    }

    console.log(`Found ${purchaseOrders.length} purchase orders`);

    // Transform purchase orders into inventory items with safe property access
    const inventoryItems = purchaseOrders.map(order => {
      const item = {
        id: order._id?.toString() || '',
        poNumber: order.poNumber || 'N/A',
        productName: order.product?.name || order.productName || "Unknown Product",
        supplierName: order.supplier?.companyName || order.supplierName || "Unknown Supplier",
        purchaseDate: order.purchaseDate,
        quantity: order.quantity || 0,
        unitPrice: order.unitPrice || 0,
        totalAmount: order.totalAmount || 0,
        status: order.inventoryStatus || "pending",
        purchaseType: order.purchaseType || "gas",
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
      };
      return item;
    });

    console.log(`Transformed ${inventoryItems.length} inventory items`);

    return NextResponse.json({
      success: true,
      data: inventoryItems
    });

  } catch (error) {
    console.error("Inventory API error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to fetch inventory data", 
        details: error.message 
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    await dbConnect();
    console.log("PATCH inventory request received");

    const { id, status, quantity, unitPrice } = await request.json();
    console.log("Update data:", { id, status, quantity, unitPrice });

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Purchase order ID is required" },
        { status: 400 }
      );
    }

    // Build update object
    const updateData = {};
    
    if (status) {
      updateData.inventoryStatus = status;
      console.log("Updating inventory status to:", status);
    }
    
    if (quantity !== undefined) {
      updateData.quantity = quantity;
      // Recalculate total amount if quantity or unit price changes
      if (unitPrice !== undefined) {
        updateData.unitPrice = unitPrice;
        updateData.totalAmount = quantity * unitPrice;
      } else {
        // Get current unit price to recalculate total
        const currentOrder = await PurchaseOrder.findById(id);
        if (currentOrder) {
          updateData.totalAmount = quantity * (currentOrder.unitPrice || 0);
        }
      }
    } else if (unitPrice !== undefined) {
      updateData.unitPrice = unitPrice;
      // Get current quantity to recalculate total
      const currentOrder = await PurchaseOrder.findById(id);
      if (currentOrder) {
        updateData.totalAmount = (currentOrder.quantity || 0) * unitPrice;
      }
    }

    console.log("Update data to apply:", updateData);

    // Update the purchase order with fallback for population errors
    let updatedOrder;
    try {
      updatedOrder = await PurchaseOrder.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      ).populate('product', 'name category')
       .populate('supplier', 'companyName');
    } catch (populateError) {
      console.warn("Population failed during update, trying without populate:", populateError.message);
      // Fallback: update without populate
      updatedOrder = await PurchaseOrder.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );
    }

    if (!updatedOrder) {
      return NextResponse.json(
        { success: false, error: "Purchase order not found" },
        { status: 404 }
      );
    }

    console.log("Successfully updated order:", updatedOrder._id);

    // Transform back to inventory item format with safe property access
    const inventoryItem = {
      id: updatedOrder._id?.toString() || '',
      poNumber: updatedOrder.poNumber || 'N/A',
      productName: updatedOrder.product?.name || updatedOrder.productName || "Unknown Product",
      supplierName: updatedOrder.supplier?.companyName || updatedOrder.supplierName || "Unknown Supplier",
      purchaseDate: updatedOrder.purchaseDate,
      quantity: updatedOrder.quantity || 0,
      unitPrice: updatedOrder.unitPrice || 0,
      totalAmount: updatedOrder.totalAmount || 0,
      status: updatedOrder.inventoryStatus || "pending",
      purchaseType: updatedOrder.purchaseType || "gas",
      createdAt: updatedOrder.createdAt,
      updatedAt: updatedOrder.updatedAt
    };

    return NextResponse.json({
      success: true,
      data: inventoryItem,
      message: "Inventory item updated successfully"
    });

  } catch (error) {
    console.error("Inventory update error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to update inventory item", 
        details: error.message 
      },
      { status: 500 }
    );
  }
}
