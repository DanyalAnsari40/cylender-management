"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, Loader2, ShoppingCart, AlertCircle } from "lucide-react"
import { suppliersAPI, productsAPI, purchaseOrdersAPI } from "@/lib/api"

interface PurchaseOrder {
  _id: string
  supplier: { _id: string; companyName: string }
  product: { _id: string; name: string }
  purchaseDate: string
  purchaseType: "gas" | "cylinder"
  quantity: number
  unitPrice: number
  totalAmount: number
  notes: string
  status: "pending" | "completed" | "cancelled"
  poNumber: string
}

export function PurchaseManagement() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null)
  const [error, setError] = useState<string>("")
  const [formData, setFormData] = useState(() => ({
    supplierId: "",
    productId: "",
    purchaseDate: new Date().toISOString().split("T")[0],
    purchaseType: "gas" as "gas" | "cylinder",
    quantity: "",
    unitPrice: "",
    notes: "",
  }))

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setError("")
      
      // Fetch suppliers and products first (they don't require auth)
      const [suppliersRes, productsRes] = await Promise.all([
        suppliersAPI.getAll(), 
        productsAPI.getAll()
      ])

      console.log("Suppliers response:", suppliersRes)
      console.log("Products response:", productsRes)
      
      const suppliersData = suppliersRes.data || []
      const productsData = productsRes.data || []
      
      console.log("Suppliers data:", suppliersData)
      console.log("Products data:", productsData)

      setSuppliers(suppliersData)
      setProducts(productsData)
      
      // Try to fetch purchase orders separately (requires auth)
      try {
        console.log("Attempting to fetch purchase orders...")
        const purchaseOrdersRes = await purchaseOrdersAPI.getAll()
        console.log("Purchase orders response:", purchaseOrdersRes)
        
        // The API response structure is: response.data.data (nested)
        const ordersData = purchaseOrdersRes.data?.data || purchaseOrdersRes.data || []
        console.log("Purchase orders data:", ordersData)
        
        // Ensure it's always an array
        const finalData = Array.isArray(ordersData) ? ordersData : []
        console.log("Final purchase orders data:", finalData)
        
        setPurchaseOrders(finalData)
      } catch (purchaseError: any) {
        console.error("Failed to fetch purchase orders:", purchaseError)
        console.error("Error details:", {
          status: purchaseError.response?.status,
          data: purchaseError.response?.data,
          message: purchaseError.message
        })
        
        if (purchaseError.response?.status === 401) {
          setError("Authentication required. Please log in to view purchase orders.")
        } else {
          setError(`Failed to load purchase orders: ${purchaseError.message}`)
        }
        setPurchaseOrders([])
      }
    } catch (error: any) {
      console.error("Failed to fetch basic data:", error)
      setError("Failed to load suppliers and products. Please refresh the page.")
    } finally {
      setLoading(false)
    }
  }

  const generatePONumber = () => {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0")
    return `PO-${year}${month}${day}-${random}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError("")

    try {
      if (!formData.supplierId || !formData.productId || !formData.quantity || !formData.unitPrice) {
        throw new Error("Please fill in all required fields")
      }

      const quantity = Number.parseInt(formData.quantity)
      const unitPrice = Number.parseFloat(formData.unitPrice)

      if (isNaN(quantity) || isNaN(unitPrice) || quantity <= 0 || unitPrice <= 0) {
        throw new Error("Please enter valid positive numbers for quantity and unit price")
      }

      const totalAmount = quantity * unitPrice

      const orderData = {
        supplier: formData.supplierId,
        product: formData.productId,
        purchaseDate: formData.purchaseDate,
        purchaseType: formData.purchaseType,
        quantity,
        unitPrice,
        totalAmount,
        notes: formData.notes,
        status: "pending" as const,
      }

      let response
      if (editingOrder) {
        response = await purchaseOrdersAPI.update(editingOrder._id, orderData)
      } else {
        response = await purchaseOrdersAPI.create(orderData)
      }

      // Refresh the data to get the latest from database
      await fetchData()
      resetForm()
      setIsDialogOpen(false)
    } catch (error: any) {
      console.error("Purchase order error:", error)
      setError(error.message || "Failed to save purchase order")
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      supplierId: "",
      productId: "",
      purchaseDate: new Date().toISOString().split("T")[0],
      purchaseType: "gas",
      quantity: "",
      unitPrice: "",
      notes: "",
    })
    setEditingOrder(null)
    setError("")
  }

  const handleEdit = (order: PurchaseOrder) => {
    setEditingOrder(order)
    setFormData({
      supplierId: order.supplier?._id || "",
      productId: order.product?._id || "",
      purchaseDate: order.purchaseDate ? order.purchaseDate.split("T")[0] : new Date().toISOString().split("T")[0],
      purchaseType: order.purchaseType || "gas",
      quantity: order.quantity?.toString() || "",
      unitPrice: order.unitPrice?.toString() || "",
      notes: order.notes || "",
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this purchase order?")) {
      try {
        await purchaseOrdersAPI.delete(id)
        // Refresh the data to get the latest from database
        await fetchData()
      } catch (error: any) {
        console.error("Failed to delete purchase order:", error)
        setError("Failed to delete purchase order. Please try again.")
      }
    }
  }

  const filteredProducts = products.filter((p) => p.category === formData.purchaseType)
  
  // Debug logging for product filtering
  console.log("All products:", products)
  console.log("Current purchase type:", formData.purchaseType)
  console.log("Filtered products:", filteredProducts)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-[#2B3068]" />
          <p className="text-gray-600">Loading purchase orders...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="pt-16 lg:pt-0 space-y-6 sm:space-y-8">
      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-red-700 text-sm break-words">{error}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setError("")}
            className="text-red-600 border-red-300 flex-shrink-0"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Header Section */}
      <div className="bg-gradient-to-r from-[#2B3068] to-[#1a1f4a] rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 flex items-center gap-2 sm:gap-3">
              <ShoppingCart className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 flex-shrink-0" />
              <span className="truncate">Purchase Management</span>
            </h1>
            <p className="text-white/80 text-sm sm:text-base lg:text-lg">Create and manage your purchase orders</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={resetForm}
                className="bg-white text-[#2B3068] hover:bg-white/90 font-semibold px-4 sm:px-6 lg:px-8 py-2 sm:py-3 lg:py-4 text-sm sm:text-base lg:text-lg rounded-lg sm:rounded-xl shadow-lg transition-all duration-300 hover:scale-105 w-full sm:w-auto"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                New Purchase Order
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto mx-auto">
              <DialogHeader className="pb-4 sm:pb-6">
                <DialogTitle className="text-xl sm:text-2xl font-bold text-[#2B3068] flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />
                  <span className="truncate">{editingOrder ? "Edit Purchase Order" : "New Purchase Order"}</span>
                </DialogTitle>
                <div className="sr-only">
                  {editingOrder ? "Edit an existing purchase order" : "Create a new purchase order with supplier, product, and quantity details"}
                </div>
              </DialogHeader>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 mb-4">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-red-700 text-sm break-words">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2 sm:space-y-3">
                    <Label htmlFor="supplier" className="text-sm font-semibold text-gray-700">
                      Supplier *
                    </Label>
                    <Select
                      value={formData.supplierId}
                      onValueChange={(value) => setFormData({ ...formData, supplierId: value })}
                    >
                      <SelectTrigger className="h-10 sm:h-12 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:border-[#2B3068] transition-colors">
                        <SelectValue placeholder="Select supplier" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier._id} value={supplier._id}>
                            {supplier.companyName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 sm:space-y-3">
                    <Label htmlFor="purchaseDate" className="text-sm font-semibold text-gray-700">
                      Purchase Date *
                    </Label>
                    <Input
                      id="purchaseDate"
                      type="date"
                      value={formData.purchaseDate}
                      onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                      className="h-10 sm:h-12 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:border-[#2B3068] transition-colors"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2 sm:space-y-3">
                  <Label htmlFor="purchaseType" className="text-sm font-semibold text-gray-700">
                    Purchase Type *
                  </Label>
                  <Select
                    value={formData.purchaseType}
                    onValueChange={(value: "gas" | "cylinder") =>
                      setFormData({ ...formData, purchaseType: value, productId: "" })
                    }
                  >
                    <SelectTrigger className="h-10 sm:h-12 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:border-[#2B3068] transition-colors">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gas">Gas</SelectItem>
                      <SelectItem value="cylinder">Cylinder</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 sm:space-y-3">
                  <Label htmlFor="product" className="text-sm font-semibold text-gray-700">
                    Product Name *
                  </Label>
                  <Select
                    value={formData.productId}
                    onValueChange={(value) => setFormData({ ...formData, productId: value })}
                  >
                    <SelectTrigger className="h-10 sm:h-12 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:border-[#2B3068] transition-colors">
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredProducts.map((product) => (
                        <SelectItem key={product._id} value={product._id}>
                          {product.name} - AED {product.costPrice}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2 sm:space-y-3">
                    <Label htmlFor="quantity" className="text-sm font-semibold text-gray-700">
                      Quantity *
                    </Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      placeholder="Enter quantity"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      className="h-10 sm:h-12 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:border-[#2B3068] transition-colors"
                      required
                    />
                  </div>

                  <div className="space-y-2 sm:space-y-3">
                    <Label htmlFor="unitPrice" className="text-sm font-semibold text-gray-700">
                      Unit Price (AED) *
                    </Label>
                    <Input
                      id="unitPrice"
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="Enter unit price"
                      value={formData.unitPrice}
                      onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                      className="h-10 sm:h-12 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:border-[#2B3068] transition-colors"
                      required
                    />
                  </div>
                </div>

                {formData.quantity && formData.unitPrice && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 sm:p-4 rounded-lg sm:rounded-xl border border-blue-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm sm:text-lg font-semibold text-gray-700">Total Amount:</span>
                      <span className="text-lg sm:text-2xl font-bold text-[#2B3068]">
                        AED {(Number.parseFloat(formData.quantity) * Number.parseFloat(formData.unitPrice)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}

                <div className="space-y-2 sm:space-y-3">
                  <Label htmlFor="notes" className="text-sm font-semibold text-gray-700">
                    Notes (optional)
                  </Label>
                  <Textarea
                    id="notes"
                    placeholder="Additional notes..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="min-h-[80px] sm:min-h-[100px] border-2 border-gray-200 rounded-lg sm:rounded-xl focus:border-[#2B3068] transition-colors resize-none"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 sm:h-14 text-base sm:text-lg font-semibold bg-gradient-to-r from-[#2B3068] to-[#1a1f4a] hover:from-[#1a1f4a] hover:to-[#2B3068] rounded-lg sm:rounded-xl shadow-lg transition-all duration-300"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />
                      {editingOrder ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    <>{editingOrder ? "Update Order" : "Submit"}</>
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Purchase Orders Table */}
      <Card className="border-0 shadow-xl rounded-xl sm:rounded-2xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-[#2B3068] to-[#1a1f4a] text-white p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl lg:text-2xl font-bold flex items-center gap-2">
            Purchase Orders
            <Badge variant="secondary" className="bg-white/20 text-white ml-2 text-xs sm:text-sm">
              {purchaseOrders.length} orders
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 border-b-2 border-gray-200">
                  <TableHead className="font-bold text-gray-700 p-2 sm:p-4 text-xs sm:text-sm whitespace-nowrap">
                    PO Number
                  </TableHead>
                  <TableHead className="font-bold text-gray-700 p-2 sm:p-4 text-xs sm:text-sm whitespace-nowrap">
                    Supplier
                  </TableHead>
                  <TableHead className="font-bold text-gray-700 p-2 sm:p-4 text-xs sm:text-sm whitespace-nowrap">
                    Date
                  </TableHead>
                  <TableHead className="font-bold text-gray-700 p-2 sm:p-4 text-xs sm:text-sm whitespace-nowrap">
                    Product
                  </TableHead>
                  <TableHead className="font-bold text-gray-700 p-2 sm:p-4 text-xs sm:text-sm whitespace-nowrap">
                    Qty
                  </TableHead>
                  <TableHead className="font-bold text-gray-700 p-2 sm:p-4 text-xs sm:text-sm whitespace-nowrap">
                    Unit Price (AED)
                  </TableHead>
                  <TableHead className="font-bold text-gray-700 p-2 sm:p-4 text-xs sm:text-sm whitespace-nowrap">
                    Total Amount (AED)
                  </TableHead>
                  <TableHead className="font-bold text-gray-700 p-2 sm:p-4 text-xs sm:text-sm whitespace-nowrap">
                    Status
                  </TableHead>
                  <TableHead className="font-bold text-gray-700 p-2 sm:p-4 text-xs sm:text-sm whitespace-nowrap">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchaseOrders.map((order) => (
                  <TableRow key={order._id} className="hover:bg-gray-50 transition-colors border-b border-gray-100">
                    <TableCell className="font-semibold text-[#2B3068] p-2 sm:p-4 text-xs sm:text-sm">
                      {order.poNumber || 'N/A'}
                    </TableCell>
                    <TableCell className="p-2 sm:p-4 text-xs sm:text-sm max-w-[120px] truncate">
                      {order.supplier?.companyName || 'Unknown Supplier'}
                    </TableCell>
                    <TableCell className="p-2 sm:p-4 text-xs sm:text-sm whitespace-nowrap">
                      {order.purchaseDate ? new Date(order.purchaseDate).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell className="p-2 sm:p-4 text-xs sm:text-sm max-w-[120px] truncate">
                      {order.product?.name || 'Unknown Product'}
                    </TableCell>
                    <TableCell className="p-2 sm:p-4 text-xs sm:text-sm">{order.quantity || 0}</TableCell>
                    <TableCell className="p-2 sm:p-4 font-semibold text-xs sm:text-sm">
                      AED {order.unitPrice?.toFixed(2) || "0.00"}
                    </TableCell>
                    <TableCell className="p-2 sm:p-4 font-semibold text-xs sm:text-sm">
                      AED {order.totalAmount?.toFixed(2) || "0.00"}
                    </TableCell>
                    <TableCell className="p-2 sm:p-4">
                      <Badge
                        variant={
                          order.status === "completed"
                            ? "default"
                            : order.status === "pending"
                              ? "secondary"
                              : "destructive"
                        }
                        className={`${
                          order.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : order.status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                        } font-medium px-2 py-1 rounded-full text-xs`}
                      >
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="p-2 sm:p-4">
                      <div className="flex space-x-1 sm:space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(order)}
                          className="border-[#2B3068] text-[#2B3068] hover:bg-[#2B3068] hover:text-white transition-colors p-1 sm:p-2"
                        >
                          <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(order._id)}
                          className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-colors p-1 sm:p-2"
                        >
                          <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {purchaseOrders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 sm:py-12">
                      <div className="text-gray-500">
                        <ShoppingCart className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 opacity-50" />
                        <p className="text-base sm:text-lg font-medium">No purchase orders found</p>
                        <p className="text-sm">Create your first purchase order to get started</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
