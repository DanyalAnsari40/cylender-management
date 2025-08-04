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
  address?: string
}

interface Product {
  _id: string
  name: string
  category: "gas" | "cylinder"
  cylinderType?: "large" | "small"
  costPrice: number
  leastPrice: number
  currentStock: number
}

interface CylinderTransaction {
  _id: string
  type: string
  customer: Customer
  product?: Product
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
  securityAmount?: number // Added for optional use
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
  const [products, setProducts] = useState<Product[]>([])
  const [stockAssignments, setStockAssignments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("all")
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null)

  // Customer search state
  const [customerSearch, setCustomerSearch] = useState("")
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false)
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])

  // Form state
  const [formData, setFormData] = useState({
    type: "deposit",
    customer: "",
    product: "",
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
    notes: "",
    securityAmount: 0 // Added for security deposit
  })

  useEffect(() => {
    fetchData()
    fetchProducts()
  }, [user.id])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [transactionsResponse, customersResponse, productsResponse, stockAssignmentsResponse] = await Promise.all([
        fetch(`/api/employee-cylinders?employeeId=${user.id}`),
        fetch("/api/customers"),
        fetch("/api/products"),
        fetch(`/api/stock-assignments?employeeId=${user.id}&status=received`)
      ])

      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json()
        const transactions = transactionsData.data || transactionsData
        setTransactions(Array.isArray(transactions) ? transactions : [])
      } else {
        console.error("Failed to fetch transactions:", transactionsResponse.status)
        setTransactions([])
      }

      if (customersResponse.ok) {
        const customersData = await customersResponse.json()
        const customers = customersData.data || customersData
        setCustomers(Array.isArray(customers) ? customers : [])
      } else {
        console.error("Failed to fetch customers:", customersResponse.status)
        setCustomers([])
      }

      if (productsResponse.ok) {
        const productsData = await productsResponse.json()
        const products = productsData.data || productsData
        // Only set cylinder products
        const cylinderProducts = Array.isArray(products) ? products.filter((p: any) => p.category === "cylinder") : []
        setProducts(cylinderProducts)
      } else {
        console.error("Failed to fetch products:", productsResponse.status)
        setProducts([])
      }

      if (stockAssignmentsResponse.ok) {
        const stockData = await stockAssignmentsResponse.json()
        const assignments = stockData.data || stockData
        setStockAssignments(Array.isArray(assignments) ? assignments : [])
      } else {
        console.error("Failed to fetch stock assignments:", stockAssignmentsResponse.status)
        setStockAssignments([])
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      setTransactions([])
      setCustomers([])
      setProducts([])
      setStockAssignments([])
    } finally {
      setLoading(false)
    }
  }

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/products")
      const productsData = await response.json()
      const products = productsData.data || productsData
      // Only set cylinder products
      const cylinderProducts = Array.isArray(products) ? products.filter((p: any) => p.category === "cylinder") : []
      setProducts(cylinderProducts)
    } catch (error) {
      console.error("Failed to fetch products:", error)
    }
  }

  const resetForm = () => {
    setFormData({
      type: "deposit",
      customer: "",
      product: "",
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
      notes: "",
      securityAmount: 0 // Added for security deposit
    })
    setCustomerSearch("")
    setShowCustomerSuggestions(false)
    setFilteredCustomers([])
    setEditingTransactionId(null)
  }

  const handleCustomerSearchChange = (value: string) => {
    setCustomerSearch(value)
    if (value.trim()) {
      const filtered = customers.filter(customer =>
        customer.name.toLowerCase().includes(value.toLowerCase()) ||
        customer.email.toLowerCase().includes(value.toLowerCase()) ||
        customer.phone.includes(value)
      ).slice(0, 5)
      setFilteredCustomers(filtered)
      setShowCustomerSuggestions(true)
    } else {
      setShowCustomerSuggestions(false)
      setFilteredCustomers([])
      setFormData(prev => ({ ...prev, customer: "" }))
    }
  }

  const handleCustomerSuggestionClick = (customer: Customer) => {
    setCustomerSearch(customer.name)
    setFormData(prev => ({ ...prev, customer: customer._id }))
    setShowCustomerSuggestions(false)
    setFilteredCustomers([])
  }

  const handleCustomerInputFocus = () => {
    if (customerSearch.trim() && filteredCustomers.length > 0) {
      setShowCustomerSuggestions(true)
    }
  }

  const handleCustomerInputBlur = () => {
    setTimeout(() => {
      setShowCustomerSuggestions(false)
    }, 200)
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => {
      const newState = { ...prev, [name]: value };

      // When transaction type changes, reset amount fields
      if (name === 'type') {
        newState.amount = 0;
        newState.depositAmount = 0;
        newState.refillAmount = 0;
        newState.returnAmount = 0;
      }

      // When product changes, auto-fill the amount with least price
      if (name === 'product') {
        const selectedProduct = products.find(p => p._id === value);
        if (selectedProduct) {
          const calculatedAmount = selectedProduct.leastPrice * newState.quantity;
          newState.amount = calculatedAmount;
          
          // Set specific amount fields based on transaction type
          if (newState.type === 'deposit') {
            newState.depositAmount = calculatedAmount;
          } else if (newState.type === 'refill') {
            newState.refillAmount = calculatedAmount;
          } else if (newState.type === 'return') {
            newState.returnAmount = calculatedAmount;
          }
        }
      }

      return newState;
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const numericValue = value === '' ? 0 : parseFloat(value);

    setFormData((prev) => {
      const newState = { ...prev, [name]: name === 'notes' || name === 'bankName' || name === 'checkNumber' ? value : numericValue };

      // When quantity changes, recalculate amounts based on selected product
      if (name === 'quantity' && newState.product) {
        const selectedProduct = products.find(p => p._id === newState.product);
        if (selectedProduct) {
          const calculatedAmount = selectedProduct.leastPrice * numericValue;
          newState.amount = calculatedAmount;
          
          // Update specific amount fields based on transaction type
          if (newState.type === 'deposit') {
            newState.depositAmount = calculatedAmount;
          } else if (newState.type === 'refill') {
            newState.refillAmount = calculatedAmount;
          } else if (newState.type === 'return') {
            newState.returnAmount = calculatedAmount;
          }
        }
      }

      // Sync the main 'amount' field with the specific amount field being changed
      if (['depositAmount', 'refillAmount', 'returnAmount'].includes(name)) {
        newState.amount = numericValue;
      }

      // Auto-update status based on deposit amount comparison (only for deposit transactions)
      if (newState.type === 'deposit' && (name === 'depositAmount' || name === 'amount')) {
        const depositAmt = name === 'depositAmount' ? numericValue : newState.depositAmount;
        const totalAmt = name === 'amount' ? numericValue : newState.amount;
        
        if (depositAmt >= totalAmt && totalAmt > 0) {
          newState.status = 'cleared';
        } else if (depositAmt < totalAmt && depositAmt > 0) {
          newState.status = 'pending';
        }
      }

      return newState;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Enhanced validation
    if (!formData.customer || !formData.product || !formData.cylinderSize || formData.quantity <= 0) {
      toast.error("Please fill in all required fields")
      return
    }

    // Get selected product for validation
    const selectedProduct = products.find(p => p._id === formData.product)
    if (!selectedProduct) {
      toast.error("Please select a valid product")
      return
    }

    // Calculate total received stock for this product
    const totalReceivedStock = stockAssignments
      .filter(sa => sa.product._id === formData.product)
      .reduce((sum, sa) => sum + (sa.remainingQuantity || 0), 0)

    if (totalReceivedStock < formData.quantity) {
      toast.error(`Insufficient assigned stock for ${selectedProduct.name}. Available: ${totalReceivedStock}, Requested: ${formData.quantity}`)
      return
    }

    // Calculate amount based on least price and quantity
    const calculatedAmount = selectedProduct.leastPrice * formData.quantity

    try {
      const transactionData = {
        employeeId: user.id,
        type: formData.type,
        customer: formData.customer,
        product: formData.product,
        cylinderSize: formData.cylinderSize,
        quantity: formData.quantity,
        amount: calculatedAmount,
        depositAmount: formData.type === "deposit" ? calculatedAmount : 0,
        refillAmount: formData.type === "refill" ? calculatedAmount : 0,
        returnAmount: formData.type === "return" ? calculatedAmount : 0,
        paymentMethod: formData.paymentMethod,
        cashAmount: formData.paymentMethod === "cash" ? calculatedAmount : 0,
        bankName: formData.paymentMethod === "cheque" ? formData.bankName : "",
        checkNumber: formData.paymentMethod === "cheque" ? formData.checkNumber : "",
        status: formData.status,
        notes: formData.notes
      }

      const isEditing = editingTransactionId !== null
      const url = isEditing ? `/api/employee-cylinders/${editingTransactionId}` : "/api/employee-cylinders"
      const method = isEditing ? "PUT" : "POST"

      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(transactionData),
      })

      if (response.ok) {
        const actionText = isEditing ? "updated" : "created"
        toast.success(`${formData.type.charAt(0).toUpperCase() + formData.type.slice(1)} transaction ${actionText} successfully!`)
        resetForm()
        setIsDialogOpen(false)
        fetchData()
      } else {
        const errorData = await response.json()
        const actionText = isEditing ? "update" : "create"
        toast.error(errorData.error || `Failed to ${actionText} transaction`)
      }
    } catch (error) {
      const actionText = editingTransactionId ? "updating" : "creating"
      console.error(`Error ${actionText} transaction:`, error)
      toast.error(`Failed to ${actionText.replace('ing', '')} transaction`)
    }
  }

  // Handle edit transaction
  const handleEdit = (transaction: CylinderTransaction) => {
    setFormData({
      type: transaction.type,
      customer: transaction.customer?._id || '',
      product: transaction.product?._id || '',
      cylinderSize: transaction.cylinderSize,
      quantity: transaction.quantity,
      amount: transaction.amount,
      depositAmount: transaction.depositAmount || 0,
      refillAmount: transaction.refillAmount || 0,
      returnAmount: transaction.returnAmount || 0,
      paymentMethod: transaction.paymentMethod || 'cash',
      cashAmount: transaction.cashAmount || 0,
      bankName: transaction.bankName || '',
      checkNumber: transaction.checkNumber || '',
      status: transaction.status,
      notes: transaction.notes || '',
      securityAmount: transaction.securityAmount || 0
    })
    setCustomerSearch(transaction.customer?.name || '')
    setEditingTransactionId(transaction._id)
    setIsDialogOpen(true)
  }

  // Handle delete transaction
  const handleDelete = async (transactionId: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) {
      return
    }

    try {
      const response = await fetch(`/api/employee-cylinders/${transactionId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Transaction deleted successfully!')
        await fetchData()
      } else {
        toast.error('Failed to delete transaction')
      }
    } catch (error) {
      console.error('Error deleting transaction:', error)
      toast.error('Error deleting transaction')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "cleared":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "overdue":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getPaymentMethodBadge = (method: string) => {
    return method === "cash" ? 
      "bg-blue-100 text-blue-800" : 
      "bg-purple-100 text-purple-800"
  }

  // Get selected product details
  const getSelectedProduct = () => {
    return products.find(p => p._id === formData.product) || null;
  };

  // Filter transactions based on active tab
  const getFilteredTransactions = () => {
    if (activeTab === 'all') {
      return transactions
    }
    return transactions.filter(transaction => transaction.type === activeTab)
  }



  // Get visible columns based on active tab
  const getVisibleColumns = () => {
    const baseColumns = ['type', 'customer', 'product', 'cylinderSize', 'quantity', 'amount']
    const paymentColumns = ['paymentMethod', 'cashAmount', 'bankName', 'checkNumber']
    const commonColumns = ['notes', 'status', 'date', 'actions']
    
    let amountColumns: string[] = []
    if (activeTab === 'all') {
      amountColumns = ['depositAmount', 'refillAmount', 'returnAmount']
    } else if (activeTab === 'deposit') {
      amountColumns = ['depositAmount']
    } else if (activeTab === 'refill') {
      amountColumns = ['refillAmount']
    } else if (activeTab === 'return') {
      amountColumns = ['returnAmount']
    }
    
    return [...baseColumns, ...amountColumns, ...paymentColumns, ...commonColumns]
  }

  // Render table headers based on visible columns
  const renderTableHeaders = () => {
    const visibleColumns = getVisibleColumns()
    const columnHeaders: { [key: string]: string } = {
      type: 'Type',
      customer: 'Customer',
      product: 'Product',
      cylinderSize: 'Cylinder Size',
      quantity: 'Quantity',
      amount: 'Amount (AED)',
      depositAmount: 'Deposit Amount (AED)',
      refillAmount: 'Refill Amount (AED)',
      returnAmount: 'Return Amount (AED)',
      paymentMethod: 'Security Type',
      cashAmount: 'Cash Amount (AED)',
      bankName: 'Bank Name',
      checkNumber: 'Check Number',
      notes: 'Notes',
      status: 'Status',
      date: 'Date',
      actions: 'Actions'
    }

    return (
      <TableRow>
        {visibleColumns.map((column) => (
          <TableHead key={column} className="text-left font-semibold">
            {columnHeaders[column]}
          </TableHead>
        ))}
      </TableRow>
    )
  }

  // Render table cells for a transaction
  const renderTableCells = (transaction: CylinderTransaction) => {
    const visibleColumns = getVisibleColumns()

    const cellRenderers: { [key: string]: () => JSX.Element } = {
      type: () => (
        <TableCell className="p-4">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            transaction.type === 'deposit' ? 'bg-blue-100 text-blue-800' :
            transaction.type === 'refill' ? 'bg-green-100 text-green-800' :
            'bg-purple-100 text-purple-800'
          }`}>
            {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
          </span>
        </TableCell>
      ),
      customer: () => (
        <TableCell className="p-4">
          <div>
            <div className="font-medium">{transaction.customer.name}</div>
            <div className="text-sm text-gray-500">{transaction.customer.phone}</div>
          </div>
        </TableCell>
      ),
      product: () => (
        <TableCell className="p-4">
          {transaction.product ? transaction.product.name : 'N/A'}
        </TableCell>
      ),
      cylinderSize: () => (
        <TableCell className="p-4">
          {transaction.cylinderSize}
        </TableCell>
      ),
      quantity: () => (
        <TableCell className="p-4">
          {transaction.quantity}
        </TableCell>
      ),
      amount: () => (
        <TableCell className="p-4">
          AED {transaction.amount.toFixed(2)}
        </TableCell>
      ),
      depositAmount: () => (
        <TableCell className="p-4">
          AED {transaction.depositAmount.toFixed(2)}
        </TableCell>
      ),
      refillAmount: () => (
        <TableCell className="p-4">
          AED {transaction.refillAmount.toFixed(2)}
        </TableCell>
      ),
      returnAmount: () => (
        <TableCell className="p-4">
          AED {transaction.returnAmount.toFixed(2)}
        </TableCell>
      ),
      paymentMethod: () => (
        <TableCell className="p-4">
          <Badge className={getPaymentMethodBadge(transaction.paymentMethod)}>
            {transaction.paymentMethod.charAt(0).toUpperCase() + transaction.paymentMethod.slice(1)}
          </Badge>
        </TableCell>
      ),
      cashAmount: () => (
        <TableCell className="p-4">
          AED {transaction.cashAmount.toFixed(2)}
        </TableCell>
      ),
      bankName: () => (
        <TableCell className="p-4">
          {transaction.bankName || 'N/A'}
        </TableCell>
      ),
      checkNumber: () => (
        <TableCell className="p-4">
          {transaction.checkNumber || 'N/A'}
        </TableCell>
      ),
      notes: () => (
        <TableCell className="p-4">
          {transaction.notes || 'N/A'}
        </TableCell>
      ),
      status: () => (
        <TableCell className="p-4">
          <Badge className={getStatusBadge(transaction.status)}>
            {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
          </Badge>
        </TableCell>
      ),
      date: () => (
        <TableCell className="p-4">
          {new Date(transaction.createdAt).toLocaleDateString()}
        </TableCell>
      ),
      actions: () => (
        <TableCell className="p-4">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleEdit(transaction)}
              className="h-8 px-2 text-xs"
            >
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDelete(transaction._id)}
              className="h-8 px-2 text-xs text-red-600 hover:text-red-700"
            >
              Delete
            </Button>
          </div>
        </TableCell>
      )
    }

    return (
      <TableRow key={transaction._id}>
        {visibleColumns.map((column) => cellRenderers[column]())}
      </TableRow>
    )
  }



  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#2B3068] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading cylinder transactions...</p>
        </div>
      </div>
    )
  }
  return (
    <div className="pt-16 lg:pt-0 space-y-8">
      <div className="bg-gradient-to-r from-[#2B3068] to-[#1a1f4a] rounded-2xl p-8 text-white">
        <h1 className="text-4xl font-bold mb-2">Employee Cylinder Sales</h1>
        <p className="text-white/80 text-lg">Manage your cylinder sales and transactions</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Total Transactions</CardTitle>
            <FileText className="w-5 h-5 text-[#2B3068]" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#2B3068]">{transactions.length}</div>
            <p className="text-xs text-gray-600 mt-1">All transactions</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Total Revenue</CardTitle>
            <DollarSign className="w-5 h-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              AED {transactions.reduce((sum, t) => sum + (t.refillAmount || 0), 0).toFixed(2)}
            </div>
            <p className="text-xs text-gray-600 mt-1">Revenue generated</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Pending</CardTitle>
            <Package className="w-5 h-5 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              {transactions.filter(t => t.status === "pending").length}
            </div>
            <p className="text-xs text-gray-600 mt-1">Pending transactions</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Cleared</CardTitle>
            <Package className="w-5 h-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {transactions.filter(t => t.status === "cleared").length}
            </div>
            <p className="text-xs text-gray-600 mt-1">Cleared transactions</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          {/* Search can be added here later if needed */}
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()} className="bg-[#2B3068] hover:bg-[#1a1f4a] text-white w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              New Transaction
            </Button>
          </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTransactionId ? "Edit Cylinder Transaction" : "Create New Cylinder Transaction"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 py-4">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {/* Transaction Type */}
    <div>
      <Label htmlFor="type">Transaction Type</Label>
      <Select value={formData.type} onValueChange={(value) => handleSelectChange("type", value)}>
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

    {/* Customer */}
    <div className="relative">
      <Label htmlFor="customer">Customer</Label>
      <Input
        id="customer"
        type="text"
        value={customerSearch}
        onChange={(e) => handleCustomerSearchChange(e.target.value)}
        onFocus={handleCustomerInputFocus}
        onBlur={handleCustomerInputBlur}
        placeholder="Search for a customer..."
        autoComplete="off"
      />
      {showCustomerSuggestions && filteredCustomers.length > 0 && (
        <ul className="absolute z-50 w-full bg-white border border-gray-300 rounded-md mt-1 max-h-60 overflow-auto shadow-lg">
          {filteredCustomers.map((customer) => (
            <li
              key={customer._id}
              className="p-2 hover:bg-gray-100 cursor-pointer"
              onMouseDown={() => handleCustomerSuggestionClick(customer)}
            >
              {customer.name} ({customer.phone})
            </li>
          ))}
        </ul>
      )}
    </div>

    {/* Product */}
    <div>
      <Label htmlFor="product">Product</Label>
      <Select name="product" value={formData.product} onValueChange={(value) => handleSelectChange("product", value)}>
        <SelectTrigger>
          <SelectValue placeholder="Select a product" />
        </SelectTrigger>
        <SelectContent>
          {products.map((product) => (
            <SelectItem key={product._id} value={product._id}>
              {product.name} - AED {product.leastPrice.toFixed(2)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {getSelectedProduct() && (
        <p className="text-sm text-gray-500 mt-1">
          Price: AED {getSelectedProduct()!.leastPrice.toFixed(2)} per unit
        </p>
      )}
    </div>

    {/* Cylinder Size */}
    <div>
      <Label htmlFor="cylinderSize">Cylinder Size</Label>
      <Select value={formData.cylinderSize} onValueChange={(value) => handleSelectChange("cylinderSize", value)}>
        <SelectTrigger>
          <SelectValue placeholder="Select size" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="small">Small (5kg)</SelectItem>
          <SelectItem value="large">Large (45kg)</SelectItem>
        </SelectContent>
      </Select>
    </div>

    {/* Quantity */}
    <div>
      <Label htmlFor="quantity">Quantity</Label>
      <Input
        id="quantity"
        name="quantity"
        type="number"
        value={formData.quantity}
        onChange={handleChange}
        className="w-full"
      />
    </div>

    {/* Amount */}
    <div>
      <Label htmlFor="amount">Amount</Label>
      <Input
        id="amount"
        name="amount"
        type="number"
        value={formData.amount}
        onChange={handleChange}
        className="w-full"
      />
    </div>

    {/* Security Type (Payment Method) - Only show if not refill */}
    {formData.type !== 'refill' && (
      <div>
        <Label htmlFor="paymentMethod">Security Type</Label>
        <Select value={formData.paymentMethod} onValueChange={(value) => handleSelectChange("paymentMethod", value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select security type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="cheque">Cheque</SelectItem>
          </SelectContent>
        </Select>
      </div>
    )}

    {/* Security Cash field (if cash) - Only show if not refill */}
    {formData.type !== 'refill' && formData.paymentMethod === 'cash' && (
      <div>
        <Label htmlFor="cashAmount">Security Cash</Label>
        <Input id="cashAmount" name="cashAmount" type="number" value={formData.cashAmount} onChange={handleChange} />
      </div>
    )}

    {/* Cheque fields (if cheque) - Only show if not refill */}
    {formData.type !== 'refill' && formData.paymentMethod === 'cheque' && (
      <>
        <div>
          <Label htmlFor="bankName">Bank Name</Label>
          <Input id="bankName" name="bankName" value={formData.bankName} onChange={handleChange} />
        </div>
        <div>
          <Label htmlFor="checkNumber">Check Number</Label>
          <Input id="checkNumber" name="checkNumber" value={formData.checkNumber} onChange={handleChange} />
        </div>
      </>
    )}

    {/* Deposit Amount - Only show if not refill */}
    {formData.type !== 'refill' && (
      <div>
        <Label htmlFor="depositAmount">Deposit Amount</Label>
        <Input id="depositAmount" name="depositAmount" type="number" value={formData.depositAmount} onChange={handleChange} />
      </div>
    )}

    {/* Status - Only show if not refill */}
    {formData.type !== 'refill' && (
      <div>
        <Label htmlFor="status">Status</Label>
        <Select value={formData.status} onValueChange={(value) => handleSelectChange("status", value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="cleared">Cleared</SelectItem>
          </SelectContent>
        </Select>
      </div>
    )}
  </div>

  {/* Notes */}
  <div>
    <Label htmlFor="notes">Notes</Label>
    <Textarea id="notes" name="notes" value={formData.notes} onChange={handleChange} />
  </div>

  <div className="flex justify-end pt-4">
    <Button type="submit" className="bg-[#2B3068] text-white hover:bg-blue-800">
      {editingTransactionId ? "Update Transaction" : "Create Transaction"}
    </Button>
  </div>
</form>

        </DialogContent>
      </Dialog>
    </div>

    {/* Transactions Table */}
    <Card className="border-0 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-[#2B3068] to-[#1a1f4a] text-white rounded-t-lg">
        <CardTitle>Cylinder Transactions</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="border-b border-gray-200 px-6">
            <TabsList className="bg-transparent p-0 -mb-px">
              <TabsTrigger value="all" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[#2B3068] rounded-none text-base font-semibold px-4 py-3">All</TabsTrigger>
              <TabsTrigger value="deposit" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none text-base font-semibold px-4 py-3">Deposits</TabsTrigger>
              <TabsTrigger value="refill" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-green-600 rounded-none text-base font-semibold px-4 py-3">Refills</TabsTrigger>
              <TabsTrigger value="return" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-orange-600 rounded-none text-base font-semibold px-4 py-3">Returns</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value={activeTab} className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50">
                  {renderTableHeaders()}
                </TableHeader>
                <TableBody>
                  {getFilteredTransactions().length > 0 ? (
                    getFilteredTransactions().map((transaction) => renderTableCells(transaction))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={getVisibleColumns().length} className="h-24 text-center text-lg text-gray-500">
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
