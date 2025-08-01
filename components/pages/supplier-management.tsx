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
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, Loader2, Truck } from "lucide-react"
import { suppliersAPI } from "@/lib/api"

interface Supplier {
  _id: string
  invoiceNumber: string
  companyName: string
  contactPerson: string
  phone: string
  email: string
  address: string
  trNumber: string
  status: "active" | "inactive"
}

export function SupplierManagement() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [formData, setFormData] = useState({
    invoiceNumber: "",
    companyName: "",
    contactPerson: "",
    phone: "",
    email: "",
    address: "",
    trNumber: "",
    status: "active" as "active" | "inactive",
  })

  useEffect(() => {
    fetchSuppliers()
  }, [])

  const fetchSuppliers = async () => {
    try {
      const response = await suppliersAPI.getAll()
      setSuppliers(response.data)
    } catch (error) {
      console.error("Failed to fetch suppliers:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      if (editingSupplier) {
        await suppliersAPI.update(editingSupplier._id, formData)
      } else {
        await suppliersAPI.create(formData)
      }

      await fetchSuppliers()
      resetForm()
      setIsDialogOpen(false)
    } catch (error: any) {
      alert(error.response?.data?.error || "Failed to save supplier")
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      invoiceNumber: "",
      companyName: "",
      contactPerson: "",
      phone: "",
      email: "",
      address: "",
      trNumber: "",
      status: "active",
    })
    setEditingSupplier(null)
  }

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier)
    setFormData({
      invoiceNumber: supplier.invoiceNumber,
      companyName: supplier.companyName,
      contactPerson: supplier.contactPerson,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
      trNumber: supplier.trNumber,
      status: supplier.status,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this supplier?")) {
      try {
        await suppliersAPI.delete(id)
        await fetchSuppliers()
      } catch (error: any) {
        alert(error.response?.data?.error || "Failed to delete supplier")
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-[#2B3068]" />
          <p className="text-gray-600">Loading suppliers...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 p-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-[#2B3068] to-[#1a1f4a] rounded-2xl p-8 text-white shadow-xl">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
              <Truck className="w-10 h-10" />
              Supplier Management
            </h1>
            <p className="text-white/80 text-lg">Manage your suppliers and vendors</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={resetForm}
                className="bg-white text-[#2B3068] hover:bg-white/90 font-semibold px-8 py-4 text-lg rounded-xl shadow-lg transition-all duration-300 hover:scale-105"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Supplier
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader className="pb-6">
                <DialogTitle className="text-2xl font-bold text-[#2B3068] flex items-center gap-2">
                  <Truck className="w-6 h-6" />
                  {editingSupplier ? "Edit Supplier" : "Add New Supplier"}
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="invoiceNumber" className="text-sm font-semibold text-gray-700">
                      Invoice Number
                    </Label>
                    <Input
                      id="invoiceNumber"
                      placeholder="Enter invoice number"
                      value={formData.invoiceNumber}
                      onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                      className="h-12 border-2 border-gray-200 rounded-xl focus:border-[#2B3068] transition-colors"
                      required
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="companyName" className="text-sm font-semibold text-gray-700">
                      Company Name
                    </Label>
                    <Input
                      id="companyName"
                      placeholder="Enter company name"
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      className="h-12 border-2 border-gray-200 rounded-xl focus:border-[#2B3068] transition-colors"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="contactPerson" className="text-sm font-semibold text-gray-700">
                      Contact Person
                    </Label>
                    <Input
                      id="contactPerson"
                      placeholder="Enter contact person name"
                      value={formData.contactPerson}
                      onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                      className="h-12 border-2 border-gray-200 rounded-xl focus:border-[#2B3068] transition-colors"
                      required
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="phone" className="text-sm font-semibold text-gray-700">
                      Phone
                    </Label>
                    <Input
                      id="phone"
                      placeholder="Enter phone number"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="h-12 border-2 border-gray-200 rounded-xl focus:border-[#2B3068] transition-colors"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="email" className="text-sm font-semibold text-gray-700">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter email address"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="h-12 border-2 border-gray-200 rounded-xl focus:border-[#2B3068] transition-colors"
                    required
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="address" className="text-sm font-semibold text-gray-700">
                    Address
                  </Label>
                  <Input
                    id="address"
                    placeholder="Enter full address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="h-12 border-2 border-gray-200 rounded-xl focus:border-[#2B3068] transition-colors"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="trNumber" className="text-sm font-semibold text-gray-700">
                      TR Number
                    </Label>
                    <Input
                      id="trNumber"
                      placeholder="Enter TR number"
                      value={formData.trNumber}
                      onChange={(e) => setFormData({ ...formData, trNumber: e.target.value })}
                      className="h-12 border-2 border-gray-200 rounded-xl focus:border-[#2B3068] transition-colors"
                      required
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="status" className="text-sm font-semibold text-gray-700">
                      Status
                    </Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: "active" | "inactive") => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger className="h-12 border-2 border-gray-200 rounded-xl focus:border-[#2B3068] transition-colors">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-[#2B3068] to-[#1a1f4a] hover:from-[#1a1f4a] hover:to-[#2B3068] rounded-xl shadow-lg transition-all duration-300"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      {editingSupplier ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    <>{editingSupplier ? "Update Supplier" : "Save Supplier"}</>
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Suppliers Table */}
      <Card className="border-0 shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-[#2B3068] to-[#1a1f4a] text-white p-6">
          <CardTitle className="text-2xl font-bold">Supplier List ({suppliers.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 border-b-2 border-gray-200">
                  <TableHead className="font-bold text-gray-700 p-4">Invoice #</TableHead>
                  <TableHead className="font-bold text-gray-700 p-4">Company Name</TableHead>
                  <TableHead className="font-bold text-gray-700 p-4">Contact Person</TableHead>
                  <TableHead className="font-bold text-gray-700 p-4">Phone</TableHead>
                  <TableHead className="font-bold text-gray-700 p-4">Email</TableHead>
                  <TableHead className="font-bold text-gray-700 p-4">Status</TableHead>
                  <TableHead className="font-bold text-gray-700 p-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((supplier) => (
                  <TableRow key={supplier._id} className="hover:bg-gray-50 transition-colors border-b border-gray-100">
                    <TableCell className="font-semibold text-[#2B3068] p-4">{supplier.invoiceNumber}</TableCell>
                    <TableCell className="p-4 font-medium">{supplier.companyName}</TableCell>
                    <TableCell className="p-4">{supplier.contactPerson}</TableCell>
                    <TableCell className="p-4">{supplier.phone}</TableCell>
                    <TableCell className="p-4">{supplier.email}</TableCell>
                    <TableCell className="p-4">
                      <Badge
                        variant={supplier.status === "active" ? "default" : "secondary"}
                        className={`${
                          supplier.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                        } font-medium px-3 py-1 rounded-full`}
                      >
                        {supplier.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="p-4">
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(supplier)}
                          className="border-[#2B3068] text-[#2B3068] hover:bg-[#2B3068] hover:text-white transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(supplier._id)}
                          className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {suppliers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="text-gray-500">
                        <Truck className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium">No suppliers found</p>
                        <p className="text-sm">Add your first supplier to get started</p>
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
