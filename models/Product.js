import mongoose from "mongoose"

const ProductSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ["gas", "cylinder"],
      required: true,
    },
    cylinderType: {
      type: String,
      enum: ["large", "small"],
      required: function () {
        return this.category === "cylinder"
      },
    },
    costPrice: {
      type: Number,
      required: true,
    },
    leastPrice: {
      type: Number,
      required: true,
    },
    currentStock: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
)

export default mongoose.models.Product || mongoose.model("Product", ProductSchema)
