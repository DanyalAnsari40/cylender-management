import mongoose from "mongoose";

const CylinderTransactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["deposit", "refill", "return"],
      required: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    cylinderSize: {
      type: String,
      required: true,
      enum: ["small", "large"],
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    depositAmount: {
      type: Number,
      default: 0,
    },
    refillAmount: {
      type: Number,
      default: 0,
    },
    returnAmount: {
      type: Number,
      default: 0,
    },
    // Payment method fields for deposit transactions
    paymentMethod: {
      type: String,
      enum: ["cash", "cheque"],
      default: "cash",
    },
    cashAmount: {
      type: Number,
      default: 0,
    },
    bankName: {
      type: String,
      default: "",
    },
    checkNumber: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "cleared", "overdue"],
      default: "pending",
    },
    notes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.CylinderTransaction || 
  mongoose.model("CylinderTransaction", CylinderTransactionSchema);
