import dbConnect from "@/lib/mongodb";
import CylinderTransaction from "@/models/Cylinder";
import Customer from "@/models/Customer";
import Supplier from "@/models/Supplier";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await dbConnect();
  } catch (error) {
    console.error("Database connection error:", error);
    return NextResponse.json(
      { error: "Database connection failed", details: error.message },
      { status: 500 }
    );
  }

  try {
    // Primary path: with populations
    const transactions = await CylinderTransaction.find({})
      .populate("customer", "name phone address email")
      .populate("supplier", "companyName contactPerson phone email")
      .populate({
        path: "product",
        select: "name category cylinderSize",
        options: { strictPopulate: false }
      })
      .sort({ createdAt: -1 });

    console.log(`[cylinders][GET] Populated fetch OK. Count=${transactions.length}`);
    return NextResponse.json({ data: transactions });
  } catch (error) {
    // Fallback: return lean docs without populations so UI continues to work
    console.error("[cylinders][GET] Populated query failed, falling back to lean without populate.");
    console.error("[cylinders][GET] Error:", error?.message);
    console.error(error?.stack);
    try {
      const raw = await CylinderTransaction.find({}).sort({ createdAt: -1 }).lean();
      console.log(`[cylinders][GET] Fallback lean fetch OK. Count=${raw.length}`);

      // Attempt lightweight hydration so UI continues to display names
      const customerIds = [];
      const supplierIds = [];
      const productIds = [];
      for (const t of raw) {
        if (t.customer) customerIds.push(t.customer);
        if (t.supplier) supplierIds.push(t.supplier);
        if (t.product) productIds.push(t.product);
      }
      const uniq = (arr) => Array.from(new Set(arr.map(String)));
      const [uCustomers, uSuppliers, uProducts] = [uniq(customerIds), uniq(supplierIds), uniq(productIds)];

      let cMap = new Map();
      let sMap = new Map();
      let pMap = new Map();
      try {
        if (uCustomers.length) {
          const cs = await Customer.find({ _id: { $in: uCustomers } }).select("_id name phone email address").lean();
          cs.forEach((c) => cMap.set(String(c._id), c));
        }
      } catch (e) { console.warn("[cylinders][GET] Fallback: customer lookup failed:", e?.message); }
      try {
        if (uSuppliers.length) {
          const ss = await Supplier.find({ _id: { $in: uSuppliers } }).select("_id companyName contactPerson phone email").lean();
          ss.forEach((s) => sMap.set(String(s._id), s));
        }
      } catch (e) { console.warn("[cylinders][GET] Fallback: supplier lookup failed:", e?.message); }
      try {
        if (uProducts.length) {
          const ps = await (await import("@/models/Product")).default.find({ _id: { $in: uProducts } }).select("_id name category cylinderSize").lean();
          ps.forEach((p) => pMap.set(String(p._id), p));
        }
      } catch (e) { console.warn("[cylinders][GET] Fallback: product lookup failed:", e?.message); }

      const hydrated = raw.map((t) => ({
        ...t,
        customer: t.customer ? (cMap.get(String(t.customer)) || t.customer) : undefined,
        supplier: t.supplier ? (sMap.get(String(t.supplier)) || t.supplier) : undefined,
        product: t.product ? (pMap.get(String(t.product)) || t.product) : undefined,
      }));

      return NextResponse.json({ data: hydrated });
    } catch (fallbackErr) {
      console.error("[cylinders][GET] Fallback lean fetch also failed:", fallbackErr?.message);
      console.error(fallbackErr?.stack);
      return NextResponse.json(
        { error: "Failed to fetch cylinder transactions", details: fallbackErr?.message || "Unknown error" },
        { status: 500 }
      );
    }
  }
}

export async function POST(request) {
  try {
    await dbConnect();
  } catch (error) {
    console.error("Database connection error:", error);
    return NextResponse.json(
      { error: "Database connection failed", details: error.message },
      { status: 500 }
    );
  }

  try {
    const data = await request.json();
    console.log('[cylinders][POST] Incoming payload:', data);
    // Validate customer/supplier depending on type
    if (data.type === 'refill') {
      if (data.supplier) {
        const supplier = await Supplier.findById(data.supplier);
        if (!supplier) {
          return NextResponse.json(
            { error: "Supplier not found" },
            { status: 404 }
          );
        }
      } else if (data.customer) {
        // Backward compatibility (legacy refill requests)
        const customer = await Customer.findById(data.customer);
        if (!customer) {
          return NextResponse.json(
            { error: "Customer not found" },
            { status: 404 }
          );
        }
      } else {
        return NextResponse.json(
          { error: "Supplier is required for refill transactions" },
          { status: 400 }
        );
      }
    } else {
      // deposit/return require customer
      const customer = await Customer.findById(data.customer);
      if (!customer) {
        return NextResponse.json(
          { error: "Customer not found" },
          { status: 404 }
        );
      }
    }

    let transaction;
    try {
      transaction = await CylinderTransaction.create(data);
    } catch (e) {
      console.error('[cylinders][POST] Mongoose validation/creation error:', e?.message);
      if (e?.name === 'ValidationError') {
        return NextResponse.json(
          { error: 'Validation failed', details: e?.message },
          { status: 400 }
        );
      }
      throw e;
    }
    const populatedTransaction = await CylinderTransaction.findById(transaction._id)
      .populate("customer", "name phone address email")
      .populate("supplier", "companyName contactPerson phone email")
      .populate("product", "name category cylinderSize");

    return NextResponse.json(populatedTransaction, { status: 201 });
  } catch (error) {
    console.error("Cylinders POST error:", error);
    if (error?.name === 'CastError') {
      // Likely invalid ObjectId
      return NextResponse.json(
        { error: 'Invalid reference id', details: error?.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create cylinder transaction", details: error.message },
      { status: 500 }
    );
  }
}
