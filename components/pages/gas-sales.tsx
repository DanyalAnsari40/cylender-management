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
import { salesAPI, customersAPI, productsAPI } from "@/lib/api"
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
  notes?: string
  customerSignature?: string
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
  category: string
  price: number
  stock: number
}

export function GasSales() {
  const [sales, setSales] = useState<Sale[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingSale, setEditingSale] = useState<Sale | null>(null)
  const [receiptSale, setReceiptSale] = useState<Sale | null>(null)
  const [showSignatureDialog, setShowSignatureDialog] = useState(false)
  const [pendingSale, setPendingSale] = useState<Sale | null>(null)
  const [customerSignature, setCustomerSignature] = useState<string>("") 
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  // Form state
  const [formData, setFormData] = useState({
    customerId: "",
    items: [{ productId: "", quantity: "", price: "" }],
    paymentMethod: "cash",
    paymentStatus: "paid",
    notes: "",
  })

  useEffect(() => {
    fetchData()
  }, [])


  const fetchData = async () => {
    try {
      setLoading(true)
      const [salesResponse, customersResponse, productsResponse] = await Promise.all([
        salesAPI.getAll(),
        customersAPI.getAll(),
        productsAPI.getAll(),
      ])

      // Ensure we're setting arrays - handle nested data structure for all APIs
      const salesData = Array.isArray(salesResponse.data?.data) ? salesResponse.data.data : 
                       Array.isArray(salesResponse.data) ? salesResponse.data : []
      
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
      setProducts(productsData)
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
          const price = Number(item.price) || 0
          return item.productId && quantity > 0 && price > 0
        })
        .map((item) => {
          const product = (products || []).find((p) => p._id === item.productId)
          const quantity = Number(item.quantity) || 1
          const price = Number(product?.price || item.price) || 0
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
        notes: formData.notes,
      }

      if (editingSale) {
        await salesAPI.update(editingSale._id, saleData)
      } else {
        await salesAPI.create(saleData)
      }

      await fetchData()
      resetForm()
      setIsDialogOpen(false)
    } catch (error: any) {
      console.error("Failed to save sale:", error)
      alert(error.response?.data?.error || "Failed to save sale")
    }
  }

  const resetForm = () => {
    setFormData({
      customerId: "",
      items: [{ productId: "", quantity: "", price: "" }],
      paymentMethod: "cash",
      paymentStatus: "paid",
      notes: "",
    })
    setEditingSale(null)
  }

  const handleEdit = (sale: Sale) => {
    setEditingSale(sale)
    setFormData({
      customerId: sale.customer?._id || "",
      items: (sale.items || []).map((item) => ({
        productId: item.product?._id || "",
        quantity: item.quantity.toString(),
        price: item.price.toString(),
      })),
      paymentMethod: sale.paymentMethod || "cash",
      paymentStatus: sale.paymentStatus || "paid",
      notes: sale.notes || "",
    })
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
    const updatedItems = [...formData.items]
    updatedItems[index] = { ...updatedItems[index], [field]: value }

    if (field === "productId") {
      const product = (products || []).find((p) => p._id === value)
      if (product && product.price !== undefined && product.price !== null) {
        updatedItems[index].price = product.price.toString()
      }
    }

    setFormData({ ...formData, items: updatedItems })
  }

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
    const product = (products || []).find((p) => p._id === item.productId)
    const quantity = Number(item.quantity) || 0
    const price = Number(product?.price || item.price) || 0
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
    <div className="space-y-8">
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
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer">Customer *</Label>
                  <CustomerDropdown
                    selectedCustomerId={formData.customerId}
                    onSelect={(customerId) => setFormData({ ...formData, customerId })}
                    showDetails={false}
                  />
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
                          onSelect={(productId) => updateItem(index, "productId", productId)}
                          categoryFilter="gas"
                          placeholder="Select gas product"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, "quantity", e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Price (AED)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.price}
                          onChange={(e) => updateItem(index, "price", e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Total (AED)</Label>
                        <div className="flex items-center gap-2">
                          <Input value={`AED ${((Number(item.price) || 0) * (Number(item.quantity) || 0)).toFixed(2)}`} disabled />
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
                      <SelectItem value="paid">Paid</SelectItem>
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
                  <TableHead className="p-4">Payment</TableHead>
                  <TableHead className="p-4">Status</TableHead>
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
                    <TableCell className="p-4 capitalize">{sale.paymentMethod}</TableCell>
                    <TableCell className="p-4">
                      <Badge
                        variant={
                          sale.paymentStatus === "paid"
                            ? "default"
                            : sale.paymentStatus === "pending"
                              ? "secondary"
                              : "destructive"
                        }
                        className={
                          sale.paymentStatus === "paid"
                            ? "bg-green-100 text-green-800"
                            : sale.paymentStatus === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                        }
                      >
                        {sale.paymentStatus}
                      </Badge>
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
    </div>
  )
}
