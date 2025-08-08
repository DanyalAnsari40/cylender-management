import mongoose from "mongoose"

const SupplierSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: false,
      default: undefined,
    },
    companyName: {
      type: String,
      required: true,
    },
    contactPerson: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    trNumber: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  {
    timestamps: true,
  },
)

// Force refresh the model in dev to ensure schema changes are applied
if (mongoose.models.Supplier) {
  delete mongoose.models.Supplier
}
export default mongoose.model("Supplier", SupplierSchema)
