import mongoose from "mongoose";

const EmployeeCylinderTransactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["deposit", "refill", "return"],
      required: true,
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: false,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: false,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: false, // Optional when using multi-item transactions
    },
    // Support multiple items per transaction (mirrors admin CylinderTransaction.items)
    items: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        productName: { type: String },
        cylinderSize: { type: String, enum: ["small", "large"] },
        quantity: { type: Number, min: 1 },
        amount: { type: Number, min: 0 }, // Row amount in AED
      },
    ],
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
    // Payment method fields for all transaction types
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

// Index for faster queries
EmployeeCylinderTransactionSchema.index({ employee: 1, createdAt: -1 })
EmployeeCylinderTransactionSchema.index({ customer: 1, createdAt: -1 })
EmployeeCylinderTransactionSchema.index({ supplier: 1, createdAt: -1 })
EmployeeCylinderTransactionSchema.index({ type: 1 })
EmployeeCylinderTransactionSchema.index({ status: 1 })

export default mongoose.models.EmployeeCylinderTransaction || 
  mongoose.model("EmployeeCylinderTransaction", EmployeeCylinderTransactionSchema);
