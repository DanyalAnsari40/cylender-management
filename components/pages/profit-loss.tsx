"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, TrendingUp, TrendingDown, DollarSign, Trash2, Calendar } from "lucide-react"
import { toast } from "sonner"

interface ProfitLossData {
  revenue: {
    adminGasSales: number
    employeeGasSales: number
    adminCylinderSales: number
    employeeCylinderSales: number
    total: number
  }
  costs: {
    adminGasCosts: number
    employeeGasCosts: number
    expenses: number
    total: number
  }
  profit: {
    gross: number
    net: number
    margin: string
  }
  transactions: {
    adminSalesCount: number
    employeeSalesCount: number
    adminCylinderCount: number
    employeeCylinderCount: number
    expenseCount: number
  }
}

interface Expense {
  _id: string
  expense: number
  description: string
  createdAt: string
  updatedAt: string
}

export default function ProfitLoss() {
  const [profitLossData, setProfitLossData] = useState<ProfitLossData | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    expense: "",
    description: "",
  })

  useEffect(() => {
    fetchProfitLossData()
    fetchExpenses()
  }, [])

  const fetchProfitLossData = async () => {
    try {
      const response = await fetch("/api/profit-loss")
      const result = await response.json()
      
      if (result.success) {
        setProfitLossData(result.data)
      } else {
        toast.error("Failed to fetch profit & loss data")
      }
    } catch (error) {
      console.error("Error fetching P&L data:", error)
      toast.error("Error loading profit & loss data")
    }
  }

  const fetchExpenses = async () => {
    try {
      const response = await fetch("/api/expenses")
      const result = await response.json()
      
      if (result.success) {
        setExpenses(result.data)
      } else {
        toast.error("Failed to fetch expenses")
      }
    } catch (error) {
      console.error("Error fetching expenses:", error)
      toast.error("Error loading expenses")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.expense || !formData.description) {
      toast.error("Please fill in all fields")
      return
    }

    if (Number(formData.expense) <= 0) {
      toast.error("Expense amount must be greater than 0")
      return
    }

    try {
      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          expense: Number(formData.expense),
          description: formData.description,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success("Expense added successfully")
        setFormData({ expense: "", description: "" })
        setDialogOpen(false)
        fetchExpenses()
        fetchProfitLossData() // Refresh P&L data to include new expense
      } else {
        toast.error(result.error || "Failed to add expense")
      }
    } catch (error) {
      console.error("Error adding expense:", error)
      toast.error("Error adding expense")
    }
  }

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("Are you sure you want to delete this expense?")) {
      return
    }

    try {
      const response = await fetch(`/api/expenses?id=${id}`, {
        method: "DELETE",
      })

      const result = await response.json()

      if (result.success) {
        toast.success("Expense deleted successfully")
        fetchExpenses()
        fetchProfitLossData() // Refresh P&L data
      } else {
        toast.error(result.error || "Failed to delete expense")
      }
    } catch (error) {
      console.error("Error deleting expense:", error)
      toast.error("Error deleting expense")
    }
  }

  const formatCurrency = (amount: number) => {
    return `AED ${amount.toFixed(2)}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="p-3 sm:p-4 lg:p-6 xl:p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading P&L data...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6 xl:p-8 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
            Profit & Loss
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Financial overview and expense management
          </p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New Expense</DialogTitle>
              <DialogDescription>
                Add a new expense to track your business costs
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="expense">Expense Amount (AED)</Label>
                <Input
                  id="expense"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Enter expense amount"
                  value={formData.expense}
                  onChange={(e) => setFormData({ ...formData, expense: e.target.value })}
                  className="h-11 sm:h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Enter expense description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="min-h-[80px] resize-none"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Add Expense</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* P&L Summary Cards */}
      {profitLossData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(profitLossData.revenue.total)}
              </div>
              <p className="text-xs text-muted-foreground">
                From all sales channels
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Costs</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(profitLossData.costs.total)}
              </div>
              <p className="text-xs text-muted-foreground">
                Product costs + expenses
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${profitLossData.profit.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(profitLossData.profit.net)}
              </div>
              <p className="text-xs text-muted-foreground">
                Revenue - all costs
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${Number(profitLossData.profit.margin) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {profitLossData.profit.margin}%
              </div>
              <p className="text-xs text-muted-foreground">
                Net profit percentage
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Breakdown */}
      {profitLossData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-green-600">Revenue Breakdown</CardTitle>
              <CardDescription>Income from all sales channels</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Admin Gas Sales</span>
                <span className="font-semibold">{formatCurrency(profitLossData.revenue.adminGasSales)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Employee Gas Sales</span>
                <span className="font-semibold">{formatCurrency(profitLossData.revenue.employeeGasSales)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Admin Cylinder Sales</span>
                <span className="font-semibold">{formatCurrency(profitLossData.revenue.adminCylinderSales)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Employee Cylinder Sales</span>
                <span className="font-semibold">{formatCurrency(profitLossData.revenue.employeeCylinderSales)}</span>
              </div>
              <hr />
              <div className="flex justify-between items-center font-bold text-green-600">
                <span>Total Revenue</span>
                <span>{formatCurrency(profitLossData.revenue.total)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Costs Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-red-600">Costs Breakdown</CardTitle>
              <CardDescription>All business expenses and costs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Admin Gas Costs</span>
                <span className="font-semibold">{formatCurrency(profitLossData.costs.adminGasCosts)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Employee Gas Costs</span>
                <span className="font-semibold">{formatCurrency(profitLossData.costs.employeeGasCosts)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Business Expenses</span>
                <span className="font-semibold">{formatCurrency(profitLossData.costs.expenses)}</span>
              </div>
              <hr />
              <div className="flex justify-between items-center font-bold text-red-600">
                <span>Total Costs</span>
                <span>{formatCurrency(profitLossData.costs.total)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Business Expenses</CardTitle>
          <CardDescription>All recorded business expenses</CardDescription>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No expenses recorded yet</p>
              <p className="text-sm text-gray-400 mt-1">Click "Add Expense" to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense._id}>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {formatDate(expense.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate" title={expense.description}>
                          {expense.description}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(expense.expense)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteExpense(expense._id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
