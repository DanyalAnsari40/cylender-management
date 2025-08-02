import mongoose from "mongoose"

const EmployeeSaleSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    items: [{
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
        min: 1,
      },
      price: {
        type: Number,
        required: true,
        min: 0,
      },
      total: {
        type: Number,
        required: true,
        min: 0,
      },
    }],
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "card", "bank_transfer", "credit"],
      default: "cash",
    },
    paymentStatus: {
      type: String,
      enum: ["paid", "pending", "overdue"],
      default: "paid",
    },
    notes: {
      type: String,
      default: "",
    },
    customerSignature: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  },
)

// Index for faster queries
EmployeeSaleSchema.index({ employee: 1, createdAt: -1 })
EmployeeSaleSchema.index({ customer: 1, createdAt: -1 })
EmployeeSaleSchema.index({ invoiceNumber: 1 })
EmployeeSaleSchema.index({ paymentStatus: 1 })

// Clear the existing model if it exists to force schema update
if (mongoose.models.EmployeeSale) {
  delete mongoose.models.EmployeeSale
}

export default mongoose.model("EmployeeSale", EmployeeSaleSchema)
