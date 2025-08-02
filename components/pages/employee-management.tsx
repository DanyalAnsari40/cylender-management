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
import { Plus, Edit, Trash2, Search, Filter, UserCheck, Eye, EyeOff, CheckCircle } from "lucide-react"
import { employeesAPI, productsAPI, stockAssignmentsAPI } from "@/lib/api"

interface Employee {
  _id: string
  name: string
  email: string
  phone: string
  address: string
  position: string
  salary: number
  hireDate: string
  status: "active" | "inactive"
  password?: string
  debitAmount: number
  creditAmount: number
  createdAt: string
  updatedAt: string
}

interface Product {
  _id: string
  name: string
  category: string
  price: number
  stock: number
}

interface EmployeeManagementProps {
  user: { id: string; email: string; role: "admin" | "employee"; name: string }
}

export function EmployeeManagement({ user }: EmployeeManagementProps) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isStockDialogOpen, setIsStockDialogOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({})
  const [stockAssignments, setStockAssignments] = useState<any[]>([])
  const [notification, setNotification] = useState<{ message: string; visible: boolean }>({ message: "", visible: false })

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    status: "active" as "active" | "inactive",
    password: "",
  })

  // Stock assignment form state
  const [stockFormData, setStockFormData] = useState({
    productId: "",
    quantity: 1,
    notes: "",
  })

  useEffect(() => {
    fetchData()
    fetchStockAssignments()
    
    // Poll for notifications every 5 seconds
    const notificationInterval = setInterval(() => {
      checkForNewNotifications()
    }, 5000)
    
    return () => clearInterval(notificationInterval)
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [employeesResponse, productsResponse] = await Promise.all([employeesAPI.getAll(), productsAPI.getAll()])

      setEmployees(employeesResponse.data || [])
      setProducts(productsResponse.data || [])
    } catch (error) {
      console.error("Failed to fetch data:", error)
      setEmployees([])
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  const fetchStockAssignments = async () => {
    try {
      const response = await stockAssignmentsAPI.getAll()
      setStockAssignments(response.data || [])
    } catch (error) {
      console.error('Failed to fetch stock assignments:', error)
      setStockAssignments([])
    }
  }

  const checkForNewNotifications = async () => {
    try {
      const response = await fetch('/api/notifications?userId=' + user.id + '&type=stock_returned&unread=true')
      if (response.ok) {
        const data = await response.json()
        if (data.length > 0) {
          const latestNotification = data[0]
          showNotification(`Stock returned by ${latestNotification.sender?.name || 'Employee'}: ${latestNotification.message}`)
          // Mark notification as read
          await fetch(`/api/notifications/${latestNotification._id}/read`, { method: 'PUT' })
          // Refresh stock assignments to show updated data
          fetchStockAssignments()
        }
      }
    } catch (error) {
      console.error('Failed to check notifications:', error)
    }
  }

  const showNotification = (message: string) => {
    setNotification({ message, visible: true })
    setTimeout(() => {
      setNotification({ message: "", visible: false })
    }, 5000)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const employeeData = {
        ...formData,
      }

      if (editingEmployee) {
        await employeesAPI.update(editingEmployee._id, employeeData)
      } else {
        await employeesAPI.create(employeeData)
      }

      await fetchData()
      resetForm()
      setIsDialogOpen(false)
    } catch (error: any) {
      console.error("Failed to save employee:", error)
      alert(error.response?.data?.error || "Failed to save employee")
    }
  }

  const handleStockAssignment = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (!selectedEmployee) return

      const assignmentData = {
        employee: selectedEmployee._id,
        product: stockFormData.productId,
        quantity: stockFormData.quantity,
        assignedBy: user.id,
        notes: stockFormData.notes,
      }

      await stockAssignmentsAPI.create(assignmentData)

      // Reset form and close dialog
      setStockFormData({
        productId: "",
        quantity: 1,
        notes: "",
      })
      setIsStockDialogOpen(false)
      setSelectedEmployee(null)

      // Refresh both employee data and stock assignments
      await fetchData()
      await fetchStockAssignments()
    } catch (error: any) {
      console.error("Failed to assign stock:", error)
      alert(error.response?.data?.error || "Failed to assign stock")
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      address: "",
      status: "active",
      password: "",
    })
    setEditingEmployee(null)
  }

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee)
    setFormData({
      name: employee.name,
      email: employee.email,
      phone: employee.phone,
      address: employee.address,
      status: employee.status,
      password: employee.password || "",
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this employee?")) {
      try {
        await employeesAPI.delete(id)
        await fetchData()
      } catch (error) {
        console.error("Failed to delete employee:", error)
        alert("Failed to delete employee")
      }
    }
  }

  const handleAssignStock = (employee: Employee) => {
    setSelectedEmployee(employee)
    setIsStockDialogOpen(true)
  }

  const togglePasswordVisibility = (employeeId: string) => {
    setShowPasswords((prev) => ({
      ...prev,
      [employeeId]: !prev[employeeId],
    }))
  }

  const filteredEmployees = employees.filter((employee) => {
    const matchesSearch =
      employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || employee.status === statusFilter
    return matchesSearch && matchesStatus
  })

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
        <h1 className="text-4xl font-bold mb-2">Employee Management</h1>
        <p className="text-white/80 text-lg">Manage employees and assign stock</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Total Employees</CardTitle>
            <UserCheck className="h-5 w-5 text-[#2B3068]" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#2B3068]">{employees.length}</div>
            <p className="text-xs text-gray-600 mt-1">All employees</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Active Employees</CardTitle>
            <UserCheck className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">
              {employees.filter((e) => e.status === "active").length}
            </div>
            <p className="text-xs text-gray-600 mt-1">Currently active</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Inactive Employees</CardTitle>
            <UserCheck className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-500">
              {employees.filter((e) => e.status === "inactive").length}
            </div>
            <p className="text-xs text-gray-600 mt-1">Currently inactive</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-100 border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Total Payroll</CardTitle>
            <UserCheck className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-500">
              ${employees.reduce((sum, e) => sum + (e.debitAmount || 0), 0).toLocaleString()}
            </div>
            <p className="text-xs text-gray-600 mt-1">Monthly total</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search employees..."
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
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="bg-[#2B3068] hover:bg-[#1a1f4a] text-white w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingEmployee ? "Edit Employee" : "Add New Employee"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: "active" | "inactive") => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Leave empty to keep current"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-[#2B3068] hover:bg-[#1a1f4a] text-white">
                  {editingEmployee ? "Update Employee" : "Add Employee"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-[#2B3068] to-[#1a1f4a] text-white rounded-t-lg">
          <CardTitle>Employee List</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="p-2 sm:p-4">Name</TableHead>
                  <TableHead className="p-2 sm:p-4">Email</TableHead>
                  <TableHead className="p-2 sm:p-4">Phone</TableHead>
                  <TableHead className="p-2 sm:p-4">Password</TableHead>
                  <TableHead className="p-2 sm:p-4">Status</TableHead>
                  <TableHead className="p-2 sm:p-4">Assigned Stock</TableHead>
                  <TableHead className="p-2 sm:p-4">Remaining Stock</TableHead>
                  <TableHead className="p-2 sm:p-4">Received Back Stock</TableHead>
                  <TableHead className="p-2 sm:p-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((employee) => {
                  const assignedStock = stockAssignments
                    .filter((a) => a.employee?._id === employee._id && a.status === "assigned")
                    .reduce((sum, a) => sum + (a.quantity || 0), 0)
                  
                  const remainingStock = stockAssignments
                    .filter((a) => a.employee?._id === employee._id && a.status === "received")
                    .reduce((sum, a) => sum + (a.quantity || 0), 0)
                  
                  const receivedBackStock = stockAssignments
                    .filter((a) => a.employee?._id === employee._id && a.status === "returned")
                    .reduce((sum, a) => sum + (a.quantity || 0), 0)
                  return (
                    <TableRow key={employee._id}>
                      <TableCell className="p-2 sm:p-4 font-medium text-xs sm:text-sm">{employee.name}</TableCell>
                      <TableCell className="p-2 sm:p-4 text-xs sm:text-sm">{employee.email}</TableCell>
                      <TableCell className="p-2 sm:p-4 text-xs sm:text-sm">{employee.phone}</TableCell>
                      <TableCell className="p-2 sm:p-4 text-xs sm:text-sm">
                        <div className="flex items-center gap-2">
                          {showPasswords[employee._id] ? employee.password || "••••••••" : "••••••••"}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => togglePasswordVisibility(employee._id)}
                            className="h-6 w-6 p-0"
                          >
                            {showPasswords[employee._id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="p-2 sm:p-4">
                        <Badge
                          variant={employee.status === "active" ? "default" : "secondary"}
                          className={
                            employee.status === "active"
                              ? "bg-green-100 text-green-800 text-xs"
                              : "bg-gray-100 text-gray-800 text-xs"
                          }
                        >
                          {employee.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="p-2 sm:p-4 text-xs sm:text-sm">{assignedStock}</TableCell>
                      <TableCell className="p-2 sm:p-4 text-xs sm:text-sm">{remainingStock}</TableCell>
                      <TableCell className="p-2 sm:p-4 text-xs sm:text-sm">{receivedBackStock}</TableCell>
                      <TableCell className="p-2 sm:p-4">
                        <div className="flex space-x-1 sm:space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAssignStock(employee)}
                            className="text-[#2B3068] border-[#2B3068] hover:bg-[#2B3068] hover:text-white text-xs p-1 sm:p-2"
                          >
                            Stock
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(employee)}
                            className="text-xs p-1 sm:p-2"
                          >
                            <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(employee._id)}
                            className="text-red-600 border-red-600 hover:bg-red-600 hover:text-white text-xs p-1 sm:p-2"
                          >
                            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {filteredEmployees.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                      No employees found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Stock Assignment Dialog */}
      <Dialog open={isStockDialogOpen} onOpenChange={setIsStockDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Stock to {selectedEmployee?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleStockAssignment} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="product">Product *</Label>
              <Select
                value={stockFormData.productId}
                onValueChange={(value) => setStockFormData({ ...stockFormData, productId: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product._id} value={product._id}>
                      {product.name} (Stock: {product.stock})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={stockFormData.quantity}
                onChange={(e) => setStockFormData({ ...stockFormData, quantity: Number.parseInt(e.target.value) || 1 })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={stockFormData.notes}
                onChange={(e) => setStockFormData({ ...stockFormData, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setIsStockDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#2B3068] hover:bg-[#1a1f4a] text-white">
                Assign Stock
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Notification Popup */}
      {notification.visible && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg max-w-md">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Stock Return Notification</span>
          </div>
          <p className="mt-1 text-sm">{notification.message}</p>
        </div>
      )}
    </div>
  )
}
