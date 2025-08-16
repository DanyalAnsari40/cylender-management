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
import { Plus, Package, DollarSign, FileText, Edit, Trash2, Receipt } from "lucide-react"
import { toast } from "sonner"
import { ReceiptDialog } from '@/components/receipt-dialog'
import { SignatureDialog } from '@/components/signature-dialog'

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

interface Supplier {
  _id: string
  companyName: string
  contactPerson?: string
  phone?: string
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

interface CylinderTransaction {
  _id: string
  type: string
  customer: Customer
  supplier?: Supplier
  product?: Product
  cylinderSize: string
  quantity: number
  amount: number
  depositAmount: number
  refillAmount: number
  returnAmount: number
  // New: align with admin form
  paymentOption?: 'debit' | 'credit' | 'delivery_note'
  paymentMethod: string
  cashAmount: number
  bankName: string
  checkNumber: string
  status: string
  notes: string
  createdAt: string
  securityAmount?: number // Added for optional use
  // Multi-items
  items?: Array<{
    productId: string
    productName?: string
    cylinderSize: string
    quantity: number
    amount: number
  }>
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
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [stockAssignments, setStockAssignments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("all")
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null)

  // Receipt and signature dialog states
  const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false)
  const [isSignatureDialogOpen, setIsSignatureDialogOpen] = useState(false)
  const [transactionForReceipt, setTransactionForReceipt] = useState<any | null>(null)
  const [transactionForSignature, setTransactionForSignature] = useState<any | null>(null)

  // Modern stock validation dialog
  const [stockAlert, setStockAlert] = useState<{
    open: boolean;
    productName?: string;
    size?: string;
    available?: number;
    requested?: number;
  }>({ open: false })

  // Admin-style popup state
  const [showStockValidationPopup, setShowStockValidationPopup] = useState(false)
  const [stockValidationMessage, setStockValidationMessage] = useState("")

  // Customer search state
  const [customerSearch, setCustomerSearch] = useState("")
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false)
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])

  // Form state
  const [formData, setFormData] = useState({
    type: "deposit",
    customer: "",
    supplier: "",
    product: "",
    cylinderSize: "small",
    quantity: 1,
    amount: 0,
    depositAmount: 0,
    refillAmount: 0,
    returnAmount: 0,
    // New: aligns with admin page behavior
    paymentOption: "debit" as "debit" | "credit" | "delivery_note",
    paymentMethod: "cash",
    cashAmount: 0,
    bankName: "",
    checkNumber: "",
    status: "pending",
    notes: "",
    securityAmount: 0, // Added for security deposit
    // Multi-items
    items: [] as Array<{
      productId: string
      productName: string
      cylinderSize: string
      quantity: number
      amount: number
    }>
  })

  // Helpers for items management (similar to admin page)
  const getProductById = (id: string) => products.find(p => p._id === id)

  const addItem = () => {
    const first = products[0]
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          productId: first?._id || "",
          productName: first?.name || "",
          cylinderSize: "small",
          quantity: 1,
          amount: Number((first?.leastPrice || 0).toFixed(2))
        }
      ]
    }))
  }

  const updateItem = (index: number, field: keyof (typeof formData.items)[number], value: any) => {
    setFormData(prev => {
      const items = [...prev.items]
      const item = { ...items[index] } as any
      item[field] = value
      if (field === 'productId') {
        const p = getProductById(value)
        item.productName = p?.name || ''
        if (p) item.amount = Number((p.leastPrice).toFixed(2))
      }
      items[index] = item
      return { ...prev, items }
    })
  }

  const removeItem = (index: number) => {
    setFormData(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }))
  }

  const totalItemsAmount = () => formData.items.reduce((s, it) => s + (Number(it.amount) || 0), 0)
  const totalItemsQuantity = () => formData.items.reduce((s, it) => s + (Number(it.quantity) || 0), 0)

  // Assigned availability helper for a specific product and size
  const getAssignedAvailableFor = (productId: string, size: string) => {
    const matches = stockAssignments.filter(sa => {
      const sameProduct = sa?.product?._id === productId
      const sameSize = sa?.cylinderSize ? sa.cylinderSize === size : true
      return sameProduct && sameSize
    })
    return matches.reduce((sum, sa) => sum + (sa.remainingQuantity || 0), 0)
  }

  useEffect(() => {
    fetchData()
  }, [user.id])

  // Enforce delivery note behavior: zero deposit and pending status for non-refill
  useEffect(() => {
    if (formData.paymentOption === 'delivery_note' && formData.type !== 'refill') {
      setFormData(prev => ({ ...prev, depositAmount: 0, status: 'pending' }))
    }
  }, [formData.paymentOption, formData.type])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [transactionsResponse, customersResponse, productsResponse, stockAssignmentsResponse, suppliersResponse] = await Promise.all([
        fetch(`/api/employee-cylinders?employeeId=${user.id}`),
        fetch("/api/customers"),
        fetch("/api/products"),
        fetch(`/api/stock-assignments?employeeId=${user.id}&status=received`),
        fetch("/api/suppliers")
      ])

      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json()
        const transactions = transactionsData.data || transactionsData
        try {
          console.log('[EmployeeCylinderSales] fetched transactions:', Array.isArray(transactions) ? transactions.length : 0)
          if (Array.isArray(transactions)) {
            const sample = transactions.slice(0, 3).map(t => ({ id: t._id, itemsLen: Array.isArray((t as any).items) ? (t as any).items.length : 0 }))
            console.log('[EmployeeCylinderSales] sample items lens:', sample)
          }
        } catch {}
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

      if (suppliersResponse.ok) {
        const suppliersData = await suppliersResponse.json()
        const suppliers = suppliersData.data || suppliersData
        setSuppliers(Array.isArray(suppliers) ? suppliers : [])
      } else {
        console.error("Failed to fetch suppliers:", suppliersResponse.status)
        setSuppliers([])
      }

      // We'll prefer assigned products from stock assignments below. Still read products to enrich objects if needed.
      let allProducts: any[] = []
      if (productsResponse.ok) {
        const productsData = await productsResponse.json()
        const products = productsData.data || productsData
        allProducts = Array.isArray(products) ? products : []
      } else {
        console.error("Failed to fetch products:", productsResponse.status)
      }

      if (stockAssignmentsResponse.ok) {
        const stockData = await stockAssignmentsResponse.json()
        const assignments = stockData.data || stockData
        const list = Array.isArray(assignments) ? assignments : []
        setStockAssignments(list)
        // Derive assigned cylinder products with remaining quantity > 0
        const assignedProductsMap = new Map<string, any>()
        list
          .filter(sa => sa?.product && sa?.product?.category === 'cylinder' && (sa.remainingQuantity || 0) > 0)
          .forEach(sa => {
            const prod = sa.product
            // Prefer enriching from allProducts if exists (to ensure latest leastPrice), fallback to sa.product
            const enriched = allProducts.find(p => p._id === prod._id) || prod
            assignedProductsMap.set(enriched._id, enriched)
          })
        setProducts(Array.from(assignedProductsMap.values()))
      } else {
        console.error("Failed to fetch stock assignments:", stockAssignmentsResponse.status)
        setStockAssignments([])
        setProducts([])
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

  // Removed standalone fetchProducts to avoid overriding assigned inventory selection

  const resetForm = () => {
    setFormData({
      type: "deposit",
      customer: "",
      supplier: "",
      product: "",
      cylinderSize: "small",
      quantity: 1,
      amount: 0,
      depositAmount: 0,
      refillAmount: 0,
      returnAmount: 0,
      paymentOption: "debit" as any,
      paymentMethod: "cash",
      cashAmount: 0,
      bankName: "",
      checkNumber: "",
      status: "pending",
      notes: "",
      securityAmount: 0, // Added for security deposit
      items: []
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
        // Clear irrelevant party fields when switching types
        if (value === 'refill') {
          newState.customer = '';
        } else {
          newState.supplier = '';
        }
      }

      // When product changes, auto-fill the amount with least price
      if (name === 'product' && newState.items.length === 0) {
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

      // When quantity changes, recalculate amounts based on selected product (single-item mode only)
      if (name === 'quantity' && newState.product && newState.items.length === 0) {
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

      // Auto-update status based on deposit amount vs total (items-aware)
      if (newState.type === 'deposit' && (name === 'depositAmount' || name === 'amount')) {
        const depositAmt = name === 'depositAmount' ? numericValue : newState.depositAmount;
        const baseTotal = newState.items.length > 0 ? totalItemsAmount() : newState.amount;
        const totalAmt = name === 'amount' && newState.items.length === 0 ? numericValue : baseTotal;
        
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
    if (formData.type === 'refill') {
      if (!formData.supplier || !formData.product || !formData.cylinderSize || formData.quantity <= 0) {
        toast.error("Please fill in all required fields")
        return
      }
    } else if (!formData.customer || (formData.items.length === 0 && (!formData.product || !formData.cylinderSize || formData.quantity <= 0))) {
      toast.error("Please fill in all required fields")
      return
    }

    // Get selected product for validation
    const selectedProduct = formData.items.length === 0 ? products.find(p => p._id === formData.product) : null
    if (formData.items.length === 0) {
      if (!selectedProduct) {
        toast.error("Please select a valid product")
        return
      }
    }

    // Validate against assigned stock
    if (formData.items.length === 0) {
      const assignedAvailable = getAssignedAvailable()
      if (assignedAvailable < formData.quantity) {
        setStockAlert({
          open: true,
          productName: selectedProduct!.name,
          size: formData.cylinderSize,
          available: assignedAvailable,
          requested: formData.quantity,
        })
        setStockValidationMessage(`You requested ${formData.quantity} unit(s) of ${selectedProduct!.name} (${formData.cylinderSize}). Only ${assignedAvailable} unit(s) are available in your assigned inventory.`)
        setShowStockValidationPopup(true)
        return
      }
    } else {
      // Multi-item validation per item
      for (const it of formData.items) {
        const available = getAssignedAvailableFor(it.productId, it.cylinderSize)
        if (available < (Number(it.quantity) || 0)) {
          setStockAlert({
            open: true,
            productName: it.productName,
            size: it.cylinderSize,
            available,
            requested: it.quantity,
          })
          setStockValidationMessage(`You requested ${it.quantity} unit(s) of ${it.productName} (${it.cylinderSize}). Only ${available} unit(s) are available in your assigned inventory.`)
          setShowStockValidationPopup(true)
          return
        }
      }
    }

    // Calculate amount based on least price and quantity
    const calculatedAmount = formData.items.length > 0 ? totalItemsAmount() : (selectedProduct ? selectedProduct.leastPrice * formData.quantity : 0)

    try {
      const transactionData: any = {
        employeeId: user.id,
        type: formData.type,
        // party is conditional below
        product: formData.items.length === 0 ? formData.product : (formData.items[0]?.productId || ''),
        cylinderSize: formData.items.length === 0 ? formData.cylinderSize : (formData.items[0]?.cylinderSize || ''),
        quantity: formData.items.length === 0 ? formData.quantity : totalItemsQuantity(),
        amount: calculatedAmount,
        depositAmount:
          formData.type === 'deposit'
            ? (formData.paymentOption === 'delivery_note' ? 0 : Number(formData.depositAmount) || 0)
            : 0,
        refillAmount: formData.type === 'refill' ? calculatedAmount : 0,
        returnAmount: formData.type === 'return' ? calculatedAmount : 0,
        status: formData.paymentOption === 'delivery_note' ? 'pending' : formData.status,
        notes: formData.notes,
        paymentOption: formData.paymentOption,
      }

      if (formData.items.length > 0) {
        transactionData.items = formData.items.map(it => ({
          productId: it.productId,
          productName: it.productName,
          cylinderSize: it.cylinderSize,
          quantity: Number(it.quantity) || 0,
          amount: Number(it.amount) || 0,
        }))
      }

      if (formData.type === 'refill') {
        transactionData.supplier = formData.supplier
      } else {
        transactionData.customer = formData.customer
      }

      if (formData.paymentOption === 'debit') {
        transactionData.paymentMethod = formData.paymentMethod
        transactionData.cashAmount = formData.paymentMethod === 'cash' ? Number(formData.cashAmount) || 0 : 0
        transactionData.bankName = formData.paymentMethod === 'cheque' ? formData.bankName : undefined
        transactionData.checkNumber = formData.paymentMethod === 'cheque' ? formData.checkNumber : undefined
      } else {
        transactionData.paymentMethod = undefined
        transactionData.cashAmount = 0
        transactionData.bankName = undefined
        transactionData.checkNumber = undefined
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
      customer: (transaction as any).customer?._id || '',
      supplier: (transaction as any).supplier?._id || '',
      product: (transaction.items && transaction.items.length > 0) ? (transaction.items[0].productId || '') : (transaction.product?._id || ''),
      cylinderSize: (transaction.items && transaction.items.length > 0) ? transaction.items[0].cylinderSize : transaction.cylinderSize,
      quantity: (transaction.items && transaction.items.length > 0) ? transaction.items[0].quantity : transaction.quantity,
      amount: transaction.amount,
      depositAmount: transaction.depositAmount || 0,
      refillAmount: transaction.refillAmount || 0,
      returnAmount: transaction.returnAmount || 0,
      paymentOption: ((transaction as any).paymentOption || 'debit') as any,
      paymentMethod: transaction.paymentMethod || 'cash',
      cashAmount: transaction.cashAmount || 0,
      bankName: transaction.bankName || '',
      checkNumber: transaction.checkNumber || '',
      status: transaction.status,
      notes: transaction.notes || '',
      securityAmount: transaction.securityAmount || 0,
      items: (transaction.items && transaction.items.length > 0) ? transaction.items.map(it => ({
        productId: (it as any).productId || '',
        productName: it.productName || '',
        cylinderSize: it.cylinderSize,
        quantity: it.quantity,
        amount: it.amount,
      })) : []
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

  // Handle view receipt - opens signature dialog first
  const handleViewReceipt = (transaction: CylinderTransaction) => {
    // Build a safe party object for receipt/signature
    const isRefill = transaction.type === 'refill'
    const party = isRefill
      ? {
          name: (transaction.supplier as any)?.companyName || 'Supplier',
          phone: (transaction.supplier as any)?.phone || 'N/A',
          address: 'N/A',
        }
      : {
          name: transaction.customer?.name || 'Customer',
          phone: transaction.customer?.phone || 'N/A',
          address: transaction.customer?.address || 'N/A',
        }

    const isMulti = Array.isArray((transaction as any).items) && (transaction as any).items.length > 0
    const transactionWithAddress = {
      ...transaction,
      invoiceNumber: `CYL-${transaction._id.slice(-6).toUpperCase()}`,
      category: "cylinder",
      items: isMulti
        ? (transaction as any).items.map((it: any) => ({
            product: { name: it.productName || it.productId?.name || (transaction as any).product?.name || 'Cylinder' },
            quantity: it.quantity,
            price: it.amount / Math.max(it.quantity, 1)
          }))
        : (transaction.product ? [{
            product: transaction.product,
            quantity: transaction.quantity,
            price: transaction.amount / Math.max(transaction.quantity, 1)
          }] : []),
      totalAmount: transaction.amount,
      receivedAmount: transaction.amount,
      customer: party,
    } as any;
    setTransactionForSignature(transactionWithAddress);
    setIsSignatureDialogOpen(true);
  };

  // Handle signature completion - opens receipt dialog
  const handleSignatureComplete = (signature: string) => {
    if (transactionForSignature) {
      const transactionWithSignature = {
        ...transactionForSignature,
        customerSignature: signature,
      };
      setTransactionForReceipt(transactionWithSignature);
      setIsSignatureDialogOpen(false);
      setIsReceiptDialogOpen(true);
    }
  };

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

  // Get assigned remaining quantity for the selected product and cylinder size
  const getAssignedAvailable = () => {
    if (!formData.product) return 0;
    const matches = stockAssignments.filter(sa => {
      const sameProduct = sa?.product?._id === formData.product;
      const sameSize = sa?.cylinderSize ? sa.cylinderSize === formData.cylinderSize : true;
      return sameProduct && sameSize;
    });
    return matches.reduce((sum, sa) => sum + (sa.remainingQuantity || 0), 0);
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
      customer: 'Customer / Supplier',
      product: 'Product',
      cylinderSize: 'Items / Cylinder Size',
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
          {transaction.type === 'refill' ? (
            <div>
              <div className="font-medium">{(transaction as any).supplier?.companyName || 'N/A'}</div>
              <div className="text-sm text-gray-500">{(transaction as any).supplier?.phone || ''}</div>
            </div>
          ) : (
            <div>
              <div className="font-medium">{transaction.customer.name}</div>
              <div className="text-sm text-gray-500">{transaction.customer.phone}</div>
            </div>
          )}
        </TableCell>
      ),
      product: () => {
        const items = (transaction as any).items as any[] | undefined
        const productName = transaction.product?.name || 'N/A'
        if (items && items.length > 0) {
          const tooltip = items
            .map((it: any) => `${it.productName || it.productId?.name || 'Item'} x${it.quantity} - AED ${Number(it.amount||0).toFixed(2)}`)
            .join('\n')
          return (
            <TableCell className="p-4">
              <div className="font-medium" title={tooltip}>
                {`${items.length} item${items.length > 1 ? 's' : ''}`}
              </div>
            </TableCell>
          )
        }
        return (
          <TableCell className="p-4">{productName}</TableCell>
        )
      },
      cylinderSize: () => {
        const items = (transaction as any).items as any[] | undefined
        if (items && items.length > 0) {
          return (
            <TableCell className="p-4">
              <div className="text-sm space-y-1">
                {items.map((it, idx) => {
                  const fallbackName = products.find(p => p._id === (typeof it.productId === 'string' ? it.productId : it.productId?._id))?.name
                  const name = it.productName || it.productId?.name || fallbackName || 'Product'
                  const fallbackProduct = products.find(p => p._id === (typeof it.productId === 'string' ? it.productId : it.productId?._id))
                  const sizeKey = it.cylinderSize || fallbackProduct?.cylinderType
                  const size = sizeKey ? (CYLINDER_SIZE_MAPPING as any)[sizeKey] || sizeKey : '-'
                  return (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="font-medium text-gray-800">{name}</span>
                      <span className="text-gray-500">({size})</span>
                      <span className="text-gray-600">x {it.quantity}</span>
                      <span className="text-gray-700">- AED {Number(it.amount||0).toFixed(2)}</span>
                    </div>
                  )
                })}
              </div>
            </TableCell>
          )
        }
        return (
          <TableCell className="p-4">{transaction.cylinderSize}</TableCell>
        )
      },
      quantity: () => {
        const items = (transaction as any).items as any[] | undefined
        const totalQty = items && items.length > 0 ? items.reduce((s, it) => s + (Number(it.quantity) || 0), 0) : transaction.quantity
        return (
          <TableCell className="p-4">{totalQty}</TableCell>
        )
      },
      amount: () => (
        <TableCell className="p-4">AED {Number(transaction.amount || 0).toFixed(2)}</TableCell>
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
              onClick={() => handleViewReceipt(transaction)}
              className="h-8 px-2 text-xs"
            >
              <Receipt className="w-3 h-3 mr-1" />
              Receipt
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleEdit(transaction)}
              className="h-8 px-2 text-xs"
            >
              <Edit className="w-3 h-3 mr-1" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDelete(transaction._id)}
              className="h-8 px-2 text-xs text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-3 h-3 mr-1" />
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

    {/* Customer or Supplier (conditional) */}
    {formData.type !== 'refill' ? (
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
    ) : (
      <div>
        <Label htmlFor="supplier">Supplier</Label>
        <Select value={formData.supplier} onValueChange={(value) => handleSelectChange('supplier', value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select a supplier" />
          </SelectTrigger>
          <SelectContent>
            {suppliers.map((s) => (
              <SelectItem key={s._id} value={s._id}>
                {s.companyName} {s.contactPerson ? `- ${s.contactPerson}` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )}

    {/* Items Section Toggle */}
    <div className="md:col-span-2 flex items-center justify-between">
      <div className="text-sm text-gray-600">
        {formData.items.length > 0 ? `Items in this transaction: ${formData.items.length}` : 'Single item mode'}
      </div>
      <Button type="button" variant="outline" onClick={addItem} className="h-8">
        Add Item
      </Button>
    </div>

    {/* Multi-Item UI or Single-Item Fields */}
    {formData.items.length > 0 ? (
      <div className="md:col-span-2 space-y-3">
        {formData.items.map((it, idx) => (
          <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end border p-3 rounded-lg">
            <div>
              <Label>Product</Label>
              <Select value={it.productId} onValueChange={(val) => updateItem(idx, 'productId', val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map(p => (
                    <SelectItem key={p._id} value={p._id}>{p.name} - AED {p.leastPrice.toFixed(2)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Cylinder Size</Label>
              <Select value={it.cylinderSize} onValueChange={(val) => updateItem(idx, 'cylinderSize', val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small (5kg)</SelectItem>
                  <SelectItem value="large">Large (45kg)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantity</Label>
              <Input type="number" value={it.quantity} onChange={(e) => updateItem(idx, 'quantity' as any, parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <Label>Amount (AED)</Label>
              <Input type="number" value={it.amount} onChange={(e) => updateItem(idx, 'amount' as any, parseFloat(e.target.value) || 0)} />
            </div>
            <div className="flex justify-end">
              <Button type="button" variant="destructive" onClick={() => removeItem(idx)} className="h-8">
                Remove
              </Button>
            </div>
          </div>
        ))}
        <div className="flex items-center justify-between text-sm text-gray-700">
          <div>Total Quantity: <span className="font-semibold">{totalItemsQuantity()}</span></div>
          <div>Total Amount: <span className="font-semibold">AED {totalItemsAmount().toFixed(2)}</span></div>
        </div>
      </div>
    ) : (
      <>
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
          <p className="text-xs text-gray-500 mt-1">Assigned available: {getAssignedAvailable()}</p>
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

        {/* Amount - only for deposit */}
        {formData.type === 'deposit' && (
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
        )}
      </>
    )}

    {/* Received Via - for deposit and return (Payment Option hidden) */}
    {(formData.type === 'deposit' || formData.type === 'return') && (
      <div>
        <Label htmlFor="paymentMethod">Received Via</Label>
        <Select value={formData.paymentMethod} onValueChange={(value) => handleSelectChange("paymentMethod", value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select received via" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="cheque">Cheque</SelectItem>
          </SelectContent>
        </Select>
      </div>
    )}

    {/* Security Cash field (if cash) - deposit and return */}
    {(formData.type === 'deposit' || formData.type === 'return') && formData.paymentMethod === 'cash' && (
      <div>
        <Label htmlFor="cashAmount">Security Cash</Label>
        <Input id="cashAmount" name="cashAmount" type="number" value={formData.cashAmount} onChange={handleChange} />
      </div>
    )}

    {/* Cheque fields (if cheque) - deposit and return */}
    {(formData.type === 'deposit' || formData.type === 'return') && formData.paymentMethod === 'cheque' && (
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

    {/* Deposit Amount - deposit only */}
    {formData.type === 'deposit' && (
      <div>
        <Label htmlFor="depositAmount">Deposit Amount</Label>
        <Input
          id="depositAmount"
          name="depositAmount"
          type="number"
          value={formData.depositAmount}
          onChange={handleChange}
        />
      </div>
    )}

    {/* Status - deposit only */}
    {formData.type === 'deposit' && (
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

    {/* Signature Dialog */}
    {isSignatureDialogOpen && transactionForSignature && (
      <SignatureDialog
        isOpen={isSignatureDialogOpen}
        onClose={() => setIsSignatureDialogOpen(false)}
        onSignatureComplete={handleSignatureComplete}
        customerName={transactionForSignature.customer.name}
      />
    )}

    {/* Receipt Dialog */}
    {transactionForReceipt && (
      <ReceiptDialog
        onClose={() => {
          setIsReceiptDialogOpen(false);
          setTransactionForReceipt(null);
        }}
        sale={transactionForReceipt}
      />
    )}

    {/* Stock Validation Popup (Admin-style) */}
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
              className="inline-flex items-center justify-center rounded-md bg-[#2B3068] text-white px-4 py-2 text-sm font-medium hover:bg-[#1a1f4a] focus:outline-none"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )}
    </div>
  )
}
