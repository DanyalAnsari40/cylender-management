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
      enum: ["5kg", "10kg", "15kg", "20kg", "25kg", "45kg"],
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
    status: {
      type: String,
      enum: ["active", "returned", "damaged"],
      default: "active",
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
