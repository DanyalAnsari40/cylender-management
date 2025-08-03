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
import { cylindersAPI, customersAPI, productsAPI } from "@/lib/api"
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
  product?: {
    _id: string
    name: string
    category: string
    cylinderType?: string
  }
  cylinderSize: string
  quantity: number
  amount: number
  depositAmount?: number
  refillAmount?: number
  returnAmount?: number
  paymentMethod?: "cash" | "cheque"
  cashAmount?: number
  bankName?: string
  checkNumber?: string
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

interface Product {
  _id: string
  name: string
  category: "gas" | "cylinder"
  cylinderType?: "large" | "small"
  costPrice: number
  leastPrice: number
  currentStock: number
}

export function CylinderManagement() {
  const [transactions, setTransactions] = useState<CylinderTransaction[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
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

  // Stock validation popup state
  const [showStockValidationPopup, setShowStockValidationPopup] = useState(false)
  const [stockValidationMessage, setStockValidationMessage] = useState("")

  // Dynamic column visibility based on active tab
  const getVisibleColumns = () => {
    const baseColumns = ['type', 'customer', 'product', 'cylinderSize', 'quantity', 'amount']
    const commonColumns = ['paymentMethod', 'cashAmount', 'bankName', 'checkNumber', 'notes', 'status', 'date', 'actions']
    
    switch (activeTab) {
      case 'deposit':
        return [...baseColumns, 'depositAmount', ...commonColumns]
      case 'refill': {
        const columnsToHide = ['amount', 'depositAmount', 'refillAmount', 'returnAmount', 'paymentMethod', 'cashAmount', 'bankName', 'checkNumber', 'status'];
        return [...baseColumns, ...commonColumns].filter(col => !columnsToHide.includes(col));
      }
      case 'return':
        return [...baseColumns, 'returnAmount', ...commonColumns]
      case 'all':
      default:
        return [...baseColumns, 'depositAmount', 'refillAmount', 'returnAmount', ...commonColumns]
    }
  }

  // Helper function to render table headers based on visible columns
  const renderTableHeaders = () => {
    const visibleColumns = getVisibleColumns()
    const columnHeaders = {
      type: 'Type',
      customer: 'Customer',
      product: 'Product',
      cylinderSize: 'Cylinder Size',
      quantity: 'Quantity',
      amount: 'Amount',
      depositAmount: 'Deposit Amount',
      refillAmount: 'Refill Amount',
      returnAmount: 'Return Amount',
      paymentMethod: 'Payment Method',
      cashAmount: 'Security Cash',
      bankName: 'Bank Name',
      checkNumber: 'Check Number',
      notes: 'Notes',
      status: 'Status',
      date: 'Date',
      actions: 'Actions'
    }

    return visibleColumns.map(column => (
      <TableHead key={column} className="p-4">
        {columnHeaders[column as keyof typeof columnHeaders]}
      </TableHead>
    ))
  }

  // Helper function to render table cells based on visible columns
  const renderTableCells = (transaction: CylinderTransaction) => {
    const visibleColumns = getVisibleColumns()
    
    const cellRenderers = {
      type: () => (
        <TableCell className="p-4">
          <div className="flex items-center gap-2">
            {getTransactionIcon(transaction.type)}
            {getTypeBadge(transaction.type)}
          </div>
        </TableCell>
      ),
      customer: () => (
        <TableCell className="p-4">
          <div>
            <div className="font-medium">{transaction.customer?.name || "Unknown Customer"}</div>
            <div className="text-sm text-gray-500">{transaction.customer?.phone}</div>
          </div>
        </TableCell>
      ),
      product: () => {
        const productName = transaction.product?.name || "Unknown Product"
        
        return (
          <TableCell className="p-4">
            <div className="font-medium">
              {productName}
            </div>
          </TableCell>
        )
      },
      cylinderSize: () => (
        <TableCell className="p-4 font-medium">
          {transaction.cylinderSize}
        </TableCell>
      ),
      quantity: () => (
        <TableCell className="p-4">{transaction.quantity}</TableCell>
      ),
      amount: () => (
        <TableCell className="p-4 font-semibold">AED {transaction.amount.toFixed(2)}</TableCell>
      ),
      depositAmount: () => (
        <TableCell className="p-4">
          {transaction.depositAmount ? `AED ${transaction.depositAmount.toFixed(2)}` : '-'}
        </TableCell>
      ),
      refillAmount: () => (
        <TableCell className="p-4">
          {transaction.refillAmount ? `AED ${transaction.refillAmount.toFixed(2)}` : '-'}
        </TableCell>
      ),
      returnAmount: () => (
        <TableCell className="p-4">
          {transaction.returnAmount ? `AED ${transaction.returnAmount.toFixed(2)}` : '-'}
        </TableCell>
      ),
      paymentMethod: () => (
        <TableCell className="p-4">
          {transaction.paymentMethod ? (
            <Badge variant={transaction.paymentMethod === 'cash' ? 'default' : 'secondary'}>
              {transaction.paymentMethod === 'cash' ? 'Cash' : 'Cheque'}
            </Badge>
          ) : '-'}
        </TableCell>
      ),
      cashAmount: () => (
        <TableCell className="p-4">
          {transaction.cashAmount ? `AED ${transaction.cashAmount.toFixed(2)}` : '-'}
        </TableCell>
      ),
      bankName: () => (
        <TableCell className="p-4">
          {transaction.bankName || '-'}
        </TableCell>
      ),
      checkNumber: () => (
        <TableCell className="p-4">
          {transaction.checkNumber || '-'}
        </TableCell>
      ),
      notes: () => (
        <TableCell className="p-4">
          <div className="max-w-32 truncate" title={transaction.notes || ''}>
            {transaction.notes || '-'}
          </div>
        </TableCell>
      ),
      status: () => (
        <TableCell className="p-4">{getStatusBadge(transaction.status)}</TableCell>
      ),
      date: () => (
        <TableCell className="p-4">{new Date(transaction.createdAt).toLocaleDateString()}</TableCell>
      ),
      actions: () => (
        <TableCell className="p-4">
          <div className="flex space-x-2">
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
      )
    }

    return visibleColumns.map(column => {
      const renderer = cellRenderers[column as keyof typeof cellRenderers]
      return renderer ? renderer() : null
    })
  }

  // Form state
  const [formData, setFormData] = useState({
    type: "deposit" as "deposit" | "refill" | "return",
    customerId: "",
    productId: "",
    productName: "",
    cylinderSize: "",
    quantity: 1,
    amount: 0,
    depositAmount: 0,
    refillAmount: 0,
    returnAmount: 0,
    paymentMethod: "cash" as "cash" | "cheque",
    cashAmount: 0,
    bankName: "",
    checkNumber: "",
    status: "pending" as "pending" | "cleared" | "overdue",
    notes: "",
  })

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (formData.type === 'deposit') {
      const amount = Number(formData.amount) || 0;
      const depositAmount = Number(formData.depositAmount) || 0;
      if (depositAmount < amount) {
        setFormData(prev => ({ ...prev, status: 'pending' }));
      } else {
        setFormData(prev => ({ ...prev, status: 'cleared' }));
      }
    }
  }, [formData.amount, formData.depositAmount, formData.type]);

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch data with individual error handling
      let transactionsData = []
      let customersData = []
      let productsData = []
      
      try {
        const transactionsResponse = await cylindersAPI.getAll()
        transactionsData = Array.isArray(transactionsResponse.data?.data) 
          ? transactionsResponse.data.data 
          : Array.isArray(transactionsResponse.data) 
            ? transactionsResponse.data 
            : Array.isArray(transactionsResponse) 
              ? transactionsResponse 
              : []

      } catch (error) {
        console.error("Failed to fetch transactions:", error)
        transactionsData = []
      }
      
      try {
        const customersResponse = await customersAPI.getAll()
        customersData = Array.isArray(customersResponse.data?.data) 
          ? customersResponse.data.data 
          : Array.isArray(customersResponse.data) 
            ? customersResponse.data 
            : Array.isArray(customersResponse) 
              ? customersResponse 
              : []

      } catch (error) {
        console.error("Failed to fetch customers:", error)
        customersData = []
      }
      
      try {
        const productsResponse = await productsAPI.getAll()
        // The products API returns data directly, not in a data property
        const allProducts = productsResponse.data || productsResponse || []
        productsData = allProducts.filter(
          (product: Product) => product.category === "cylinder"
        )
      } catch (error) {
        console.error("Failed to fetch products:", error)
        // Products API might not exist yet, so we'll continue without products
      }
      
      setTransactions(transactionsData)
      setCustomers(customersData)
      setProducts(productsData)
    } catch (error) {
      console.error("Failed to fetch data:", error)
      setTransactions([])
      setCustomers([])
      setProducts([])
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
        customer: formData.customerId, // This will be sent as 'customer' to match API expectation
        product: formData.productId,
        cylinderSize: formData.cylinderSize,
        quantity: Number(formData.quantity) || 0,
        amount: Number(formData.amount) || 0,
        depositAmount: formData.type === 'deposit' ? Number(formData.depositAmount) : 0,
        refillAmount: formData.type === 'refill' ? Number(formData.amount) : 0,
        returnAmount: formData.type === 'return' ? Number(formData.amount) : 0,
        paymentMethod: formData.paymentMethod,
        cashAmount: formData.paymentMethod === 'cash' ? Number(formData.cashAmount) : 0,
        bankName: formData.paymentMethod === 'cheque' ? formData.bankName : undefined,
        checkNumber: formData.paymentMethod === 'cheque' ? formData.checkNumber : undefined,
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
      productId: "",
      productName: "", // Added missing productName field
      cylinderSize: "",
      quantity: "" as any, // Clear to show placeholder
      amount: "" as any, // Clear to show placeholder
      depositAmount: "" as any,
      refillAmount: "" as any,
      returnAmount: "" as any,
      paymentMethod: "cash" as "cash" | "cheque",
      cashAmount: "" as any,
      bankName: "",
      checkNumber: "",
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
      productId: (transaction as any).productId || "",
      productName: (transaction as any).productName || "",
      cylinderSize: transaction.cylinderSize,
      quantity: transaction.quantity,
      amount: transaction.amount,
      depositAmount: transaction.depositAmount || 0,
      refillAmount: transaction.refillAmount || 0,
      returnAmount: transaction.returnAmount || 0,
      paymentMethod: (transaction as any).paymentMethod || "cash",
      cashAmount: (transaction as any).cashAmount || 0,
      bankName: (transaction as any).bankName || "",
      checkNumber: (transaction as any).checkNumber || "",
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
        totalAmount: transaction.amount * transaction.quantity,
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
        totalAmount: pendingTransaction.amount * pendingTransaction.quantity,
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

  // Stock validation function
  const validateStock = (productId: string, requestedQuantity: number) => {
    const selectedProduct = products.find(p => p._id === productId)
    if (!selectedProduct) {
      setStockValidationMessage("Product not found")
      setShowStockValidationPopup(true)
      return false
    }

    if (requestedQuantity > selectedProduct.currentStock) {
      setStockValidationMessage(
        `Insufficient stock! Available: ${selectedProduct.currentStock}, Requested: ${requestedQuantity}`
      )
      setShowStockValidationPopup(true)
      return false
    }

    return true
  }

  // Auto-status logic based on Amount and Deposit Amount
  const updateStatusBasedOnAmounts = (amount: number, depositAmount: number) => {
    if (formData.type === "deposit" && depositAmount > 0) {
      if (depositAmount >= amount) {
        setFormData(prev => ({ ...prev, status: "cleared" }))
      } else {
        setFormData(prev => ({ ...prev, status: "pending" }))
      }
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

  const filteredTransactions = Array.isArray(transactions) ? transactions.filter((transaction) => {
    const matchesSearch =
      transaction.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.cylinderSize?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || transaction.status === statusFilter
    const matchesTab = activeTab === "all" || transaction.type === activeTab
    return matchesSearch && matchesStatus && matchesTab
  }) : []

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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby="dialog-description">
            <DialogHeader>
              <DialogTitle>{editingTransaction ? "Edit Transaction" : "Create New Transaction"}</DialogTitle>
              <div id="dialog-description" className="sr-only">
                {editingTransaction ? "Edit an existing cylinder transaction" : "Create a new cylinder transaction with customer, type, and payment details"}
              </div>
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

              <div className="space-y-2">
                <Label htmlFor="product">Product *</Label>
                <Select
                  value={formData.productId}
                  onValueChange={(value) => {
                    const selectedProduct = products.find(p => p._id === value)
                    setFormData({ 
                      ...formData, 
                      productId: value,
                      productName: selectedProduct ? selectedProduct.name : ""
                    })
                  }}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select cylinder product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product._id} value={product._id}>
                        {product.name} ({product.cylinderType})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                    onChange={(e) => {
                      const newQuantity = Number.parseInt(e.target.value) || 1
                      
                      // Validate stock if product is selected
                      if (formData.productId && newQuantity > 0) {
                        if (validateStock(formData.productId, newQuantity)) {
                          setFormData({ ...formData, quantity: newQuantity })
                        }
                      } else {
                        setFormData({ ...formData, quantity: newQuantity })
                      }
                    }}
                    required
                  />
                </div>

                {formData.type !== 'refill' && (
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount *</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.amount}
                      onChange={(e) => {
                        const newAmount = Number.parseFloat(e.target.value) || 0
                        setFormData({ ...formData, amount: newAmount })
                        
                        // Auto-update status based on amount and deposit amount
                        if (formData.type === "deposit" && formData.depositAmount > 0) {
                          updateStatusBasedOnAmounts(newAmount, formData.depositAmount)
                        }
                      }}
                      required
                    />
                  </div>
                )}
              </div>

              {/* Payment Method, Status, and Notes Section */}
              {formData.type !== 'refill' && (
                <div className="space-y-4">
                  {/* Payment Method */}
                  <div className="space-y-2">
                    <Label htmlFor="paymentMethod">Security Type</Label>
                    <Select
                      value={formData.paymentMethod}
                      onValueChange={(value: 'cash' | 'cheque') =>
                        setFormData({ ...formData, paymentMethod: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.paymentMethod === 'cash' && (
                    <div className="space-y-2">
                      <Label htmlFor="cashAmount">Security Cash</Label>
                      <Input
                        id="cashAmount"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.cashAmount}
                        onChange={(e) =>
                          setFormData({ ...formData, cashAmount: Number.parseFloat(e.target.value) || 0 })
                        }
                        placeholder="Enter cash amount"
                      />
                    </div>
                  )}

                  {formData.paymentMethod === 'cheque' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="bankName">Bank Name</Label>
                        <Input
                          id="bankName"
                          type="text"
                          value={formData.bankName}
                          onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                          placeholder="Enter bank name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="checkNumber">Check Number</Label>
                        <Input
                          id="checkNumber"
                          type="text"
                          value={formData.checkNumber}
                          onChange={(e) => setFormData({ ...formData, checkNumber: e.target.value })}
                          placeholder="Enter check number"
                        />
                      </div>
                    </div>
                  )}

                  {/* Status */}
                  {(formData.type === 'deposit' || formData.type === 'return') && (
                    <div className="space-y-2">
                      <Label htmlFor="depositAmount">Deposit Amount</Label>
                      <Input
                        id="depositAmount"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.depositAmount}
                        onChange={(e) => setFormData({ ...formData, depositAmount: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: 'pending' | 'cleared' | 'overdue') =>
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
                </div>
              )}

              {/* Notes Section - always visible */}
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

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-[#2B3068] hover:bg-[#1a1f4a] text-white">
                  {editingTransaction ? 'Update Transaction' : 'Create Transaction'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Stock Validation Popup */}
        {showStockValidationPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowStockValidationPopup(false)} />
            <div className="relative bg-white rounded-2xl shadow-2xl p-8 mx-4 max-w-md w-full transform transition-all duration-300 scale-100 animate-in fade-in-0 zoom-in-95">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-red-500 to-red-600 rounded-full">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Stock Validation Error</h3>
                <p className="text-gray-600 mb-6">{stockValidationMessage}</p>
                <button
                  onClick={() => setShowStockValidationPopup(false)}
                  className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-red-600 hover:to-red-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Got It
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

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
                    <TableRow>
                      {renderTableHeaders()}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.length > 0 ? (
                      filteredTransactions.map((transaction) => (
                        <TableRow key={transaction._id} className="hover:bg-gray-50">
                          {renderTableCells(transaction)}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={getVisibleColumns().length} className="h-24 text-center text-lg text-gray-500">
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

      {/* Receipt Dialog */}
      {receiptDialogData && (
        <ReceiptDialog
          sale={receiptDialogData}
          onClose={() => setReceiptDialogData(null)}
        />
      )}

      {/* Signature Dialog */}
      {showSignatureDialog && (
        <SignatureDialog
          isOpen={showSignatureDialog}
          onClose={handleSignatureCancel}
          onSignatureComplete={handleSignatureComplete}
        />
      )}
    </div>
  );
}
