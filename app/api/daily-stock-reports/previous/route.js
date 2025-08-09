import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import DailyStockReport from "@/models/DailyStockReport";

export async function GET(request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const itemName = searchParams.get("itemName");
    const date = searchParams.get("date"); // YYYY-MM-DD

    if (!itemName || !date) {
      return NextResponse.json({ success: false, error: "Missing itemName or date" }, { status: 400 });
    }

    // Find the latest report before the given date for this item
    const prev = await DailyStockReport.find({
      itemName,
      date: { $lt: date },
    })
      .sort({ date: -1, createdAt: -1 })
      .limit(1);

    if (!prev || prev.length === 0) {
      return NextResponse.json({ success: true, data: null });
    }

    const doc = prev[0];
    return NextResponse.json({
      success: true,
      data: {
        date: doc.date,
        itemName: doc.itemName,
        closingFull: doc.closingFull || 0,
        closingEmpty: doc.closingEmpty || 0,
      },
    });
  } catch (error) {
    console.error("DSR previous GET error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch previous daily stock report" }, { status: 500 });
  }
}
