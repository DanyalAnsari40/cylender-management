"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Edit, Trash2, Users, Loader2, AlertCircle } from "lucide-react"
import { customersAPI } from "@/lib/api"

interface Customer {
  _id: string
  name: string
  trNumber: string
  phone: string
  email: string
  address: string
}

export function CustomerManagement() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [error, setError] = useState<string>("")
  const [formData, setFormData] = useState({
    name: "",
    trNumber: "",
    phone: "",
    email: "",
    address: "",
  })

  useEffect(() => {
    fetchCustomers()
  }, [])

  const fetchCustomers = async () => {
    try {
      setError("")
      const response = await customersAPI.getAll()
      
      console.log('Customers API Response:', response)
      console.log('Customers Response Data:', response?.data)
      
      // Handle nested data structure: response.data.data (same as other APIs)
      const customersData = Array.isArray(response?.data?.data) 
        ? response.data.data 
        : Array.isArray(response?.data) 
          ? response.data 
          : Array.isArray(response) 
            ? response 
            : []
      
      console.log('Processed customers data:', customersData)
      setCustomers(customersData)
    } catch (error: any) {
      console.error("Failed to fetch customers:", error)
      setError("Failed to load customers. Please refresh the page.")
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError("")

    try {
      // Validate form data
      if (!formData.name || !formData.trNumber || !formData.phone || !formData.email || !formData.address) {
        throw new Error("Please fill in all required fields")
      }

      if (editingCustomer) {
        await customersAPI.update(editingCustomer._id, formData)
      } else {
        await customersAPI.create(formData)
      }

      await fetchCustomers()
      resetForm()
      setIsDialogOpen(false)
    } catch (error: any) {
      console.error("Customer operation error:", error)
      setError(error.response?.data?.error || error.message || "Failed to save customer")
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      trNumber: "",
      phone: "",
      email: "",
      address: "",
    })
    setEditingCustomer(null)
    setError("")
  }

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer)
    setFormData({
      name: customer.name,
      trNumber: customer.trNumber,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this customer? This action cannot be undone.")) {
      try {
        await customersAPI.delete(id)
        await fetchCustomers()
      } catch (error: any) {
        alert(error.response?.data?.error || "Failed to delete customer")
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-[#2B3068]" />
          <p className="text-gray-600">Loading customers...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 p-6">
      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-red-700">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setError("")}
            className="ml-auto text-red-600 border-red-300"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Header Section */}
      <div className="bg-gradient-to-r from-[#2B3068] to-[#1a1f4a] rounded-2xl p-8 text-white shadow-xl">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
              <Users className="w-10 h-10" />
              Customer Management
            </h1>
            <p className="text-white/80 text-lg">Manage your customer database</p>
          </div>

          <div className="flex gap-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={resetForm}
                  className="bg-white text-[#2B3068] hover:bg-white/90 font-semibold px-8 py-4 text-lg rounded-xl shadow-lg transition-all duration-300 hover:scale-105"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add Customer
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader className="pb-6">
                  <DialogTitle className="text-2xl font-bold text-[#2B3068] flex items-center gap-2">
                    <Users className="w-6 h-6" />
                    {editingCustomer ? "Edit Customer" : "Add New Customer"}
                  </DialogTitle>
                </DialogHeader>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 mb-4">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label htmlFor="name" className="text-sm font-semibold text-gray-700">
                        Customer Name *
                      </Label>
                      <Input
                        id="name"
                        placeholder="Enter customer name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="h-12 border-2 border-gray-200 rounded-xl focus:border-[#2B3068] transition-colors"
                        required
                      />
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="trNumber" className="text-sm font-semibold text-gray-700">
                        TR Number *
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
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label htmlFor="phone" className="text-sm font-semibold text-gray-700">
                        Phone Number *
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="Enter phone number"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="h-12 border-2 border-gray-200 rounded-xl focus:border-[#2B3068] transition-colors"
                        required
                      />
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="email" className="text-sm font-semibold text-gray-700">
                        Email Address *
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
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="address" className="text-sm font-semibold text-gray-700">
                      Address *
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

                  <Button
                    type="submit"
                    className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-[#2B3068] to-[#1a1f4a] hover:from-[#1a1f4a] hover:to-[#2B3068] rounded-xl shadow-lg transition-all duration-300"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        {editingCustomer ? "Updating..." : "Adding..."}
                      </>
                    ) : (
                      <>{editingCustomer ? "Update Customer" : "Add Customer"}</>
                    )}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <Card className="border-0 shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-[#2B3068] to-[#1a1f4a] text-white p-6">
          <CardTitle className="text-2xl font-bold">Customers List ({Array.isArray(customers) ? customers.length : 0})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 border-b-2 border-gray-200">
                  <TableHead className="font-bold text-gray-700 p-4">Name</TableHead>
                  <TableHead className="font-bold text-gray-700 p-4">TR Number</TableHead>
                  <TableHead className="font-bold text-gray-700 p-4">Phone</TableHead>
                  <TableHead className="font-bold text-gray-700 p-4">Email</TableHead>
                  <TableHead className="font-bold text-gray-700 p-4">Address</TableHead>
                  <TableHead className="font-bold text-gray-700 p-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.isArray(customers) && customers.map((customer) => (
                  <TableRow key={customer._id} className="hover:bg-gray-50 transition-colors border-b border-gray-100">
                    <TableCell className="font-semibold text-[#2B3068] p-4">{customer.name}</TableCell>
                    <TableCell className="p-4">{customer.trNumber}</TableCell>
                    <TableCell className="p-4">{customer.phone}</TableCell>
                    <TableCell className="p-4">{customer.email}</TableCell>
                    <TableCell className="p-4">{customer.address}</TableCell>
                    <TableCell className="p-4">
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(customer)}
                          className="border-[#2B3068] text-[#2B3068] hover:bg-[#2B3068] hover:text-white transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(customer._id)}
                          className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!Array.isArray(customers) || customers.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <div className="text-gray-500">
                        <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium">No customers found</p>
                        <p className="text-sm">Add your first customer to get started</p>
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
