import dbConnect from "../../lib/mongodb"
import Expense from "../../models/Expense"

export default async function handler(req, res) {
  await dbConnect()

  switch (req.method) {
    case "GET":
      try {
        const expenses = await Expense.find({}).sort({ createdAt: -1 })
        res.status(200).json({ success: true, data: expenses })
      } catch (error) {
        console.error("Error fetching expenses:", error)
        res.status(500).json({ success: false, error: "Failed to fetch expenses" })
      }
      break

    case "POST":
      try {
        const { expense, description } = req.body

        if (!expense || !description) {
          return res.status(400).json({ 
            success: false, 
            error: "Expense amount and description are required" 
          })
        }

        if (expense <= 0) {
          return res.status(400).json({ 
            success: false, 
            error: "Expense amount must be greater than 0" 
          })
        }

        const newExpense = new Expense({
          expense: Number(expense),
          description: description.trim(),
        })

        await newExpense.save()
        res.status(201).json({ success: true, data: newExpense })
      } catch (error) {
        console.error("Error creating expense:", error)
        res.status(500).json({ success: false, error: "Failed to create expense" })
      }
      break

    case "DELETE":
      try {
        const { id } = req.query
        
        if (!id) {
          return res.status(400).json({ 
            success: false, 
            error: "Expense ID is required" 
          })
        }

        const deletedExpense = await Expense.findByIdAndDelete(id)
        
        if (!deletedExpense) {
          return res.status(404).json({ 
            success: false, 
            error: "Expense not found" 
          })
        }

        res.status(200).json({ success: true, data: deletedExpense })
      } catch (error) {
        console.error("Error deleting expense:", error)
        res.status(500).json({ success: false, error: "Failed to delete expense" })
      }
      break

    default:
      res.setHeader("Allow", ["GET", "POST", "DELETE"])
      res.status(405).json({ success: false, error: `Method ${req.method} not allowed` })
  }
}
