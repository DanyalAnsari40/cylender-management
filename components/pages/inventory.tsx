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
import { purchaseOrdersAPI, inventoryAPI } from "@/lib/api"

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
      
      // Update status in database
      const response = await inventoryAPI.receiveInventory(id)
      console.log("Inventory update response:", response)
      
      if (response.data.success) {
        // Update local state
        const updatedInventory = inventory.map((item) => 
          item.id === id ? { ...item, status: "received" as const } : item
        )
        setInventory(updatedInventory)
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
      const quantity = Number.parseFloat(editFormData.quantity)
      const unitPrice = Number.parseFloat(editFormData.unitPrice)
      
      console.log("Updating inventory item:", editingItem.id, { quantity, unitPrice })
      
      // Update in database
      const response = await inventoryAPI.updateItem(editingItem.id, {
        quantity,
        unitPrice
      })
      
      console.log("Inventory update response:", response)
      
      if (response.data.success) {
        // Update local state with response data
        const updatedItem = response.data.data
        const updatedInventory = inventory.map((item) =>
          item.id === editingItem.id ? updatedItem : item
        )
        
        setInventory(updatedInventory)
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold" style={{ color: "#2B3068" }}>
          Inventory Management
        </h1>
        <p className="text-gray-600">Track your inventory and receive purchase orders</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending">Pending Inventory ({pendingItems.length})</TabsTrigger>
          <TabsTrigger value="received">Received Inventory ({receivedItems.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2" style={{ color: "#2B3068" }}>
                <Package className="w-5 h-5" />
                Pending Inventory
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Purchase Date</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Total Amount (AED)</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.poNumber}</TableCell>
                      <TableCell>{item.productName}</TableCell>
                      <TableCell>{item.supplierName}</TableCell>
                      <TableCell>{new Date(item.purchaseDate).toLocaleDateString()}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>AED {item.totalAmount.toFixed(2)}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => handleReceiveInventory(item.id)}
                          style={{ backgroundColor: "#2B3068" }}
                          className="hover:opacity-90"
                        >
                          Accept
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {pendingItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-gray-500">
                        No pending inventory items
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="received">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2" style={{ color: "#2B3068" }}>
                <Package className="w-5 h-5" />
                Received Inventory
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Purchase Date</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Total Amount (AED)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receivedItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.poNumber}</TableCell>
                      <TableCell>{item.productName}</TableCell>
                      <TableCell>{item.supplierName}</TableCell>
                      <TableCell>{new Date(item.purchaseDate).toLocaleDateString()}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>AED {item.totalAmount.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          Received
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          style={{ borderColor: "#2B3068", color: "#2B3068" }}
                          className="hover:bg-slate-50"
                          onClick={() => handleEditInventory(item)}
                        >
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {receivedItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-gray-500">
                        No received inventory items
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Inventory Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ color: "#2B3068" }}>
              <Edit className="w-5 h-5" />
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
                  <Label htmlFor="edit-quantity">Quantity</Label>
                  <Input
                    id="edit-quantity"
                    type="number"
                    value={editFormData.quantity}
                    onChange={(e) => setEditFormData({ ...editFormData, quantity: e.target.value })}
                    min="1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-unitPrice">Unit Price (AED)</Label>
                  <Input
                    id="edit-unitPrice"
                    type="number"
                    step="0.01"
                    value={editFormData.unitPrice}
                    onChange={(e) => setEditFormData({ ...editFormData, unitPrice: e.target.value })}
                    min="0.01"
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
              
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleSaveEdit}
                  style={{ backgroundColor: "#2B3068" }}
                  className="flex-1 hover:opacity-90"
                  disabled={!editFormData.quantity || !editFormData.unitPrice}
                >
                  Save Changes
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancelEdit}
                  className="flex-1"
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
