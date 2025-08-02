import mongoose from "mongoose"

const ExpenseSchema = new mongoose.Schema(
  {
    expense: {
      type: Number,
      required: true,
      min: 0,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
)

// Index for faster queries
ExpenseSchema.index({ createdAt: -1 })

export default mongoose.models.Expense || mongoose.model("Expense", ExpenseSchema)
