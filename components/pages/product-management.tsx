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
import { Plus, Edit, Trash2, Loader2 } from "lucide-react"
import { productsAPI } from "@/lib/api"

interface Product {
  _id: string
  name: string
  category: "gas" | "cylinder"
  cylinderSize?: "large" | "small"
  costPrice: number
  leastPrice: number
  currentStock: number
}

export function ProductManagement() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [formData, setFormData] = useState({
    name: "",
    category: "gas" as "gas" | "cylinder",
    cylinderSize: "large" as "large" | "small",
    costPrice: "",
    leastPrice: "",
  })

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const response = await productsAPI.getAll()
      setProducts(response.data)
    } catch (error) {
      console.error("Failed to fetch products:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const productData = {
        name: formData.name,
        category: formData.category,
        cylinderSize: formData.category === "cylinder" ? formData.cylinderSize : undefined,
        costPrice: Number.parseFloat(formData.costPrice),
        leastPrice: Number.parseFloat(formData.leastPrice),
        // Only set currentStock to 0 for new products, not when updating existing ones
        ...(editingProduct ? {} : { currentStock: 0 }),
      }

      if (editingProduct) {
        await productsAPI.update(editingProduct._id, productData)
      } else {
        await productsAPI.create(productData)
      }

      await fetchProducts()
      resetForm()
      setIsDialogOpen(false)
    } catch (error: any) {
      alert(error.response?.data?.error || "Failed to save product")
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      category: "gas",
      cylinderSize: "large",
      costPrice: "",
      leastPrice: "",
    })
    setEditingProduct(null)
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      category: product.category,
      cylinderSize: product.cylinderSize || "large",
      costPrice: product.costPrice.toString(),
      leastPrice: product.leastPrice.toString(),
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    setDeleting(true)
    try {
      await productsAPI.delete(id)
      await fetchProducts()
      setProductToDelete(null)
      setDeleteDialogOpen(false)
    } catch (error: any) {
      alert(error.response?.data?.error || "Failed to delete product")
    } finally {
      setDeleting(false)
    }
  }

  const openDeleteDialog = (product: Product) => {
    setProductToDelete(product)
    setDeleteDialogOpen(true)
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

  const norm = (v?: string) => (v || "").toLowerCase()
  const filteredProducts = products.filter((p) => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return true
    return (
      norm(p.name).includes(q) ||
      norm(p.category).includes(q) ||
      norm(p.cylinderSize).includes(q) ||
      String(p.currentStock ?? "").includes(q)
    )
  })

  return (
    <div className="pt-16 lg:pt-0 space-y-4 sm:space-y-6 lg:space-y-8">
      <div className="bg-gradient-to-r from-[#2B3068] to-[#1a1f4a] rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 text-white">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">Product Management</h1>
            <p className="text-white/80 text-sm sm:text-base lg:text-lg">Manage your product inventory</p>
          </div>

          <div className="w-full sm:w-auto flex-shrink-0">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    onClick={resetForm}
                    className="w-full sm:w-auto bg-white text-[#2B3068] hover:bg-white/90 font-semibold px-4 sm:px-6 lg:px-8 py-3 sm:py-4 text-sm sm:text-base lg:text-lg rounded-xl shadow-lg transition-all duration-300 hover:scale-105 min-h-[44px]"
                  >
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    Add Product
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto mx-auto">
                <DialogHeader>
                  <DialogTitle className="text-lg sm:text-xl font-bold text-[#2B3068]">
                    {editingProduct ? "Edit Product" : "Add New Product"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium">Product Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="h-11 sm:h-12 text-sm sm:text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category" className="text-sm font-medium">Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value: "gas" | "cylinder") => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger className="h-11 sm:h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gas">Gas</SelectItem>
                        <SelectItem value="cylinder">Cylinder</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.category === "cylinder" && (
                    <div className="space-y-2">
                      <Label htmlFor="cylinderSize" className="text-sm font-medium">Cylinder Size</Label>
                      <Select
                        value={formData.cylinderSize}
                        onValueChange={(value: "large" | "small") => setFormData({ ...formData, cylinderSize: value })}
                      >
                        <SelectTrigger className="h-11 sm:h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="large">Large</SelectItem>
                          <SelectItem value="small">Small</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="costPrice" className="text-sm font-medium">Cost Price (AED)</Label>
                      <Input
                        id="costPrice"
                        type="number"
                        step="0.01"
                        value={formData.costPrice}
                        onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                        required
                        className="h-11 sm:h-12 text-sm sm:text-base"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="leastPrice" className="text-sm font-medium">Least Price (AED)</Label>
                      <Input
                        id="leastPrice"
                        type="number"
                        step="0.01"
                        value={formData.leastPrice}
                        onChange={(e) => setFormData({ ...formData, leastPrice: e.target.value })}
                        required
                        className="h-11 sm:h-12 text-sm sm:text-base"
                      />
                    </div>
                  </div>



                  <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      className="w-full sm:flex-1 min-h-[44px]"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="w-full sm:flex-1 min-h-[44px]"
                      style={{ backgroundColor: "#2B3068" }}
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {editingProduct ? "Updating..." : "Creating..."}
                        </>
                      ) : (
                        <>{editingProduct ? "Update Product" : "Save Product"}</>
                      )}
                    </Button>
                  </div>
                </form>
                </DialogContent>
              </Dialog>
          </div>
        </div>
      </div>

      <Card className="border-0 shadow-xl rounded-xl sm:rounded-2xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-[#2B3068] to-[#1a1f4a] text-white p-4 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
            <CardTitle className="text-lg sm:text-xl lg:text-2xl font-bold flex-1">Product List ({filteredProducts.length}/{products.length})</CardTitle>
            <div className="bg-white rounded-xl p-2 flex items-center gap-2 w-full lg:w-80">
              <Input
                placeholder="Search product name, category, type, stock..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-10 text-gray-800"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 border-b-2 border-gray-200">
                  <TableHead className="font-bold text-gray-700 p-4">Product Name</TableHead>
                  <TableHead className="font-bold text-gray-700 p-4">Category</TableHead>
                  <TableHead className="font-bold text-gray-700 p-4">Type</TableHead>
                  <TableHead className="font-bold text-gray-700 p-4">Cost Price (AED)</TableHead>
                  <TableHead className="font-bold text-gray-700 p-4">Least Price (AED)</TableHead>
                  <TableHead className="font-bold text-gray-700 p-4">Stock</TableHead>
                  <TableHead className="font-bold text-gray-700 p-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product._id} className="hover:bg-gray-50 transition-colors border-b border-gray-100">
                    <TableCell className="font-semibold text-[#2B3068] p-4">{product.name}</TableCell>
                    <TableCell className="capitalize p-4">{product.category}</TableCell>
                    <TableCell className="p-4">{product.category === "cylinder" ? product.cylinderSize : "-"}</TableCell>
                    <TableCell className="p-4">AED {product.costPrice.toFixed(2)}</TableCell>
                    <TableCell className="p-4">AED {product.leastPrice.toFixed(2)}</TableCell>
                    <TableCell className="p-4">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          product.currentStock > 10
                            ? "bg-green-100 text-green-800"
                            : product.currentStock > 0
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                        }`}
                      >
                        {product.currentStock}
                      </span>
                    </TableCell>
                    <TableCell className="p-4">
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(product)} className="min-h-[36px]">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDeleteDialog(product)}
                          className="text-red-600 hover:text-red-700 min-h-[36px]"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredProducts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500 py-12">
                      <div className="text-gray-500">
                        <Plus className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium">No products found</p>
                        <p className="text-sm">Add your first product to get started</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden">
            {filteredProducts.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {filteredProducts.map((product) => (
                  <div key={product._id} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-[#2B3068] text-base sm:text-lg truncate">{product.name}</h3>
                          <p className="text-sm text-gray-600 capitalize">{product.category} {product.category === "cylinder" ? `(${product.cylinderSize})` : ""}</p>
                        </div>
                        <span
                          className={`px-2 py-1 rounded text-xs flex-shrink-0 ml-2 ${
                            product.currentStock > 10
                              ? "bg-green-100 text-green-800"
                              : product.currentStock > 0
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                          }`}
                        >
                          Stock: {product.currentStock}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">Cost Price:</span>
                          <span className="ml-2 text-gray-600">AED {product.costPrice.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Least Price:</span>
                          <span className="ml-2 text-gray-600">AED {product.leastPrice.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(product)}
                          className="w-full sm:w-auto border-[#2B3068] text-[#2B3068] hover:bg-[#2B3068] hover:text-white transition-colors min-h-[44px]"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDeleteDialog(product)}
                          className="w-full sm:w-auto border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-colors min-h-[44px]"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 px-4">
                <div className="text-gray-500">
                  <Plus className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-base sm:text-lg font-medium">No products found</p>
                  <p className="text-sm">Add your first product to get started</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#2B3068]">
              <Trash2 className="w-5 h-5 text-red-600" />
              Delete Product
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-700">
              Are you sure you want to delete{' '}
              <span className="font-semibold">{productToDelete?.name || 'this product'}</span>?
              {' '}This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDeleteDialogOpen(false)
                  setProductToDelete(null)
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => productToDelete && handleDelete(productToDelete._id)}
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>Delete</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
