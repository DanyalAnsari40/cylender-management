"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Package, DollarSign, FileText, Edit, Trash2 } from "lucide-react"
import { toast } from "sonner"

interface EmployeeCylinderSalesProps {
  user: { id: string; email: string; name: string }
}

interface Customer {
  _id: string
  name: string
  email: string
  phone: string
}

interface CylinderTransaction {
  _id: string
  type: string
  customer: Customer
  cylinderSize: string
  quantity: number
  amount: number
  depositAmount: number
  refillAmount: number
  returnAmount: number
  paymentMethod: string
  cashAmount: number
  bankName: string
  checkNumber: string
  status: string
  notes: string
  createdAt: string
}

// Cylinder size mapping for display
const CYLINDER_SIZE_MAPPING = {
  small: "5kg",
  large: "45kg"
}

const CYLINDER_SIZE_DISPLAY = {
  "5kg": "small",
  "45kg": "large"
}

export function EmployeeCylinderSales({ user }: EmployeeCylinderSalesProps) {
  const [transactions, setTransactions] = useState<CylinderTransaction[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("all")

  // Customer search state
  const [customerSearch, setCustomerSearch] = useState("")
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false)
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])

  // Form state
  const [formData, setFormData] = useState({
    type: "deposit",
    customer: "",
    cylinderSize: "small",
    quantity: 1,
    amount: 0,
    depositAmount: 0,
    refillAmount: 0,
    returnAmount: 0,
    paymentMethod: "cash",
    cashAmount: 0,
    bankName: "",
    checkNumber: "",
    status: "pending",
    notes: ""
  })

  useEffect(() => {
    fetchData()
  }, [user.id])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [transactionsResponse, customersResponse] = await Promise.all([
        fetch(`/api/employee-cylinders?employeeId=${user.id}`),
        fetch("/api/customers")
      ])

      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json()
        setTransactions(Array.isArray(transactionsData) ? transactionsData : [])
      } else {
        console.error("Failed to fetch transactions:", transactionsResponse.status)
        setTransactions([])
      }

      if (customersResponse.ok) {
        const customersData = await customersResponse.json()
        // API returns { data: customers }, so extract the data property
        const customers = customersData.data || customersData
        setCustomers(Array.isArray(customers) ? customers : [])
      } else {
        console.error("Failed to fetch customers:", customersResponse.status)
        setCustomers([])
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error("Failed to fetch data")
      // Set default empty arrays on error
      setTransactions([])
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      type: "deposit",
      customer: "",
      cylinderSize: "small",
      quantity: 1,
      amount: 0,
      depositAmount: 0,
      refillAmount: 0,
      returnAmount: 0,
      paymentMethod: "cash",
      cashAmount: 0,
      bankName: "",
      checkNumber: "",
      status: "pending",
      notes: ""
    })
    setCustomerSearch("")
    setShowCustomerSuggestions(false)
    setFilteredCustomers([])
  }

  // Customer search functions
  const handleCustomerSearchChange = (value: string) => {
    setCustomerSearch(value)
    
    if (value.trim().length > 0) {
      const filtered = customers.filter(customer => 
        customer.name.toLowerCase().includes(value.toLowerCase()) ||
        customer.email.toLowerCase().includes(value.toLowerCase()) ||
        customer.phone.toLowerCase().includes(value.toLowerCase())
      )
      setFilteredCustomers(filtered)
      setShowCustomerSuggestions(filtered.length > 0)
    } else {
      setFilteredCustomers([])
      setShowCustomerSuggestions(false)
    }
  }

  const handleCustomerSuggestionClick = (customer: Customer) => {
    setFormData({...formData, customer: customer._id})
    setCustomerSearch(customer.name)
    setShowCustomerSuggestions(false)
    setFilteredCustomers([])
  }

  const handleCustomerInputFocus = () => {
    if (customerSearch.trim().length > 0 && filteredCustomers.length > 0) {
      setShowCustomerSuggestions(true)
    }
  }

  const handleCustomerInputBlur = () => {
    // Delay hiding suggestions to allow click events
    setTimeout(() => {
      setShowCustomerSuggestions(false)
    }, 200)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.customer || !formData.cylinderSize || formData.quantity <= 0 || formData.amount <= 0) {
      toast.error("Please fill in all required fields")
      return
    }

    try {
      const transactionData = {
        employeeId: user.id,
        type: formData.type,
        customer: formData.customer,
        cylinderSize: formData.cylinderSize,
        quantity: formData.quantity,
        amount: formData.amount,
        depositAmount: formData.depositAmount,
        refillAmount: formData.refillAmount,
        returnAmount: formData.returnAmount,
        paymentMethod: formData.paymentMethod,
        ...(formData.paymentMethod === "cash" && { cashAmount: formData.cashAmount }),
        ...(formData.paymentMethod === "cheque" && {
          bankName: formData.bankName,
          checkNumber: formData.checkNumber
        }),
        status: formData.status,
        notes: formData.notes
      }

      const response = await fetch("/api/employee-cylinders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(transactionData),
      })

      if (response.ok) {
        toast.success(`${formData.type.charAt(0).toUpperCase() + formData.type.slice(1)} transaction created successfully!`)
        resetForm()
        setIsDialogOpen(false)
        fetchData()
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || "Failed to create transaction")
      }
    } catch (error) {
      console.error("Error creating transaction:", error)
      toast.error("Failed to create transaction")
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "cleared":
        return <Badge className="bg-green-100 text-green-800">Cleared</Badge>
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
      case "overdue":
        return <Badge className="bg-red-100 text-red-800">Overdue</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getPaymentMethodBadge = (method: string) => {
    return method === "cash" ? 
      <Badge className="bg-blue-100 text-blue-800">Cash</Badge> : 
      <Badge className="bg-purple-100 text-purple-800">Cheque</Badge>
  }

  const getFilteredTransactions = () => {
    if (activeTab === "all") return transactions
    return transactions.filter(t => t.type === activeTab)
  }

  const getVisibleColumns = () => {
    const baseColumns = ["type", "customer", "cylinderSize", "quantity", "amount"]
    const transactionSpecific = activeTab === "all" ? 
      ["depositAmount", "refillAmount", "returnAmount"] :
      activeTab === "deposit" ? ["depositAmount"] :
      activeTab === "refill" ? ["refillAmount"] :
      ["returnAmount"]
    const commonColumns = ["paymentMethod", "cashAmount", "bankName", "checkNumber", "notes", "status", "date", "actions"]
    
    return [...baseColumns, ...transactionSpecific, ...commonColumns]
  }

  const renderTableHeaders = () => {
    const visibleColumns = getVisibleColumns()
    return (
      <TableRow>
        {visibleColumns.includes("type") && <TableHead>Type</TableHead>}
        {visibleColumns.includes("customer") && <TableHead>Customer</TableHead>}
        {visibleColumns.includes("cylinderSize") && <TableHead>Cylinder Size</TableHead>}
        {visibleColumns.includes("quantity") && <TableHead>Quantity</TableHead>}
        {visibleColumns.includes("amount") && <TableHead>Amount</TableHead>}
        {visibleColumns.includes("depositAmount") && <TableHead>Deposit Amount</TableHead>}
        {visibleColumns.includes("refillAmount") && <TableHead>Refill Amount</TableHead>}
        {visibleColumns.includes("returnAmount") && <TableHead>Return Amount</TableHead>}
        {visibleColumns.includes("paymentMethod") && <TableHead>Payment Method</TableHead>}
        {visibleColumns.includes("cashAmount") && <TableHead>Cash Amount</TableHead>}
        {visibleColumns.includes("bankName") && <TableHead>Bank Name</TableHead>}
        {visibleColumns.includes("checkNumber") && <TableHead>Check Number</TableHead>}
        {visibleColumns.includes("notes") && <TableHead>Notes</TableHead>}
        {visibleColumns.includes("status") && <TableHead>Status</TableHead>}
        {visibleColumns.includes("date") && <TableHead>Date</TableHead>}
        {visibleColumns.includes("actions") && <TableHead>Actions</TableHead>}
      </TableRow>
    )
  }

  const renderTableCells = (transaction: CylinderTransaction) => {
    const visibleColumns = getVisibleColumns()
    return (
      <TableRow key={transaction._id}>
        {visibleColumns.includes("type") && (
          <TableCell className="capitalize font-medium">{transaction.type}</TableCell>
        )}
        {visibleColumns.includes("customer") && (
          <TableCell>{transaction.customer.name}</TableCell>
        )}
        {visibleColumns.includes("cylinderSize") && (
          <TableCell>{CYLINDER_SIZE_DISPLAY[transaction.cylinderSize as keyof typeof CYLINDER_SIZE_DISPLAY] || transaction.cylinderSize}</TableCell>
        )}
        {visibleColumns.includes("quantity") && (
          <TableCell>{transaction.quantity}</TableCell>
        )}
        {visibleColumns.includes("amount") && (
          <TableCell>AED {transaction.amount}</TableCell>
        )}
        {visibleColumns.includes("depositAmount") && (
          <TableCell>{transaction.depositAmount ? `AED ${transaction.depositAmount}` : "-"}</TableCell>
        )}
        {visibleColumns.includes("refillAmount") && (
          <TableCell>{transaction.refillAmount ? `AED ${transaction.refillAmount}` : "-"}</TableCell>
        )}
        {visibleColumns.includes("returnAmount") && (
          <TableCell>{transaction.returnAmount ? `AED ${transaction.returnAmount}` : "-"}</TableCell>
        )}
        {visibleColumns.includes("paymentMethod") && (
          <TableCell>{getPaymentMethodBadge(transaction.paymentMethod)}</TableCell>
        )}
        {visibleColumns.includes("cashAmount") && (
          <TableCell>{transaction.cashAmount ? `AED ${transaction.cashAmount}` : "-"}</TableCell>
        )}
        {visibleColumns.includes("bankName") && (
          <TableCell>{transaction.bankName || "-"}</TableCell>
        )}
        {visibleColumns.includes("checkNumber") && (
          <TableCell>{transaction.checkNumber || "-"}</TableCell>
        )}
        {visibleColumns.includes("notes") && (
          <TableCell>
            {transaction.notes ? (
              <span title={transaction.notes}>
                {transaction.notes.length > 20 ? `${transaction.notes.substring(0, 20)}...` : transaction.notes}
              </span>
            ) : "-"}
          </TableCell>
        )}
        {visibleColumns.includes("status") && (
          <TableCell>{getStatusBadge(transaction.status)}</TableCell>
        )}
        {visibleColumns.includes("date") && (
          <TableCell>{new Date(transaction.createdAt).toLocaleDateString()}</TableCell>
        )}
        {visibleColumns.includes("actions") && (
          <TableCell>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Edit className="w-4 h-4" />
              </Button>
            </div>
          </TableCell>
        )}
      </TableRow>
    )
  }

  if (loading) {
    return <div className="p-6">Loading...</div>
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#2B3068]">Cylinder Sales</h1>
          <p className="text-gray-600 text-sm sm:text-base">Manage your cylinder transactions</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto bg-[#2B3068] hover:bg-[#1a1f4a] text-white">
              <Plus className="w-4 h-4 mr-2" />
              New Transaction
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Cylinder Transaction</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Transaction Type */}
              <div className="space-y-2">
                <Label htmlFor="type">Transaction Type *</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="deposit">Deposit</SelectItem>
                    <SelectItem value="refill">Refill</SelectItem>
                    <SelectItem value="return">Return</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Customer Selection with Autocomplete */}
              <div className="space-y-2 relative">
                <Label htmlFor="customer">Customer *</Label>
                <Input
                  id="customer"
                  placeholder="Search by name, email, or phone..."
                  value={customerSearch}
                  onChange={(e) => handleCustomerSearchChange(e.target.value)}
                  onFocus={handleCustomerInputFocus}
                  onBlur={handleCustomerInputBlur}
                  className="pr-10"
                />
                {showCustomerSuggestions && filteredCustomers.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredCustomers.map((customer) => (
                      <div
                        key={customer._id}
                        className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        onClick={() => handleCustomerSuggestionClick(customer)}
                      >
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">{customer.name}</span>
                          <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                            <span>Email: {customer.email}</span>
                            <span>Phone: {customer.phone}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Cylinder Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cylinder Size *</Label>
                  <Select value={formData.cylinderSize} onValueChange={(value) => setFormData({...formData, cylinderSize: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Quantity *</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 1})}
                  />
                </div>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label>Amount (AED) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
                />
              </div>

              {/* Transaction-specific amounts */}
              {formData.type === "deposit" && (
                <div className="space-y-2">
                  <Label>Deposit Amount (AED)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.depositAmount}
                    onChange={(e) => setFormData({...formData, depositAmount: parseFloat(e.target.value) || 0})}
                    placeholder="Enter deposit amount"
                  />
                </div>
              )}

              {formData.type === "refill" && (
                <div className="space-y-2">
                  <Label>Refill Amount (AED)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.refillAmount}
                    onChange={(e) => setFormData({...formData, refillAmount: parseFloat(e.target.value) || 0})}
                    placeholder="Enter refill amount"
                  />
                </div>
              )}

              {formData.type === "return" && (
                <div className="space-y-2">
                  <Label>Return Amount (AED)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.returnAmount}
                    onChange={(e) => setFormData({...formData, returnAmount: parseFloat(e.target.value) || 0})}
                    placeholder="Enter return amount"
                  />
                </div>
              )}

              {/* Payment Method */}
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={formData.paymentMethod} onValueChange={(value) => setFormData({...formData, paymentMethod: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Method Fields */}
              {formData.paymentMethod === "cash" && (
                <div className="space-y-2">
                  <Label>Cash Amount (AED)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.cashAmount}
                    onChange={(e) => setFormData({...formData, cashAmount: parseFloat(e.target.value) || 0})}
                  />
                </div>
              )}

              {formData.paymentMethod === "cheque" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Bank Name</Label>
                    <Input
                      value={formData.bankName}
                      onChange={(e) => setFormData({...formData, bankName: e.target.value})}
                      placeholder="Enter bank name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Check Number</Label>
                    <Input
                      value={formData.checkNumber}
                      onChange={(e) => setFormData({...formData, checkNumber: e.target.value})}
                      placeholder="Enter check number"
                    />
                  </div>
                </div>
              )}

              {/* Status */}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="cleared">Cleared</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Additional notes..."
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-4">
                <Button type="submit" className="flex-1 bg-[#2B3068] hover:bg-[#1a1f4a]">
                  Create Transaction
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                <p className="text-2xl font-bold text-[#2B3068]">{transactions.length}</p>
              </div>
              <FileText className="w-8 h-8 text-[#2B3068]" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">
                  AED {transactions.reduce((sum, t) => sum + t.amount, 0).toFixed(2)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {transactions.filter(t => t.status === "pending").length}
                </p>
              </div>
              <Package className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-red-600">
                  {transactions.filter(t => t.status === "overdue").length}
                </p>
              </div>
              <Package className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-[#2B3068] to-[#1a1f4a] text-white rounded-t-lg">
          <CardTitle>Cylinder Transactions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="p-4 border-b">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="deposit">Deposit</TabsTrigger>
                <TabsTrigger value="refill">Refill</TabsTrigger>
                <TabsTrigger value="return">Return</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value={activeTab} className="m-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    {renderTableHeaders()}
                  </TableHeader>
                  <TableBody>
                    {getFilteredTransactions().map((transaction) => renderTableCells(transaction))}
                    {getFilteredTransactions().length === 0 && (
                      <TableRow>
                        <TableCell colSpan={getVisibleColumns().length} className="text-center text-gray-500 py-8">
                          No {activeTab === "all" ? "" : activeTab} transactions found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
