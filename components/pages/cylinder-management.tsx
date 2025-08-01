"use client"

import type React from "react"

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
import { Plus, Edit, Trash2, Search, Filter, Cylinder, RotateCcw, ArrowDown, ArrowUp } from "lucide-react"
import { cylindersAPI, customersAPI } from "@/lib/api"
import { CustomerDropdown } from "@/components/ui/customer-dropdown"
import { ReceiptDialog } from "@/components/receipt-dialog"
import { SignatureDialog } from "@/components/signature-dialog"

interface CylinderTransaction {
  _id: string
  type: "deposit" | "refill" | "return"
  customer: {
    _id: string
    name: string
    phone: string
    address: string
  }
  cylinderSize: string
  quantity: number
  amount: number
  depositAmount?: number
  refillAmount?: number
  returnAmount?: number
  status: "pending" | "cleared" | "overdue"
  notes?: string
  createdAt: string
  updatedAt: string
}

interface Customer {
  _id: string
  name: string
  phone: string
  address: string
  email?: string
}

export function CylinderManagement() {
  const [transactions, setTransactions] = useState<CylinderTransaction[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<CylinderTransaction | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [receiptDialogData, setReceiptDialogData] = useState(null as any)
  const [showSignatureDialog, setShowSignatureDialog] = useState(false)
  const [pendingTransaction, setPendingTransaction] = useState<CylinderTransaction | null>(null)
  const [customerSignature, setCustomerSignature] = useState<string>("") 
  const [statusFilter, setStatusFilter] = useState("all")
  const [activeTab, setActiveTab] = useState("all")
  
  // Customer autocomplete functionality for form
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false)
  const [filteredCustomerSuggestions, setFilteredCustomerSuggestions] = useState<Customer[]>([])
  const [customerSearchTerm, setCustomerSearchTerm] = useState("")
  
  // Search filter autocomplete functionality
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false)
  const [filteredSearchSuggestions, setFilteredSearchSuggestions] = useState<Customer[]>([])

  // Form state
  const [formData, setFormData] = useState({
    type: "deposit" as "deposit" | "refill" | "return",
    customerId: "",
    cylinderSize: "",
    quantity: 1,
    amount: 0,
    depositAmount: 0,
    refillAmount: 0,
    returnAmount: 0,
  status: "pending" as "pending" | "cleared" | "overdue",
    notes: "",
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [transactionsResponse, customersResponse] = await Promise.all([
        cylindersAPI.getAll(),
        customersAPI.getAll(),
      ])

      console.log('Transactions API Response:', transactionsResponse)
      console.log('Transactions Response Data:', transactionsResponse?.data)
      
      // Handle nested data structure: response.data.data (same as customers)
      const transactionData = Array.isArray(transactionsResponse?.data?.data) 
        ? transactionsResponse.data.data 
        : Array.isArray(transactionsResponse?.data) 
          ? transactionsResponse.data 
          : Array.isArray(transactionsResponse) 
            ? transactionsResponse 
            : []
      
      const customerData = Array.isArray(customersResponse?.data?.data) 
        ? customersResponse.data.data 
        : Array.isArray(customersResponse?.data) 
          ? customersResponse.data 
          : Array.isArray(customersResponse) 
            ? customersResponse 
            : []
      
      console.log('Processed transaction data:', transactionData)
      console.log('Processed customer data:', customerData)
      
      setTransactions(transactionData)
      setCustomers(customerData)
    } catch (error) {
      console.error("Failed to fetch data:", error)
      setTransactions([])
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      
      if (!formData.customerId || formData.customerId === '') {
        alert("Please select a customer")
        return
      }

      const transactionData = {
        type: formData.type,
        customer: formData.customerId,
        cylinderSize: formData.cylinderSize,
        quantity: formData.quantity,
        amount: formData.amount,
        depositAmount: formData.type === "deposit" ? formData.depositAmount : undefined,
        refillAmount: formData.type === "refill" ? formData.refillAmount : undefined,
        returnAmount: formData.type === "return" ? formData.returnAmount : undefined,
        status: formData.status,
        notes: formData.notes,
      }

      if (editingTransaction) {
        await cylindersAPI.update(editingTransaction._id, transactionData)
      } else {
        // Use specific API endpoints for different transaction types
        switch (formData.type) {
          case "deposit":
            await cylindersAPI.deposit(transactionData)
            break
          case "refill":
            await cylindersAPI.refill(transactionData)
            break
          case "return":
            await cylindersAPI.return(transactionData)
            break
          default:
            await cylindersAPI.create(transactionData)
        }
      }

      await fetchData()
      resetForm()
      setIsDialogOpen(false)
    } catch (error: any) {
      console.error("Failed to save transaction:", error)
      alert(error.response?.data?.error || "Failed to save transaction")
    }
  }

  const resetForm = () => {
    setFormData({
      type: "" as any, // Clear to show placeholder
      customerId: "",
      cylinderSize: "",
      quantity: "" as any, // Clear to show placeholder
      amount: "" as any, // Clear to show placeholder
      depositAmount: "" as any,
      refillAmount: "" as any,
      returnAmount: "" as any,
      status: "pending" as any, // Default to pending
      notes: "",
    })
    setCustomerSearchTerm("")
    setShowCustomerSuggestions(false)
    setFilteredCustomerSuggestions([])
    setEditingTransaction(null)
  }

  const handleEdit = (transaction: CylinderTransaction) => {
    setEditingTransaction(transaction)
    setFormData({
      type: transaction.type,
      customerId: transaction.customer._id,
      cylinderSize: transaction.cylinderSize,
      quantity: transaction.quantity,
      amount: transaction.amount,
      depositAmount: transaction.depositAmount || 0,
      refillAmount: transaction.refillAmount || 0,
      returnAmount: transaction.returnAmount || 0,
      status: transaction.status,
      notes: transaction.notes || "",
    })
    setCustomerSearchTerm(transaction.customer.name)
    setShowCustomerSuggestions(false)
    setFilteredCustomerSuggestions([])
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this transaction?")) {
      try {
        await cylindersAPI.delete(id)
        await fetchData()
      } catch (error) {
        console.error("Failed to delete transaction:", error)
        alert("Failed to delete transaction")
      }
    }
  }
const handleReceiptClick = (transaction: CylinderTransaction) => {
    if (transaction.type === "return") return;

    if (!customerSignature) {
      // No signature yet - show signature dialog first
      setPendingTransaction(transaction)
      setShowSignatureDialog(true)
    } else {
      // Signature already exists - show receipt directly with existing signature
      const saleData = {
        _id: transaction._id,
        invoiceNumber: `CYL-${transaction._id.slice(-8).toUpperCase()}`,
        customer: {
          name: transaction.customer?.name || "Unknown Customer",
          phone: transaction.customer?.phone || "",
          address: transaction.customer?.address || ""
        },
        items: [{
          product: {
            name: `${transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)} - ${transaction.cylinderSize} Cylinder`,
            price: transaction.amount
          },
          quantity: transaction.quantity,
          price: transaction.amount,
          total: transaction.amount * transaction.quantity
        }],
        totalAmount: transaction.amount,
        paymentMethod: "cash",
        paymentStatus: "paid",
        createdAt: transaction.createdAt,
        customerSignature: customerSignature,
      }
      setReceiptDialogData(saleData)
    }
  }

  const handleSignatureComplete = (signature: string) => {
    console.log('CylinderManagement - Signature received:', signature)
    console.log('CylinderManagement - Signature length:', signature?.length)
    console.log('CylinderManagement - Pending transaction:', pendingTransaction?._id)
    
    // Set signature state for future use
    setCustomerSignature(signature)
    setShowSignatureDialog(false)
    
    // Directly open receipt dialog with the pending transaction and signature embedded
    if (pendingTransaction) {
      console.log('CylinderManagement - Opening receipt dialog with signature embedded')
      const saleData = {
        _id: pendingTransaction._id,
        invoiceNumber: `CYL-${pendingTransaction._id.slice(-8).toUpperCase()}`,
        customer: {
          name: pendingTransaction.customer?.name || "Unknown Customer",
          phone: pendingTransaction.customer?.phone || "",
          address: pendingTransaction.customer?.address || ""
        },
        items: [{
          product: {
            name: `${pendingTransaction.type.charAt(0).toUpperCase() + pendingTransaction.type.slice(1)} - ${pendingTransaction.cylinderSize} Cylinder`,
            price: pendingTransaction.amount
          },
          quantity: pendingTransaction.quantity,
          price: pendingTransaction.amount,
          total: pendingTransaction.amount * pendingTransaction.quantity
        }],
        totalAmount: pendingTransaction.amount,
        paymentMethod: "cash",
        paymentStatus: "paid",
        createdAt: pendingTransaction.createdAt,
        customerSignature: signature,
      }
      setReceiptDialogData(saleData)
      setPendingTransaction(null)
    }
  }

  const handleSignatureCancel = () => {
    setShowSignatureDialog(false)
    setPendingTransaction(null)
    setCustomerSignature("")
  }

  // Customer autocomplete functionality
  const handleCustomerSearchChange = (value: string) => {
    setCustomerSearchTerm(value)
    
    if (value.trim().length > 0) {
      const filtered = customers.filter(customer => 
        customer.name.toLowerCase().includes(value.toLowerCase()) ||
        customer.phone.includes(value) ||
        (customer.email && customer.email.toLowerCase().includes(value.toLowerCase()))
      ).slice(0, 5) // Limit to 5 suggestions
      
      setFilteredCustomerSuggestions(filtered)
      setShowCustomerSuggestions(true)
    } else {
      setShowCustomerSuggestions(false)
      setFilteredCustomerSuggestions([])
    }
  }

  const handleCustomerSuggestionClick = (customer: Customer) => {
    setFormData({ ...formData, customerId: customer._id })
    setCustomerSearchTerm(customer.name)
    setShowCustomerSuggestions(false)
    setFilteredCustomerSuggestions([])
  }

  const handleCustomerInputBlur = () => {
    // Delay hiding suggestions to allow click events
    setTimeout(() => {
      setShowCustomerSuggestions(false)
    }, 200)
  }

  const handleCustomerInputFocus = () => {
    if (customerSearchTerm.trim().length > 0 && filteredCustomerSuggestions.length > 0) {
      setShowCustomerSuggestions(true)
    }
  }

  // Search filter autocomplete functionality
  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    
    if (value.trim().length > 0) {
      const filtered = customers.filter(customer => 
        customer.name.toLowerCase().includes(value.toLowerCase()) ||
        customer.phone.includes(value) ||
        (customer.email && customer.email.toLowerCase().includes(value.toLowerCase()))
      ).slice(0, 5) // Limit to 5 suggestions
      
      setFilteredSearchSuggestions(filtered)
      setShowSearchSuggestions(true)
    } else {
      setShowSearchSuggestions(false)
      setFilteredSearchSuggestions([])
    }
  }

  const handleSearchSuggestionClick = (customer: Customer) => {
    setSearchTerm(customer.name)
    setShowSearchSuggestions(false)
    setFilteredSearchSuggestions([])
  }

  const handleSearchInputBlur = () => {
    // Delay hiding suggestions to allow click events
    setTimeout(() => {
      setShowSearchSuggestions(false)
    }, 200)
  }

  const handleSearchInputFocus = () => {
    if (searchTerm.trim().length > 0 && filteredSearchSuggestions.length > 0) {
      setShowSearchSuggestions(true)
    }
  }

  const filteredTransactions = (transactions || []).filter((transaction) => {
    const matchesSearch =
      transaction.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.cylinderSize?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || transaction.status === statusFilter
    const matchesTab = activeTab === "all" || transaction.type === activeTab
    return matchesSearch && matchesStatus && matchesTab
  })

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "deposit":
        return <ArrowDown className="w-4 h-4 text-blue-600" />
      case "refill":
        return <RotateCcw className="w-4 h-4 text-green-600" />
      case "return":
        return <ArrowUp className="w-4 h-4 text-orange-600" />
      default:
        return <Cylinder className="w-4 h-4" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>
      case "cleared":
        return <Badge className="bg-green-100 text-green-800 border-green-200">Cleared</Badge>
      case "overdue":
        return <Badge className="bg-red-100 text-red-800 border-red-200">Overdue</Badge>
      // Legacy support for old status values
      case "active":
        return <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>
      case "returned":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Returned</Badge>
      case "damaged":
        return <Badge className="bg-red-100 text-red-800 border-red-200">Damaged</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "deposit":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Deposit</Badge>
      case "refill":
        return <Badge className="bg-green-100 text-green-800 border-green-200">Refill</Badge>
      case "return":
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200">Return</Badge>
      default:
        return <Badge variant="secondary">{type}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="pt-16 lg:pt-0 space-y-8">
      <div className="bg-gradient-to-r from-[#2B3068] to-[#1a1f4a] rounded-2xl p-8 text-white">
        <h1 className="text-4xl font-bold mb-2">Cylinder Management</h1>
        <p className="text-white/80 text-lg">Manage cylinder deposits, refills, and returns</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Total Deposits</CardTitle>
            <ArrowDown className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {(transactions || []).filter((t) => t.type === "deposit").length}
            </div>
            <p className="text-xs text-gray-600 mt-1">Cylinders deposited</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Total Refills</CardTitle>
            <RotateCcw className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {(transactions || []).filter((t) => t.type === "refill").length}
            </div>
            <p className="text-xs text-gray-600 mt-1">Cylinders refilled</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Total Returns</CardTitle>
            <ArrowUp className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {(transactions || []).filter((t) => t.type === "return").length}
            </div>
            <p className="text-xs text-gray-600 mt-1">Cylinders returned</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Active Cylinders</CardTitle>
            <Cylinder className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {(transactions || []).filter((t) => t.status === "pending").length}
            </div>
            <p className="text-xs text-gray-600 mt-1">Pending/Active</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search by customer or cylinder size..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={handleSearchInputFocus}
              onBlur={handleSearchInputBlur}
              className="pl-10"
            />
            
            {/* Search Suggestions Dropdown */}
            {showSearchSuggestions && filteredSearchSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto">
                {filteredSearchSuggestions.map((customer) => (
                  <div
                    key={customer._id}
                    onClick={() => handleSearchSuggestionClick(customer)}
                    className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{customer.name}</p>
                        <p className="text-sm text-gray-600">{customer.phone}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">{customer.email}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="cleared">Cleared</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="bg-[#2B3068] hover:bg-[#1a1f4a] text-white w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              New Transaction
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTransaction ? "Edit Transaction" : "Create New Transaction"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Transaction Type *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: "deposit" | "refill" | "return") =>
                      setFormData({ ...formData, type: value })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="deposit">Deposit</SelectItem>
                      <SelectItem value="refill">Refill</SelectItem>
                      <SelectItem value="return">Return</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 relative">
                  <Label htmlFor="customer">Customer *</Label>
                  <Input
                    id="customer"
                    placeholder="Search by name, phone, or email..."
                    value={customerSearchTerm}
                    onChange={(e) => handleCustomerSearchChange(e.target.value)}
                    onFocus={handleCustomerInputFocus}
                    onBlur={handleCustomerInputBlur}
                    className="pr-10"
                    required
                  />
                  {showCustomerSuggestions && filteredCustomerSuggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {filteredCustomerSuggestions.map((customer) => (
                        <div
                          key={customer._id}
                          className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                          onClick={() => handleCustomerSuggestionClick(customer)}
                        >
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900">{customer.name}</span>
                            <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                              <span>Phone: {customer.phone}</span>
                              {customer.email && <span>Email: {customer.email}</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cylinderSize">Cylinder Size *</Label>
                  <Select
                    value={formData.cylinderSize}
                    onValueChange={(value) => setFormData({ ...formData, cylinderSize: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5kg">5kg</SelectItem>
                      <SelectItem value="10kg">10kg</SelectItem>
                      <SelectItem value="15kg">15kg</SelectItem>
                      <SelectItem value="20kg">20kg</SelectItem>
                      <SelectItem value="25kg">25kg</SelectItem>
                      <SelectItem value="45kg">45kg</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: Number.parseInt(e.target.value) || 1 })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: Number.parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
              </div>

              {formData.type === "deposit" && (
                <div className="space-y-2">
                  <Label htmlFor="depositAmount">Deposit Amount</Label>
                  <Input
                    id="depositAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.depositAmount}
                    onChange={(e) =>
                      setFormData({ ...formData, depositAmount: Number.parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
              )}

              {formData.type === "refill" && (
                <div className="space-y-2">
                  <Label htmlFor="refillAmount">Refill Amount</Label>
                  <Input
                    id="refillAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.refillAmount}
                    onChange={(e) => setFormData({ ...formData, refillAmount: Number.parseFloat(e.target.value) || 0 })}
                  />
                </div>
              )}

              {formData.type === "return" && (
                <div className="space-y-2">
                  <Label htmlFor="returnAmount">Return Amount</Label>
                  <Input
                    id="returnAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.returnAmount}
                    onChange={(e) => setFormData({ ...formData, returnAmount: Number.parseFloat(e.target.value) || 0 })}
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: "pending" | "cleared" | "overdue") =>
                      setFormData({ ...formData, status: value })
                    }
                  >
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

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes..."
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-[#2B3068] hover:bg-[#1a1f4a] text-white">
                  {editingTransaction ? "Update Transaction" : "Create Transaction"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-[#2B3068] to-[#1a1f4a] text-white rounded-t-lg">
          <CardTitle>Cylinder Transactions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 m-4 mb-0">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="deposit">Deposits</TabsTrigger>
              <TabsTrigger value="refill">Refills</TabsTrigger>
              <TabsTrigger value="return">Returns</TabsTrigger>
            </TabsList>
            <TabsContent value={activeTab} className="mt-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="p-4">Type</TableHead>
                      <TableHead className="p-4">Customer</TableHead>
                      <TableHead className="p-4">Cylinder Size</TableHead>
                      <TableHead className="p-4">Quantity</TableHead>
                      <TableHead className="p-4">Amount</TableHead>
                      <TableHead className="p-4">Status</TableHead>
                      <TableHead className="p-4">Date</TableHead>
                      <TableHead className="p-4">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((transaction) => (
                      <TableRow key={transaction._id}>
                        <TableCell className="p-4">
                          <div className="flex items-center gap-2">
                            {getTransactionIcon(transaction.type)}
                            {getTypeBadge(transaction.type)}
                          </div>
                        </TableCell>
                        <TableCell className="p-4">
                          <div>
                            <div className="font-medium">{transaction.customer?.name || "Unknown Customer"}</div>
                            <div className="text-sm text-gray-500">{transaction.customer?.phone}</div>
                          </div>
                        </TableCell>
                        <TableCell className="p-4 font-medium">{transaction.cylinderSize}</TableCell>
                        <TableCell className="p-4">{transaction.quantity}</TableCell>
                        <TableCell className="p-4 font-semibold">${transaction.amount.toFixed(2)}</TableCell>
                        <TableCell className="p-4">{getStatusBadge(transaction.status)}</TableCell>
                        <TableCell className="p-4">{new Date(transaction.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="p-4">
                          <div className="flex space-x-2">
                            {/* Only show Receipt button for deposit and refill transactions */}
                            {transaction.type !== "return" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReceiptClick(transaction)}
                                className="text-green-600 border-green-600 hover:bg-green-600 hover:text-white"
                              >
                                Receipt
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(transaction)}
                              className="text-[#2B3068] border-[#2B3068] hover:bg-[#2B3068] hover:text-white"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(transaction._id)}
                              className="text-red-600 border-red-600 hover:bg-red-600 hover:text-white"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredTransactions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                          No transactions found.
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
      
      {/* Signature Dialog */}
      <SignatureDialog 
        isOpen={showSignatureDialog}
        onClose={handleSignatureCancel}
        onSignatureComplete={handleSignatureComplete}
        customerName={pendingTransaction?.customer?.name}
      />

      {/* Receipt Dialog with signature */}
      {receiptDialogData && (
        <ReceiptDialog
          sale={receiptDialogData}
          signature={customerSignature}
          onClose={() => {
            setReceiptDialogData(null)
            // Don't clear signature - keep it for reuse
          }}
        />
      )}
    </div>
  )
}
