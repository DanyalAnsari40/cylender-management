import mongoose from "mongoose"

const StockAssignmentSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["assigned", "received", "returned"],
      default: "assigned",
    },
    assignedDate: {
      type: Date,
      default: Date.now,
    },
    receivedDate: {
      type: Date,
    },
    returnedDate: {
      type: Date,
    },
    notes: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
)

export default mongoose.models.StockAssignment || mongoose.model("StockAssignment", StockAssignmentSchema)
