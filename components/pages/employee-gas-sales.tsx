"use client"

import { useState, useEffect, SVGProps } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { salesAPI, customersAPI, productsAPI } from "@/lib/api"
import { ReceiptDialog } from '@/components/receipt-dialog';
import { ProductDropdown } from '@/components/ui/product-dropdown';
import { Trash2 } from 'lucide-react';

interface EmployeeGasSalesProps {
  user: {
    id: string
    name: string
    role: string
  }
}

interface Sale {
  _id: string
  invoiceNumber: string
  customer: Customer
  category: string
  items: {
    product: {
      _id: string
      name: string
      costPrice: number
    }
    quantity: number
    price: number
  }[]
  totalAmount: number
  paymentMethod: string
  paymentStatus: string
  receivedAmount?: number
  notes?: string
  customerSignature?: string
  employee: string
  createdAt: string
}

interface Customer {
  _id: string
  name: string
  phone?: string
  email?: string
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

export function EmployeeGasSales({ user }: EmployeeGasSalesProps) {
  const [sales, setSales] = useState<Sale[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingSale, setEditingSale] = useState<Sale | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null)
  const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false)
  const [saleForReceipt, setSaleForReceipt] = useState<any | null>(null);

  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  // Customer autocomplete functionality for form
  const [customerSearchTerm, setCustomerSearchTerm] = useState("")
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false)
  const [filteredCustomerSuggestions, setFilteredCustomerSuggestions] = useState<Customer[]>([])

  // Form state
  const [formData, setFormData] = useState({
    customerId: "",
    category: "gas",
    items: [{ productId: "", quantity: "", price: "" }],
    receivedAmount: "",
    paymentStatus: "cleared",
    notes: "",
  })

  // Stock and price validation states
  const [showStockInsufficientPopup, setShowStockInsufficientPopup] = useState(false)
  const [stockErrorMessage, setStockErrorMessage] = useState("")
  const [showPriceValidationPopup, setShowPriceValidationPopup] = useState(false)
  const [validationMessage, setValidationMessage] = useState("")

  useEffect(() => {
    fetchData()
  }, [user.id])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [salesResponse, customersResponse, stockAssignmentsResponse] = await Promise.all([
        fetch(`/api/employee-sales?employeeId=${user.id}`),
        customersAPI.getAll(),
        fetch(`/api/stock-assignments?employeeId=${user.id}&status=received`),
      ])
      
      const salesData = await salesResponse.json()
      console.log('Employee sales response:', salesData)
      
      // Ensure sales data is always an array
      const salesArray = Array.isArray(salesData?.data) 
        ? salesData.data 
        : Array.isArray(salesData) 
          ? salesData 
          : []
      
      let customersData = Array.isArray(customersResponse.data?.data) 
        ? customersResponse.data.data 
        : Array.isArray(customersResponse.data) 
          ? customersResponse.data 
          : Array.isArray(customersResponse) 
            ? customersResponse 
            : []
      
      // Fetch employee's assigned products from stock assignments
      const stockAssignmentsData = await stockAssignmentsResponse.json()
      console.log('Employee stock assignments:', stockAssignmentsData)
      
      // Extract products from stock assignments with remaining quantities
      const employeeProducts: Product[] = []
      const allEmployeeProducts: Product[] = []
      
      if (stockAssignmentsData?.data && Array.isArray(stockAssignmentsData.data)) {
        stockAssignmentsData.data.forEach((assignment: any) => {
          if (assignment.product && assignment.remainingQuantity > 0) {
            const productWithStock = {
              ...assignment.product,
              currentStock: assignment.remainingQuantity // Use remaining quantity as current stock
            }
            allEmployeeProducts.push(productWithStock)
            
            // Add to category-specific products if it matches
            if (assignment.product.category === "gas") {
              employeeProducts.push(productWithStock)
            }
          }
        })
      }
      
      setCustomers(customersData)
      setAllProducts(allEmployeeProducts)
      setProducts(employeeProducts)
      setSales(salesArray)
    } catch (error) {
      console.error("Failed to fetch data:", error)
      setSales([])
      setCustomers([])
      setProducts([])
      setAllProducts([])
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      customerId: "",
      category: "gas",
      items: [{ productId: "", quantity: "", price: "" }],
      receivedAmount: "",
      paymentStatus: "cleared",
      notes: "",
    })
    setCustomerSearchTerm("")
    setEditingSale(null)
  }

  const getPaymentStatusBadge = (status: string) => {
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

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    const numericValue = parseFloat(value) || 0
    
    let newFormData = { ...formData, [name]: value }
    
    // Auto-select status based on received amount vs total amount
    if (name === "receivedAmount") {
      const totalAmount = calculateTotalAmount()
      if (numericValue === totalAmount && totalAmount > 0) {
        newFormData.paymentStatus = "cleared"
      } else if (numericValue > 0 && numericValue < totalAmount) {
        newFormData.paymentStatus = "pending"
      } else if (numericValue === 0) {
        newFormData.paymentStatus = "pending"
      }
    }
    
    setFormData(newFormData)
  }

  // Calculate total amount from items
  const calculateTotalAmount = () => {
    return formData.items.reduce((sum, item) => {
      const quantity = Number(item.quantity) || 0
      const price = Number(item.price) || 0
      return sum + price * quantity
    }, 0)
  }

  const handleCustomerSearchChange = (value: string) => {
    setCustomerSearchTerm(value)
    if (value) {
      const filtered = customers.filter(
        (customer) =>
          customer.name.toLowerCase().includes(value.toLowerCase()) ||
          (customer.phone && customer.phone.includes(value)) ||
          (customer.email && customer.email.toLowerCase().includes(value.toLowerCase()))
      )
      setFilteredCustomerSuggestions(filtered)
      setShowCustomerSuggestions(true)
    } else {
      setShowCustomerSuggestions(false)
    }
  }

  const handleCustomerSelect = (customer: Customer) => {
    setFormData({ ...formData, customerId: customer._id })
    setCustomerSearchTerm(customer.name)
    setShowCustomerSuggestions(false)
    setFilteredCustomerSuggestions([])
  }

  // Item management functions
  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { productId: "", quantity: "", price: "" }]
    })
  }

  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
      const newItems = formData.items.filter((_, i) => i !== index)
      setFormData({ ...formData, items: newItems })
    }
  }

  const updateItem = (index: number, field: string, value: string) => {
    const newItems = [...formData.items]
    newItems[index] = { ...newItems[index], [field]: value }
    setFormData({ ...formData, items: newItems })
  }



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.customerId) {
      alert("Please select a customer")
      return
    }
    
    // Validate items
    const hasValidItems = formData.items.some(item => 
      item.productId && item.quantity && parseFloat(item.quantity) > 0 && item.price && parseFloat(item.price) > 0
    )
    
    if (!hasValidItems) {
      alert("Please add at least one valid item with product, quantity, and price")
      return
    }

    const totalAmount = calculateTotalAmount()
    if (totalAmount <= 0) {
      alert("Total amount must be greater than 0")
      return
    }

    try {
      const saleData = {
        ...formData,
        employee: user.id,
        customer: formData.customerId,
        totalAmount: totalAmount,
        receivedAmount: parseFloat(formData.receivedAmount) || 0,
      }

      if (editingSale) {
        await salesAPI.update(editingSale._id, saleData)
      } else {
        await salesAPI.create(saleData)
      }

      fetchData()
      setIsDialogOpen(false)
      resetForm()
    } catch (error) {
      console.error("Failed to save sale:", error)
      alert("Failed to save sale. Please try again.")
    }
  }

  const handleEdit = (sale: Sale) => {
    setEditingSale(sale)
    
    // Convert sale items to form format
    const formItems = sale.items && sale.items.length > 0 
      ? sale.items.map(item => ({
          productId: item.product._id,
          quantity: item.quantity.toString(),
          price: item.price.toString()
        }))
      : [{ productId: "", quantity: "", price: "" }]
    
    setFormData({
      customerId: sale.customer._id,
      category: sale.category || 'gas',
      items: formItems,
      receivedAmount: sale.receivedAmount?.toString() || "",
      paymentStatus: sale.paymentStatus,
      notes: sale.notes || "",
    })
    setCustomerSearchTerm(sale.customer.name)
    setIsDialogOpen(true)
  }

  const handleDeleteClick = (sale: Sale) => {
    setSaleToDelete(sale)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!saleToDelete) return
    try {
      await salesAPI.delete(`/employee-sales/${saleToDelete._id}`)
      fetchData()
      setIsDeleteDialogOpen(false)
      setSaleToDelete(null)
    } catch (error) {
      console.error("Failed to delete sale:", error)
      alert("Failed to delete sale. Please try again.")
    }
  }

  const handleViewReceipt = (sale: Sale) => {
    const saleWithAddress = {
      ...sale,
      customer: {
        ...sale.customer,
        address: sale.customer.address || "N/A",
        phone: sale.customer.phone || "N/A",
      },
    };
    setSaleForReceipt(saleWithAddress);
    setIsReceiptDialogOpen(true);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }

  const handleFilterChange = (value: string) => {
    setStatusFilter(value)
  }

  const filteredSales = Array.isArray(sales) ? sales.filter(sale => {
    const searchTermLower = searchTerm.toLowerCase()
    const customerName = sale.customer?.name?.toLowerCase() || ''
    const invoiceNumber = sale.invoiceNumber?.toLowerCase() || ''

    const matchesSearch = customerName.includes(searchTermLower) || invoiceNumber.includes(searchTermLower)
    const matchesStatus = statusFilter === "all" || sale.paymentStatus === statusFilter

    return matchesSearch && matchesStatus
  }) : []

  return (
    <div className="flex flex-col h-full">
      <header className="bg-gradient-to-r from-gray-800 to-gray-900 text-white py-6 px-4 md:px-6 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Employee Gas Sales</h1>
            <p className="text-gray-400">Manage your daily gas sales and transactions.</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(isOpen) => {
            setIsDialogOpen(isOpen)
            if (!isOpen) resetForm()
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsDialogOpen(true)}>
                <PlusIcon className="mr-2 h-4 w-4" />
                New Sale
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingSale ? "Edit Sale" : "Create New Sale"}</DialogTitle>
                <DialogDescription>
                  {editingSale ? "Update the details of the existing sale." : "Fill out the form to create a new gas sale."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="category">Category *</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) => {
                          setFormData({ ...formData, category: value })
                          // Filter employee's assigned products based on selected category
                          const filteredProducts = allProducts.filter((product: Product) => product.category === value)
                          setProducts(filteredProducts)
                          console.log(`Filtered ${value} products for employee:`, filteredProducts)
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
                        onFocus={() => customerSearchTerm && setShowCustomerSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowCustomerSuggestions(false), 200)}
                        className="pr-10"
                        required
                      />
                      {showCustomerSuggestions && filteredCustomerSuggestions.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                          {filteredCustomerSuggestions.map((customer) => (
                            <div
                              key={customer._id}
                              className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                              onClick={() => handleCustomerSelect(customer)}
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

                  {/* Items Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-lg font-semibold">Items</Label>
                      <Button type="button" onClick={addItem} variant="outline" size="sm">
                        <PlusIcon className="w-4 h-4 mr-2" />
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
                                const product = products.find((p: Product) => p._id === productId)
                                
                                // Update both productId and price in a single atomic operation
                                const updatedItems = [...formData.items]
                                updatedItems[index] = {
                                  ...updatedItems[index],
                                  productId: productId,
                                  price: product ? product.leastPrice.toString() : updatedItems[index].price
                                }
                                
                                setFormData({ ...formData, items: updatedItems })
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
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.price}
                              onChange={(e) => {
                                const product = products.find((p: Product) => p._id === item.productId)
                                const enteredPrice = parseFloat(e.target.value)
                                
                                if (product && enteredPrice < product.leastPrice) {
                                  setValidationMessage(`Enter Greater than or equal to Least Price (AED ${product.leastPrice.toFixed(2)})`)
                                  setShowPriceValidationPopup(true)
                                  return
                                }
                                
                                updateItem(index, "price", e.target.value)
                              }}
                              placeholder={(() => {
                                const product = products.find((p: Product) => p._id === item.productId)
                                return product?.leastPrice ? `Min: AED ${product.leastPrice.toFixed(2)}` : 'Select product first'
                              })()}
                            />
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
                      <div className="text-2xl font-bold text-[#2B3068]">Total: AED {calculateTotalAmount().toFixed(2)}</div>
                    </div>
                  </div>

                  {/* Received Amount Section */}
                  <div className="space-y-2">
                    <Label htmlFor="receivedAmount">Received Amount (AED) *</Label>
                    <Input
                      id="receivedAmount"
                      name="receivedAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.receivedAmount}
                      onChange={(e) => {
                        const receivedAmount = e.target.value
                        const receivedValue = parseFloat(receivedAmount) || 0
                        const totalAmount = calculateTotalAmount()
                        
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
                          const totalAmount = calculateTotalAmount()
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
                  <div className="space-y-2">
                      <Label htmlFor="paymentStatus">Payment Status</Label>
                      <Select
                        value={formData.paymentStatus}
                        onValueChange={(value) => setFormData({ ...formData, paymentStatus: value })}
                        disabled
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
                  {/* Notes Field */}
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Input
                      id="notes"
                      placeholder="Add any relevant notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit">{editingSale ? "Save Changes" : "Create Sale"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <div className="mt-6 flex items-center justify-between">
          <div className="relative w-full max-w-md">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="search"
              placeholder="Search by invoice or customer..."
              className="pl-10 w-full bg-gray-800 border-gray-700 focus:border-gray-500"
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>
          <div className="flex items-center gap-4">
            <Label htmlFor="status-filter" className="text-sm font-medium">Status:</Label>
            <Select value={statusFilter} onValueChange={handleFilterChange}>
              <SelectTrigger className="w-[150px] bg-gray-800 border-gray-700 focus:border-gray-500">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="cleared">Cleared</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>
      <main className="flex-1 overflow-auto p-4 md:p-6">
        <Card>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Received Amount</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                      <div className="flex justify-center items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredSales.length > 0 ? (
                  filteredSales.map((sale) => (
                    <TableRow key={sale._id}>
                      <TableCell className="font-medium">{sale.invoiceNumber}</TableCell>
                      <TableCell>{sale.customer.name}</TableCell>
                      <TableCell>AED {sale.totalAmount.toFixed(2)}</TableCell>
                      <TableCell>AED {(sale.receivedAmount || 0).toFixed(2)}</TableCell>
                      <TableCell className="capitalize">{sale.paymentMethod}</TableCell>
                      <TableCell>{getPaymentStatusBadge(sale.paymentStatus)}</TableCell>
                      <TableCell>{new Date(sale.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoveHorizontalIcon className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewReceipt(sale)}>View Receipt</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(sale)}>Edit</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteClick(sale)} className="text-red-500">Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                      No sales found. Create your first sale to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the sale record.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      {saleForReceipt && (
        <ReceiptDialog
          onClose={() => {
            setIsReceiptDialogOpen(false);
            setSaleForReceipt(null);
          }}
          sale={saleForReceipt}
        />
      )}



      {/* Stock Validation Popup */}
      {showStockInsufficientPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl p-8 mx-4 max-w-md w-full transform transition-all duration-300 scale-100 animate-in fade-in-0 zoom-in-95">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Stock Alert!</h3>
                <p className="text-gray-600">{stockErrorMessage}</p>
              </div>
              <Button 
                onClick={() => setShowStockInsufficientPopup(false)}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-6 py-2 rounded-lg font-medium transition-all duration-200 hover:scale-105"
              >
                Got It
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Price Validation Popup */}
      {showPriceValidationPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowPriceValidationPopup(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-8 mx-4 max-w-md w-full transform transition-all duration-300 scale-100 animate-in fade-in-0 zoom-in-95">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Price Validation</h3>
                <p className="text-gray-600">{validationMessage}</p>
              </div>
              <Button 
                onClick={() => setShowPriceValidationPopup(false)}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-6 py-2 rounded-lg font-medium transition-all duration-200 hover:scale-105"
              >
                Got It
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MoveHorizontalIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="18 8 22 12 18 16" />
      <polyline points="6 8 2 12 6 16" />
      <line x1="2" x2="22" y1="12" y2="12" />
    </svg>
  )
}

function PlusIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  )
}

function SearchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}

