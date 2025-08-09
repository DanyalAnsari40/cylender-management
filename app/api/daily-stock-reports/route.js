import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import DailyStockReport from "@/models/DailyStockReport";

export async function GET(request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const itemName = searchParams.get("itemName");
    const date = searchParams.get("date");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = parseInt(searchParams.get("limit") || "0", 10);

    const filter = {};
    if (itemName) filter.itemName = itemName;
    if (date) filter.date = date;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = startDate;
      if (endDate) filter.date.$lte = endDate;
    }

    let query = DailyStockReport.find(filter).sort({ date: -1, createdAt: -1 });
    if (limit && Number.isFinite(limit) && limit > 0) query = query.limit(limit);

    const data = await query.exec();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("DSR GET error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch daily stock reports" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await dbConnect();

    const body = await request.json();
    const {
      date,
      itemName,
      openingFull,
      openingEmpty,
      refilled,
      cylinderSales,
      gasSales,
      closingFull,
      closingEmpty,
    } = body || {};

    if (!date || !itemName) {
      return NextResponse.json({ success: false, error: "Missing required fields: date, itemName" }, { status: 400 });
    }

    // Build update doc dynamically to avoid overwriting with undefined
    const update = { $set: { date, itemName } };
    const setDoc = update.$set;
    if (typeof openingFull === 'number') setDoc.openingFull = openingFull;
    if (typeof openingEmpty === 'number') setDoc.openingEmpty = openingEmpty;
    if (typeof refilled === 'number') setDoc.refilled = refilled;
    if (typeof cylinderSales === 'number') setDoc.cylinderSales = cylinderSales;
    if (typeof gasSales === 'number') setDoc.gasSales = gasSales;
    if (typeof closingFull === 'number') setDoc.closingFull = closingFull;
    if (typeof closingEmpty === 'number') setDoc.closingEmpty = closingEmpty;

    // Upsert to ensure uniqueness on (itemName, date)
    const updated = await DailyStockReport.findOneAndUpdate(
      { itemName, date },
      update,
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("DSR POST error:", error);
    return NextResponse.json({ success: false, error: "Failed to create/update daily stock report" }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const itemName = searchParams.get('itemName');
    const date = searchParams.get('date');
    if (!itemName || !date) {
      return NextResponse.json({ error: 'itemName and date are required' }, { status: 400 });
    }
    const deleted = await DailyStockReport.findOneAndDelete({ itemName, date });
    if (!deleted) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /daily-stock-reports error', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
