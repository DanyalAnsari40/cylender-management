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
import { Plus, Edit, Trash2, Receipt, Search, Filter } from "lucide-react"
import { salesAPI, customersAPI, productsAPI, employeeSalesAPI } from "@/lib/api"
import { ReceiptDialog } from "@/components/receipt-dialog"
import { SignatureDialog } from "@/components/signature-dialog"
import { CustomerDropdown } from "@/components/ui/customer-dropdown"
import { ProductDropdown } from "@/components/ui/product-dropdown"

interface Sale {
  _id: string
  invoiceNumber: string
  customer: {
    _id: string
    name: string
    phone: string
    address: string
  }
  items: Array<{
    product: {
      _id: string
      name: string
      price: number
    }
    quantity: number
    price: number
    total: number
  }>
  totalAmount: number
  paymentMethod: string
  paymentStatus: string
  receivedAmount?: number
  notes?: string
  customerSignature?: string
  employee?: {
    _id: string
    name: string
    email: string
  }
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

export function GasSales() {
  const [sales, setSales] = useState<Sale[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [priceAlert, setPriceAlert] = useState<{ message: string; index: number | null }>({ message: '', index: null });
  
  // Stock insufficient popup state
  const [showStockInsufficientPopup, setShowStockInsufficientPopup] = useState(false)
  const [stockErrorMessage, setStockErrorMessage] = useState("")
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingSale, setEditingSale] = useState<Sale | null>(null)
  const [receiptSale, setReceiptSale] = useState<Sale | null>(null)
  const [showSignatureDialog, setShowSignatureDialog] = useState(false)
  const [pendingSale, setPendingSale] = useState<Sale | null>(null)
  const [customerSignature, setCustomerSignature] = useState<string>("") 
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  
  // Customer autocomplete functionality for form
  const [customerSearchTerm, setCustomerSearchTerm] = useState("")
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false)
  const [filteredCustomerSuggestions, setFilteredCustomerSuggestions] = useState<Customer[]>([])
  
  // Search filter autocomplete functionality
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false)
  const [filteredSearchSuggestions, setFilteredSearchSuggestions] = useState<Customer[]>([])

  // Form state
  const [formData, setFormData] = useState({
    customerId: "",
    category: "gas", // New category field
    items: [{ productId: "", quantity: "", price: "" }], // Added price field
    paymentMethod: "cash",
    paymentStatus: "cleared",
    receivedAmount: "",
    notes: "",
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [salesResponse, employeeSalesResponse, customersResponse, productsResponse] = await Promise.all([
        salesAPI.getAll(),
        employeeSalesAPI.getAll(),
        customersAPI.getAll(),
        productsAPI.getAll(),
      ])

      // Ensure we're setting arrays - handle nested data structure for all APIs
      const adminSalesData = Array.isArray(salesResponse.data?.data) ? salesResponse.data.data : 
                           Array.isArray(salesResponse.data) ? salesResponse.data : []

      const employeeSalesData = Array.isArray(employeeSalesResponse.data) ? employeeSalesResponse.data : []

      const combinedSales = [...adminSalesData, ...employeeSalesData].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )

      const salesData = combinedSales
      
      const customersData = Array.isArray(customersResponse.data?.data) 
        ? customersResponse.data.data 
        : Array.isArray(customersResponse.data) 
          ? customersResponse.data 
          : Array.isArray(customersResponse) 
            ? customersResponse 
            : []
            
      const productsData = Array.isArray(productsResponse.data?.data) 
        ? productsResponse.data.data 
        : Array.isArray(productsResponse.data) 
          ? productsResponse.data 
          : Array.isArray(productsResponse) 
            ? productsResponse 
            : []
      
      console.log('GasSales - Processed customers data:', customersData)
      console.log('GasSales - Processed products data:', productsData)
      console.log('GasSales - Processed sales data:', salesData)
      
      setSales(salesData)
      setCustomers(customersData)
      setAllProducts(productsData)
      
      // Filter products based on selected category
      const filteredProducts = productsData.filter((product: Product) => product.category === formData.category)
      console.log('GasSales - Filtering products for category:', formData.category)
      console.log('GasSales - Filtered products:', filteredProducts)
      setProducts(filteredProducts)
    } catch (error) {
      console.error("Failed to fetch data:", error)
      // Type guard to check if error is an axios error
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as any
        console.error("Error details:", axiosError.response?.data)
        console.error("Error status:", axiosError.response?.status)
      }
      setSales([])
      setCustomers([])
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      console.log('GasSales - Form submission attempt')
      console.log('GasSales - formData.customerId:', formData.customerId)
      console.log('GasSales - customers array:', customers)
      console.log('GasSales - customers length:', customers.length)
      
      const selectedCustomer = (customers || []).find((c) => c._id === formData.customerId)
      console.log('GasSales - selectedCustomer:', selectedCustomer)
      
      if (!selectedCustomer) {
        console.log('GasSales - No customer found, showing alert')
        alert("Please select a customer")
        return
      }

      const saleItems = formData.items
        .filter((item) => {
          const quantity = Number(item.quantity) || 0
          return item.productId && quantity > 0
        })
        .map((item) => {
          const product = (products || []).find((p) => p._id === item.productId)
          const quantity = Number(item.quantity) || 1
          // Use costPrice from product instead of manual price input
          const price = Number(product?.costPrice) || 0
          return {
            product: item.productId,
            quantity: quantity,
            price: price,
            total: price * quantity,
          }
        })

      if (saleItems.length === 0) {
        alert("Please add at least one item")
        return
      }

      const totalAmount = saleItems.reduce((sum, item) => sum + item.total, 0)

      const saleData = {
        customer: formData.customerId,
        items: saleItems,
        totalAmount,
        paymentMethod: formData.paymentMethod,
        paymentStatus: formData.paymentStatus,
        receivedAmount: parseFloat(formData.receivedAmount) || 0,
        notes: formData.notes,
      }

      console.log('GasSales - Submitting sale data:', saleData)
      console.log('GasSales - Sale items:', saleItems)
      console.log('GasSales - Form data items:', formData.items)

      if (editingSale) {
        console.log('GasSales - Updating existing sale:', editingSale._id)
        await salesAPI.update(editingSale._id, saleData)
      } else {
        console.log('GasSales - Creating new sale')
        await salesAPI.create(saleData)
      }

      await fetchData()
      resetForm()
      setIsDialogOpen(false)
    } catch (error: any) {
      console.error("Failed to save sale:", error)
      const errorMessage = error.response?.data?.error || "Failed to save sale"
      
      // Check if it's a stock insufficient error
      if (errorMessage.toLowerCase().includes('insufficient stock') || errorMessage.toLowerCase().includes('available:')) {
        setStockErrorMessage(errorMessage)
        setShowStockInsufficientPopup(true)
      } else {
        // For other errors, still use alert for now
        alert(errorMessage)
      }
    }
  }

  const resetForm = () => {
    setFormData({
      customerId: "",
      category: "gas",
      items: [{ productId: "", quantity: "", price: "" }],
      paymentMethod: "cash",
      paymentStatus: "cleared",
      receivedAmount: "",
      notes: "",
    })
    setCustomerSearchTerm("")
    setShowCustomerSuggestions(false)
    setFilteredCustomerSuggestions([])
    setEditingSale(null)
  }

  const handleEdit = (sale: Sale) => {
    setEditingSale(sale)
    setFormData({
      customerId: sale.customer?._id || "",
      category: "gas", // Default to gas for existing sales
      items: (sale.items || []).map((item) => ({
        productId: item.product?._id || "",
        quantity: item.quantity.toString(),
        price: item.price?.toString() || "",
      })),
      paymentMethod: sale.paymentMethod || "cash",
      paymentStatus: sale.paymentStatus || "cleared",
      receivedAmount: (sale as any).receivedAmount?.toString() || "",
      notes: sale.notes || "",
    })
    setCustomerSearchTerm(sale.customer?.name || "")
    setShowCustomerSuggestions(false)
    setFilteredCustomerSuggestions([])
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this sale?")) {
      try {
        await salesAPI.delete(id)
        await fetchData()
      } catch (error) {
        console.error("Failed to delete sale:", error)
        alert("Failed to delete sale")
      }
    }
  }

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { productId: "", quantity: "", price: "" }],
    })
  }

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    })
  }

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];

    // If productId is changed, handle the update atomically
    if (field === 'productId') {
      const product = products.find((p: Product) => p._id === value);
      newItems[index] = {
        ...newItems[index],
        productId: value,
        quantity: '1', // Reset quantity to a string '1'
        price: product ? product.leastPrice.toString() : '', // Set price
      };
    } else {
      // For other fields, update as usual
      newItems[index] = {
        ...newItems[index],
        [field]: value, // Value from input is already a string
      };
    }

    setFormData({ ...formData, items: newItems });
  };

  // Handle receipt button click - show signature dialog only if no signature exists
  const handleReceiptClick = (sale: Sale) => {
    if (!customerSignature) {
      // No signature yet - show signature dialog first
      setPendingSale(sale)
      setShowSignatureDialog(true)
    } else {
      // Signature already exists - show receipt directly with existing signature
      setReceiptSale(sale)
    }
  }

  // Handle signature completion - show receipt with signature
  const handleSignatureComplete = (signature: string) => {
    console.log('GasSales - Signature received:', signature)
    console.log('GasSales - Signature length:', signature?.length)
    console.log('GasSales - Pending sale:', pendingSale?.invoiceNumber)
    
    // Set signature state for future use
    setCustomerSignature(signature)
    setShowSignatureDialog(false)
    
    // Directly open receipt dialog with the pending sale and signature embedded
    if (pendingSale) {
      console.log('GasSales - Opening receipt dialog with signature embedded in sale')
      setReceiptSale({ ...pendingSale, customerSignature: signature })
      setPendingSale(null)
    }
  }

  // Handle signature dialog close without signature
  const handleSignatureCancel = () => {
    setShowSignatureDialog(false)
    setPendingSale(null)
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

  // Ensure sales is always an array with proper type checking
  const salesArray = Array.isArray(sales) ? sales : []
  
  const filteredSales = salesArray.filter((sale) => {
    // Add null checks for sale properties
    if (!sale || !sale.invoiceNumber || !sale.customer) {
      return false
    }
    
    const matchesSearch =
      sale.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sale.customer.name && sale.customer.name.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesStatus = statusFilter === "all" || sale.paymentStatus === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalAmount = formData.items.reduce((sum, item) => {
    const quantity = Number(item.quantity) || 0
    const price = Number(item.price) || 0
    return sum + price * quantity
  }, 0)

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
        <h1 className="text-4xl font-bold mb-2">Gas Sales Management</h1>
        <p className="text-white/80 text-lg">Create and manage gas sales transactions</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search by invoice or customer..."
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
              <SelectItem value="cleared">Cleared</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="bg-[#2B3068] hover:bg-[#1a1f4a] text-white w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              New Sale
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingSale ? "Edit Sale" : "Create New Sale"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => {
                      console.log('Category changed to:', value)
                      console.log('All products:', allProducts)
                      setFormData({ ...formData, category: value })
                      // Filter products based on selected category
                      const filteredProducts = allProducts.filter((product: Product) => product.category === value)
                      console.log('Filtered products for category', value, ':', filteredProducts)
                      setProducts(filteredProducts)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gas">Gas</SelectItem>
                      <SelectItem value="cylinder">Cylinder</SelectItem>
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
                
                {editingSale && (
                  <div className="space-y-2">
                    <Label htmlFor="paymentMethod">Payment Method</Label>
                    <Select
                      value={formData.paymentMethod}
                      onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="credit">Credit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-lg font-semibold">Items</Label>
                  <Button type="button" onClick={addItem} variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Item
                  </Button>
                </div>

                <div className="space-y-3">
                  {formData.items.map((item, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 border rounded-lg">
                      <div className="space-y-2">
                        <Label>Product</Label>
                        <ProductDropdown
                          selectedProductId={item.productId}
                          onSelect={(productId) => {
                            console.log('Product selected:', productId)
                            const product = products.find((p: Product) => p._id === productId)
                            console.log('Found product:', product)
                            
                            // Update both productId and price in a single atomic operation
                            const updatedItems = [...formData.items]
                            updatedItems[index] = {
                              ...updatedItems[index],
                              productId: productId,
                              price: product ? product.leastPrice.toString() : updatedItems[index].price
                            }
                            
                            console.log('Atomic update - item before:', formData.items[index])
                            console.log('Atomic update - item after:', updatedItems[index])
                            
                            setFormData({ ...formData, items: updatedItems })
                            
                            if (product) {
                              console.log('Auto-filled price:', product.leastPrice)
                            }
                          }}
                          categoryFilter={formData.category}
                          placeholder={`Select ${formData.category} product`}
                          products={products}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => {
                            const enteredQuantity = parseInt(e.target.value) || 0
                            const product = products.find((p: Product) => p._id === item.productId)
                            
                            // Check stock availability in real-time
                            if (product && enteredQuantity > product.currentStock) {
                              setStockErrorMessage(`Insufficient stock for ${product.name}. Available: ${product.currentStock}, Required: ${enteredQuantity}`)
                              setShowStockInsufficientPopup(true)
                              
                              // Auto-hide popup after 2 seconds
                              setTimeout(() => {
                                setShowStockInsufficientPopup(false)
                              }, 2000)
                              
                              return // Don't update the quantity if stock is insufficient
                            }
                            
                            updateItem(index, "quantity", e.target.value)
                          }}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Price (AED) - Editable</Label>
                        <div className="relative">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.price}
                            onChange={(e) => {
                              const product = products.find((p: Product) => p._id === item.productId);
                              const enteredPrice = parseFloat(e.target.value);
                              if (product && enteredPrice < product.leastPrice) {
                                setPriceAlert({ message: `Price must be at least ${product.leastPrice.toFixed(2)}`, index });
                                setTimeout(() => setPriceAlert({ message: '', index: null }), 2000);
                              }
                              updateItem(index, 'price', e.target.value);
                            }}
                            placeholder={(() => {
                              const product = products.find((p: Product) => p._id === item.productId);
                              return product?.leastPrice ? `Min: AED ${product.leastPrice.toFixed(2)}` : 'Select product first';
                            })()}
                            className="w-full h-10 sm:h-11 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded-md shadow-sm"
                          />
                          {priceAlert.index === index && priceAlert.message && (
                            <div className="absolute top-full mt-1 text-xs text-red-500 bg-white dark:bg-gray-800 p-1 rounded shadow-lg z-10">
                              {priceAlert.message}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Total (AED)</Label>
                        <div className="flex items-center gap-2">
                          <Input value={(() => {
                            const price = parseFloat(item.price) || 0
                            const quantity = Number(item.quantity) || 0
                            return `AED ${(price * quantity).toFixed(2)}`
                          })()} disabled />
                          {formData.items.length > 1 && (
                            <Button
                              type="button"
                              onClick={() => removeItem(index)}
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="text-right">
                  <div className="text-2xl font-bold text-[#2B3068]">Total: AED {totalAmount.toFixed(2)}</div>
                </div>
              </div>

              {/* Received Amount Section */}
              <div className="space-y-2">
                <Label htmlFor="receivedAmount">Received Amount (AED) *</Label>
                <Input
                  id="receivedAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.receivedAmount}
                  onChange={(e) => {
                    const receivedAmount = e.target.value
                    const receivedValue = parseFloat(receivedAmount) || 0
                    
                    // Auto-select status based on received amount vs total amount
                    let newPaymentStatus = formData.paymentStatus
                    if (receivedValue === totalAmount && totalAmount > 0) {
                      newPaymentStatus = "cleared"
                    } else if (receivedValue > 0 && receivedValue < totalAmount) {
                      newPaymentStatus = "pending"
                    } else if (receivedValue === 0) {
                      newPaymentStatus = "pending"
                    }
                    
                    setFormData({ 
                      ...formData, 
                      receivedAmount: receivedAmount,
                      paymentStatus: newPaymentStatus
                    })
                  }}
                  placeholder="Enter received amount..."
                  className="text-lg"
                />
                {formData.receivedAmount && (
                  <div className="text-sm text-gray-600">
                    {(() => {
                      const receivedValue = parseFloat(formData.receivedAmount) || 0
                      const remaining = totalAmount - receivedValue
                      if (remaining > 0) {
                        return `Remaining: AED ${remaining.toFixed(2)}`
                      } else if (remaining < 0) {
                        return `Excess: AED ${Math.abs(remaining).toFixed(2)}`
                      } else {
                        return "✓ Fully paid"
                      }
                    })()} 
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="paymentStatus">Payment Status</Label>
                  <Select
                    value={formData.paymentStatus}
                    onValueChange={(value) => setFormData({ ...formData, paymentStatus: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cleared">Cleared</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
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
                <Button type="submit" className="bg-[#2B3068] hover:bg-[#1a1f4a]">
                  {editingSale ? "Update Sale" : "Create Sale"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-[#2B3068] to-[#1a1f4a] text-white rounded-t-lg">
          <CardTitle>Sales History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="p-4">Invoice #</TableHead>
                  <TableHead className="p-4">Customer</TableHead>
                  <TableHead className="p-4">Items</TableHead>
                  <TableHead className="p-4">Total (AED)</TableHead>
                  <TableHead className="p-4">Received Amount (AED)</TableHead>
                  <TableHead className="p-4">Payment</TableHead>
                  <TableHead className="p-4">Status</TableHead>
                  <TableHead className="p-4">Added By</TableHead>
                  <TableHead className="p-4">Date</TableHead>
                  <TableHead className="p-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.map((sale) => (
                  <TableRow key={sale._id}>
                    <TableCell className="p-4 font-medium">{sale.invoiceNumber}</TableCell>
                    <TableCell className="p-4">
                      <div>
                        <div className="font-medium">{sale.customer?.name || "Unknown Customer"}</div>
                        <div className="text-sm text-gray-500">{sale.customer?.phone}</div>
                      </div>
                    </TableCell>
                    <TableCell className="p-4">
                      <div className="space-y-1">
                        {sale.items.map((item, index) => (
                          <div key={index} className="text-sm">
                            {item.product?.name || "Unknown Product"} x{item.quantity}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="p-4 font-semibold">AED {sale.totalAmount.toFixed(2)}</TableCell>
                    <TableCell className="p-4 font-semibold">AED {(sale.receivedAmount || 0).toFixed(2)}</TableCell>
                    <TableCell className="p-4 capitalize">{sale.paymentMethod}</TableCell>
                    <TableCell className="p-4">
                      <Badge
                        variant={
                          sale.paymentStatus === "cleared"
                            ? "default"
                            : sale.paymentStatus === "pending"
                              ? "secondary"
                              : "destructive"
                        }
                        className={
                          sale.paymentStatus === "cleared"
                            ? "bg-green-100 text-green-800"
                            : sale.paymentStatus === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                        }
                      >
                        {sale.paymentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="p-4">
                      {sale.employee ? (
                        <Badge variant="default">{sale.employee.name}</Badge>
                      ) : (
                        <Badge variant="secondary">Admin</Badge>
                      )}
                    </TableCell>
                    <TableCell className="p-4">{new Date(sale.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="p-4">
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReceiptClick(sale)}
                          className="text-[#2B3068] border-[#2B3068] hover:bg-[#2B3068] hover:text-white"
                        >
                          <Receipt className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleEdit(sale)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(sale._id)}
                          className="text-red-600 border-red-600 hover:bg-red-600 hover:text-white"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredSales.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      No sales found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Signature Dialog */}
      <SignatureDialog 
        isOpen={showSignatureDialog}
        onClose={handleSignatureCancel}
        onSignatureComplete={handleSignatureComplete}
        customerName={pendingSale?.customer?.name}
      />

      {/* Receipt Dialog with signature */}
      {receiptSale && (
        <ReceiptDialog 
          sale={receiptSale} 
          signature={customerSignature}
          onClose={() => {
            setReceiptSale(null)
            // Don't clear signature - keep it for reuse
          }} 
        />
      )}



      {/* Modern Stock Insufficient Popup */}
      {showStockInsufficientPopup && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          {/* Background blur overlay */}
          <div 
            className="absolute inset-0 bg-black/20 backdrop-blur-sm" 
            onClick={() => setShowStockInsufficientPopup(false)}
          />
          
          {/* Modal with animations */}
          <div className="relative bg-white rounded-2xl shadow-2xl p-8 mx-4 max-w-md w-full transform transition-all duration-300 scale-100 animate-in fade-in-0 zoom-in-95">
            {/* Close button */}
            <button
              onClick={() => setShowStockInsufficientPopup(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            {/* Icon */}
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-orange-500 to-red-500 rounded-full">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            
            {/* Content */}
            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Insufficient Stock</h3>
              <p className="text-gray-600 mb-6">{stockErrorMessage}</p>
              
              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    console.log('Cancel button clicked')
                    setShowStockInsufficientPopup(false)
                  }}
                  className="flex-1 bg-gray-100 text-gray-700 font-semibold py-3 px-6 rounded-lg hover:bg-gray-200 transition-all duration-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    console.log('Check Stock button clicked')
                    setShowStockInsufficientPopup(false)
                    // You could add logic here to navigate to inventory management
                  }}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold py-3 px-6 rounded-lg hover:from-orange-600 hover:to-red-600 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl cursor-pointer"
                >
                  Check Stock
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
