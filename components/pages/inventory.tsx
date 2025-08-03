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
import { purchaseOrdersAPI, inventoryAPI, productsAPI } from "@/lib/api"

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

export function Inventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
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
      console.log("Fetching inventory data from API...")
      
      const inventoryRes = await inventoryAPI.getAll()
      console.log("Inventory response:", inventoryRes)
      
      // The API response structure
      const inventoryData = inventoryRes.data?.data || inventoryRes.data || []
      console.log("Inventory data:", inventoryData)
      
      // Ensure it's always an array
      const inventoryItems = Array.isArray(inventoryData) ? inventoryData : []
      console.log("Final inventory data:", inventoryItems)

      setInventory(inventoryItems)
    } catch (error: any) {
      console.error("Failed to fetch inventory data:", error)
      if (error.response?.status === 401) {
        setError("Authentication required. Please log in to view inventory.")
      } else {
        setError(`Failed to load inventory: ${error.message}`)
      }
      setInventory([])
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
                        <TableCell colSpan={8} className="text-center text-gray-500 py-12">
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
