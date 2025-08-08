"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Package, Loader2, Edit } from "lucide-react"
import { purchaseOrdersAPI, inventoryAPI, productsAPI, suppliersAPI } from "@/lib/api"

interface InventoryItem {
  id: string
  poNumber: string
  productName: string
  supplierName: string
  purchaseDate: string
  quantity: number
  unitPrice: number
  totalAmount: number
  status: "pending" | "received"
  purchaseType: "gas" | "cylinder"
}

interface Product {
  _id: string
  name: string
  category: "gas" | "cylinder"
  costPrice: number
  leastPrice: number
  currentStock: number
}

interface Supplier {
  _id: string
  name: string
}

export function Inventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [editFormData, setEditFormData] = useState({
    quantity: "",
    unitPrice: "",
    totalAmount: ""
  })

  useEffect(() => {
    fetchInventoryData()
  }, [])

  const fetchInventoryData = async () => {
    try {
      setError("")
      const [purchaseOrdersRes, productsRes, suppliersRes] = await Promise.all([
        purchaseOrdersAPI.getAll(),
        productsAPI.getAll(),
        suppliersAPI.getAll()
      ])

      const purchaseOrdersData = purchaseOrdersRes.data?.data || purchaseOrdersRes.data || []
      const productsData = Array.isArray(productsRes.data?.data)
        ? productsRes.data.data
        : Array.isArray(productsRes.data)
          ? productsRes.data
          : Array.isArray(productsRes)
            ? productsRes
            : []
      const suppliersData = Array.isArray(suppliersRes.data?.data)
        ? suppliersRes.data.data
        : Array.isArray(suppliersRes.data)
          ? suppliersRes.data
          : Array.isArray(suppliersRes)
            ? suppliersRes
            : []

      // Build quick-lookup maps by ID
      const productsMap = new Map<string, any>(
        (productsData as any[]).filter(Boolean).map((p: any) => [p._id, p])
      )
      const suppliersMap = new Map<string, any>(
        (suppliersData as any[]).filter(Boolean).map((s: any) => [s._id, s])
      )

      const inventoryItems = Array.isArray(purchaseOrdersData)
        ? purchaseOrdersData.map((order: any, idx: number) => {
            const productRef = order.product ?? order.productId
            const supplierRef = order.supplier ?? order.supplierId ?? order.vendor

            // Resolve product name from populated object, ID lookup, or fallback fields
            let resolvedProductName = 'Unknown Product'
            if (productRef && typeof productRef === 'object') {
              resolvedProductName = productRef.name || productRef.title || order.productName || resolvedProductName
            } else if (typeof productRef === 'string') {
              const p = productsMap.get(productRef)
              if (p) resolvedProductName = p.name || p.title || resolvedProductName
              else resolvedProductName = order.productName || resolvedProductName
            } else {
              resolvedProductName = order.productName || resolvedProductName
            }
            if (resolvedProductName === 'Unknown Product' && typeof productRef === 'string') {
              resolvedProductName = productRef
            }

            // Resolve supplier name from populated object, ID lookup, or fallback fields
            let resolvedSupplierName = 'Unknown Supplier'
            if (supplierRef && typeof supplierRef === 'object') {
              resolvedSupplierName = supplierRef.name || supplierRef.companyName || supplierRef.supplierName || order.supplierName || order.vendorName || resolvedSupplierName
            } else if (typeof supplierRef === 'string') {
              const s = suppliersMap.get(supplierRef)
              if (s) resolvedSupplierName = s.name || s.companyName || s.supplierName || resolvedSupplierName
              else resolvedSupplierName = order.supplierName || order.vendorName || resolvedSupplierName
            } else {
              resolvedSupplierName = order.supplierName || order.vendorName || resolvedSupplierName
            }
            if (resolvedSupplierName === 'Unknown Supplier' && typeof supplierRef === 'string') {
              resolvedSupplierName = supplierRef
            }

            // Debug when names cannot be resolved
            if (resolvedSupplierName === 'Unknown Supplier') {
              console.debug('[Inventory] Could not resolve supplier name for PO', order.poNumber || order._id, {
                supplierRef,
                orderSupplier: order.supplier,
                supplierId: typeof supplierRef === 'string' ? supplierRef : supplierRef?._id,
                suppliersSample: suppliersData?.slice?.(0, 1),
              })
            }
            if (resolvedProductName === 'Unknown Product' && idx < 3) {
              console.debug('[Inventory] Could not resolve product name for PO', order.poNumber || order._id, {
                productRef,
                orderProduct: order.product,
                productId: typeof productRef === 'string' ? productRef : productRef?._id,
                productsSample: productsData?.slice?.(0, 1),
              })
            }

            return {
              id: order._id,
              poNumber: order.poNumber || `PO-${order._id?.slice(-6) || 'UNKNOWN'}`,
              productName: resolvedProductName,
              supplierName: resolvedSupplierName,
              purchaseDate: order.purchaseDate || order.createdAt,
              quantity: order.quantity || 0,
              unitPrice: order.unitPrice || 0,
              totalAmount: order.totalAmount || 0,
              status: order.inventoryStatus || 'pending',
              purchaseType: order.purchaseType || 'gas'
            } as InventoryItem
          })
        : []

      setInventory(inventoryItems)
      setProducts(productsData)
      setSuppliers(suppliersData)
    } catch (error: any) {
      setError(`Failed to load inventory: ${error.message}`)
      setInventory([])
      setProducts([])
      setSuppliers([])
    } finally {
      setLoading(false)
    }
  }

  const handleReceiveInventory = async (id: string) => {
    try {
      console.log("Updating inventory status to received for ID:", id)
      
      // Update status in database - the API will handle stock synchronization automatically
      const response = await inventoryAPI.receiveInventory(id)
      console.log("Inventory update response:", response)
      
      if (response.data.success) {
        // Refresh inventory data to get updated values from database
        await fetchInventoryData()
      } else {
        setError("Failed to update inventory status")
      }
    } catch (error: any) {
      console.error("Failed to update inventory status:", error)
      setError(`Failed to update inventory: ${error.message}`)
    }
  }

  const handleEditInventory = (item: InventoryItem) => {
    setEditingItem(item)
    setEditFormData({
      quantity: item.quantity.toString(),
      unitPrice: item.unitPrice.toString(),
      totalAmount: item.totalAmount.toString()
    })
    setIsEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editingItem || !editFormData.quantity || !editFormData.unitPrice) return

    try {
      const newQuantity = Number.parseFloat(editFormData.quantity)
      const unitPrice = Number.parseFloat(editFormData.unitPrice)
      
      console.log("Updating inventory item:", editingItem.id, { quantity: newQuantity, unitPrice })
      
      // Update in database - the API will handle stock synchronization automatically
      const response = await inventoryAPI.updateItem(editingItem.id, {
        quantity: newQuantity,
        unitPrice
      })
      
      console.log("Inventory update response:", response)
      
      if (response.data.success) {
        // Refresh inventory data to get updated values from database
        await fetchInventoryData()
        setIsEditDialogOpen(false)
        setEditingItem(null)
      } else {
        setError("Failed to update inventory item")
      }
    } catch (error: any) {
      console.error("Failed to update inventory item:", error)
      setError(`Failed to update inventory: ${error.message}`)
    }
  }

  const handleCancelEdit = () => {
    setIsEditDialogOpen(false)
    setEditingItem(null)
    setEditFormData({ quantity: "", unitPrice: "", totalAmount: "" })
  }

  const getAvailableStock = (productName: string) => {
    const product = products.find(p => p.name === productName)
    if (!product) {
      return { stock: 0, color: "text-red-600" }
    }
    const stock = Number(product.currentStock) || 0
    let color = "text-green-600"
    if (stock === 0) color = "text-red-600"
    else if (stock < 10) color = "text-orange-600"
    return { stock, color }
  }

  const pendingItems = inventory.filter((item) => item.status === "pending")
  const receivedItems = inventory.filter((item) => item.status === "received")

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-[#2B3068]" />
          <p className="text-gray-600">Loading inventory...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="pt-16 lg:pt-0 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#2B3068] to-[#1a1f4a] rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 text-white">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 flex items-center gap-3">
          <Package className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10" />
          Inventory Management
        </h1>
        <p className="text-white/80 text-sm sm:text-base lg:text-lg">Track and manage your inventory items</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-auto">
          <TabsTrigger value="pending" className="text-xs sm:text-sm font-medium py-2 sm:py-3">
            Pending Orders ({pendingItems.length})
          </TabsTrigger>
          <TabsTrigger value="received" className="text-xs sm:text-sm font-medium py-2 sm:py-3">
            Received Items ({receivedItems.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card className="border-0 shadow-xl rounded-xl sm:rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-[#2B3068] to-[#1a1f4a] text-white p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl lg:text-2xl font-bold">Pending Purchase Orders</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 border-b-2 border-gray-200">
                      <TableHead className="font-bold text-gray-700 p-4">PO Number</TableHead>
                      <TableHead className="font-bold text-gray-700 p-4">Product</TableHead>
                      <TableHead className="font-bold text-gray-700 p-4">Supplier</TableHead>
                      <TableHead className="font-bold text-gray-700 p-4">Type</TableHead>
                      <TableHead className="font-bold text-gray-700 p-4">Quantity</TableHead>
                      <TableHead className="font-bold text-gray-700 p-4">Unit Price</TableHead>
                      <TableHead className="font-bold text-gray-700 p-4">Total</TableHead>
                      <TableHead className="font-bold text-gray-700 p-4">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingItems.map((item) => (
                      <TableRow key={item.id} className="hover:bg-gray-50 transition-colors border-b border-gray-100">
                        <TableCell className="font-semibold text-[#2B3068] p-4">{item.poNumber}</TableCell>
                        <TableCell className="p-4">{item.productName}</TableCell>
                        <TableCell className="p-4">{item.supplierName}</TableCell>
                        <TableCell className="p-4">
                          <Badge variant={item.purchaseType === "gas" ? "default" : "secondary"}>
                            {item.purchaseType}
                          </Badge>
                        </TableCell>
                        <TableCell className="p-4">{item.quantity}</TableCell>
                        <TableCell className="p-4">AED {item.unitPrice.toFixed(2)}</TableCell>
                        <TableCell className="p-4 font-semibold">AED {item.totalAmount.toFixed(2)}</TableCell>
                        <TableCell className="p-4">
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              onClick={() => handleReceiveInventory(item.id)}
                              style={{ backgroundColor: "#2B3068" }}
                              className="hover:opacity-90 text-white min-h-[36px]"
                            >
                              Mark Received
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              style={{ borderColor: "#2B3068", color: "#2B3068" }}
                              className="hover:bg-slate-50 min-h-[36px]"
                              onClick={() => handleEditInventory(item)}
                            >
                              Edit
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {pendingItems.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-gray-500 py-12">
                          <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
                          <p className="text-lg font-medium">No pending orders</p>
                          <p className="text-sm">All orders have been received</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden">
                {pendingItems.length > 0 ? (
                  <div className="divide-y divide-gray-200">
                    {pendingItems.map((item) => (
                      <div key={item.id} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors">
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-semibold text-[#2B3068] text-base sm:text-lg">{item.poNumber}</h3>
                              <p className="text-sm text-gray-600">{item.productName}</p>
                            </div>
                            <Badge variant={item.purchaseType === "gas" ? "default" : "secondary"}>
                              {item.purchaseType}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="font-medium text-gray-700">Supplier:</span>
                              <span className="ml-2 text-gray-600">{item.supplierName}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Quantity:</span>
                              <span className="ml-2 text-gray-600">{item.quantity}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Unit Price:</span>
                              <span className="ml-2 text-gray-600">AED {item.unitPrice.toFixed(2)}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Total:</span>
                              <span className="ml-2 font-semibold text-[#2B3068]">AED {item.totalAmount.toFixed(2)}</span>
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2 pt-2">
                            <Button
                              size="sm"
                              onClick={() => handleReceiveInventory(item.id)}
                              style={{ backgroundColor: "#2B3068" }}
                              className="w-full sm:w-auto hover:opacity-90 text-white min-h-[44px]"
                            >
                              Mark Received
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              style={{ borderColor: "#2B3068", color: "#2B3068" }}
                              className="w-full sm:w-auto hover:bg-slate-50 min-h-[44px]"
                              onClick={() => handleEditInventory(item)}
                            >
                              Edit
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 px-4">
                    <div className="text-gray-500">
                      <Package className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 opacity-50" />
                      <p className="text-base sm:text-lg font-medium">No pending orders</p>
                      <p className="text-sm">All orders have been received</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="received">
          <Card className="border-0 shadow-xl rounded-xl sm:rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-[#2B3068] to-[#1a1f4a] text-white p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl lg:text-2xl font-bold">Received Inventory Items</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 border-b-2 border-gray-200">
                      <TableHead className="font-bold text-gray-700 p-4">PO Number</TableHead>
                      <TableHead className="font-bold text-gray-700 p-4">Product</TableHead>
                      <TableHead className="font-bold text-gray-700 p-4">Supplier</TableHead>
                      <TableHead className="font-bold text-gray-700 p-4">Type</TableHead>
                      <TableHead className="font-bold text-gray-700 p-4">Quantity</TableHead>
                      <TableHead className="font-bold text-gray-700 p-4">Available Stock</TableHead>
                      <TableHead className="font-bold text-gray-700 p-4">Unit Price</TableHead>
                      <TableHead className="font-bold text-gray-700 p-4">Total</TableHead>
                      <TableHead className="font-bold text-gray-700 p-4">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receivedItems.map((item) => (
                      <TableRow key={item.id} className="hover:bg-gray-50 transition-colors border-b border-gray-100">
                        <TableCell className="font-semibold text-[#2B3068] p-4">{item.poNumber}</TableCell>
                        <TableCell className="p-4">{item.productName}</TableCell>
                        <TableCell className="p-4">{item.supplierName}</TableCell>
                        <TableCell className="p-4">
                          <Badge variant={item.purchaseType === "gas" ? "default" : "secondary"}>
                            {item.purchaseType}
                          </Badge>
                        </TableCell>
                        <TableCell className="p-4">{item.quantity}</TableCell>
                        <TableCell className={`p-4 font-semibold ${getAvailableStock(item.productName).color}`}>{getAvailableStock(item.productName).stock}</TableCell>
                        <TableCell className="p-4">AED {item.unitPrice.toFixed(2)}</TableCell>
                        <TableCell className="p-4 font-semibold">AED {item.totalAmount.toFixed(2)}</TableCell>
                        <TableCell className="p-4">
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              style={{ borderColor: "#2B3068", color: "#2B3068" }}
                              className="hover:bg-slate-50 min-h-[36px]"
                              onClick={() => handleEditInventory(item)}
                            >
                              Edit
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {receivedItems.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-gray-500 py-12">
                          <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
                          <p className="text-lg font-medium">No received items</p>
                          <p className="text-sm">All items are pending</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden">
                {receivedItems.length > 0 ? (
                  <div className="divide-y divide-gray-200">
                    {receivedItems.map((item) => (
                      <div key={item.id} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors">
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-semibold text-[#2B3068] text-base sm:text-lg">{item.poNumber}</h3>
                              <p className="text-sm text-gray-600">{item.productName}</p>
                            </div>
                            <Badge variant={item.purchaseType === "gas" ? "default" : "secondary"}>
                              {item.purchaseType}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="font-medium text-gray-700">Supplier:</span>
                              <span className="ml-2 text-gray-600">{item.supplierName}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Quantity:</span>
                              <span className="ml-2 text-gray-600">{item.quantity}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Unit Price:</span>
                              <span className="ml-2 text-gray-600">AED {item.unitPrice.toFixed(2)}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Total:</span>
                              <span className="ml-2 font-semibold text-[#2B3068]">AED {item.totalAmount.toFixed(2)}</span>
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2 pt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              style={{ borderColor: "#2B3068", color: "#2B3068" }}
                              className="w-full sm:w-auto hover:bg-slate-50 min-h-[44px]"
                              onClick={() => handleEditInventory(item)}
                            >
                              Edit
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 px-4">
                    <div className="text-gray-500">
                      <Package className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 opacity-50" />
                      <p className="text-base sm:text-lg font-medium">No received items</p>
                      <p className="text-sm">All items are pending</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Inventory Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl" style={{ color: "#2B3068" }}>
              <Edit className="w-4 h-4 sm:w-5 sm:h-5" />
              Edit Inventory Item
            </DialogTitle>
          </DialogHeader>
          
          {editingItem && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">PO Number: <span className="font-medium">{editingItem.poNumber}</span></p>
                <p className="text-sm text-gray-600">Product: <span className="font-medium">{editingItem.productName}</span></p>
                <p className="text-sm text-gray-600">Supplier: <span className="font-medium">{editingItem.supplierName}</span></p>
              </div>
              
              <div className="space-y-3">
                <div>
                  <Label htmlFor="edit-quantity" className="text-sm font-medium">Quantity</Label>
                  <Input
                    id="edit-quantity"
                    type="number"
                    value={editFormData.quantity}
                    onChange={(e) => setEditFormData({ ...editFormData, quantity: e.target.value })}
                    min="1"
                    className="h-11 sm:h-12 text-sm sm:text-base"
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-unitPrice" className="text-sm font-medium">Unit Price (AED)</Label>
                  <Input
                    id="edit-unitPrice"
                    type="number"
                    step="0.01"
                    value={editFormData.unitPrice}
                    onChange={(e) => setEditFormData({ ...editFormData, unitPrice: e.target.value })}
                    min="0.01"
                    className="h-11 sm:h-12 text-sm sm:text-base"
                  />
                </div>
                
                {editFormData.quantity && editFormData.unitPrice && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-600">
                      Total Amount: <span className="font-bold text-[#2B3068]">
                        AED {(Number.parseFloat(editFormData.quantity) * Number.parseFloat(editFormData.unitPrice)).toFixed(2)}
                      </span>
                    </p>
                  </div>
                )}
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  onClick={handleSaveEdit}
                  style={{ backgroundColor: "#2B3068" }}
                  className="w-full sm:flex-1 hover:opacity-90 min-h-[44px]"
                  disabled={!editFormData.quantity || !editFormData.unitPrice}
                >
                  Save Changes
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancelEdit}
                  className="w-full sm:flex-1 min-h-[44px]"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
