"use client"

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
import { Plus, Package, DollarSign, FileText, Trash2, Edit } from "lucide-react"
import { toast } from "sonner"

interface EmployeeGasSalesProps {
  user: { id: string; email: string; name: string }
}

interface Product {
  _id: string
  name: string
  category: string
  costPrice: number
  currentStock: number
}

interface Customer {
  _id: string
  name: string
  email: string
  phone: string
}

interface SaleItem {
  product: string
  quantity: number
  price: number
  total: number
}

interface Sale {
  _id: string
  invoiceNumber: string
  customer: Customer
  items: Array<{
    product: Product
    quantity: number
    price: number
    total: number
  }>
  totalAmount: number
  paymentMethod: string
  paymentStatus: string
  notes: string
  customerSignature: string
  createdAt: string
}

export function EmployeeGasSales({ user }: EmployeeGasSalesProps) {
  const [sales, setSales] = useState<Sale[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    customer: "",
    paymentMethod: "cash",
    paymentStatus: "cleared",
    notes: "",
    customerSignature: ""
  })

  const [items, setItems] = useState<SaleItem[]>([])
  const [currentItem, setCurrentItem] = useState({
    product: "",
    quantity: 1
  })

  // Customer search state
  const [customerSearch, setCustomerSearch] = useState("")
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false)
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])

  useEffect(() => {
    fetchData()
  }, [user.id])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [salesResponse, productsResponse, customersResponse] = await Promise.all([
        fetch(`/api/employee-sales?employeeId=${user.id}`),
        fetch("/api/products"),
        fetch("/api/customers")
      ])

      if (salesResponse.ok) {
        const salesData = await salesResponse.json()
        setSales(Array.isArray(salesData) ? salesData : [])
      } else {
        console.error("Failed to fetch sales:", salesResponse.status)
        setSales([])
      }

      if (productsResponse.ok) {
        const productsData = await productsResponse.json()
        // Filter only gas products
        const gasProducts = Array.isArray(productsData) ? productsData.filter((p: Product) => p.category === "gas") : []
        setProducts(gasProducts)
      } else {
        console.error("Failed to fetch products:", productsResponse.status)
        setProducts([])
      }

      if (customersResponse.ok) {
        const customersData = await customersResponse.json()
        // API returns { data: customers }, so extract the data property
        const customers = customersData.data || customersData
        setCustomers(Array.isArray(customers) ? customers : [])
      } else {
        console.error("Failed to fetch customers:", customersResponse.status)
        setCustomers([])
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error("Failed to fetch data")
      // Set default empty arrays on error
      setSales([])
      setProducts([])
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }

  const addItem = () => {
    if (!currentItem.product || currentItem.quantity <= 0) {
      toast.error("Please select a product and enter valid quantity")
      return
    }

    const product = products.find(p => p._id === currentItem.product)
    if (!product) {
      toast.error("Product not found")
      return
    }

    if (product.currentStock < currentItem.quantity) {
      toast.error(`Insufficient stock. Available: ${product.currentStock}`)
      return
    }

    const total = product.costPrice * currentItem.quantity
    const newItem: SaleItem = {
      product: currentItem.product,
      quantity: currentItem.quantity,
      price: product.costPrice,
      total
    }

    setItems([...items, newItem])
    setCurrentItem({ product: "", quantity: 1 })
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.total, 0)
  }

  const resetForm = () => {
    setFormData({
      customer: "",
      paymentMethod: "cash",
      paymentStatus: "cleared",
      notes: "",
      customerSignature: ""
    })
    setItems([])
    setCurrentItem({ product: "", quantity: 1 })
    setCustomerSearch("")
    setShowCustomerSuggestions(false)
    setFilteredCustomers([])
  }

  // Customer search functions
  const handleCustomerSearchChange = (value: string) => {
    setCustomerSearch(value)
    
    if (value.trim().length > 0) {
      const filtered = customers.filter(customer => 
        customer.name.toLowerCase().includes(value.toLowerCase()) ||
        customer.email.toLowerCase().includes(value.toLowerCase()) ||
        customer.phone.toLowerCase().includes(value.toLowerCase())
      )
      setFilteredCustomers(filtered)
      setShowCustomerSuggestions(filtered.length > 0)
    } else {
      setFilteredCustomers([])
      setShowCustomerSuggestions(false)
    }
  }

  const handleCustomerSuggestionClick = (customer: Customer) => {
    setFormData({...formData, customer: customer._id})
    setCustomerSearch(customer.name)
    setShowCustomerSuggestions(false)
    setFilteredCustomers([])
  }

  const handleCustomerInputFocus = () => {
    if (customerSearch.trim().length > 0 && filteredCustomers.length > 0) {
      setShowCustomerSuggestions(true)
    }
  }

  const handleCustomerInputBlur = () => {
    // Delay hiding suggestions to allow click events
    setTimeout(() => {
      setShowCustomerSuggestions(false)
    }, 200)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.customer || items.length === 0) {
      toast.error("Please select a customer and add at least one item")
      return
    }

    try {
      const saleData = {
        employeeId: user.id,
        customer: formData.customer,
        items,
        totalAmount: calculateTotal(),
        paymentMethod: formData.paymentMethod,
        paymentStatus: formData.paymentStatus,
        notes: formData.notes,
        customerSignature: formData.customerSignature
      }

      const response = await fetch("/api/employee-sales", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(saleData),
      })

      if (response.ok) {
        toast.success("Sale created successfully!")
        resetForm()
        setIsDialogOpen(false)
        fetchData()
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || "Failed to create sale")
      }
    } catch (error) {
      console.error("Error creating sale:", error)
      toast.error("Failed to create sale")
    }
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

  if (loading) {
    return <div className="p-6">Loading...</div>
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#2B3068]">Gas Sales</h1>
          <p className="text-gray-600 text-sm sm:text-base">Manage your gas sales transactions</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto bg-[#2B3068] hover:bg-[#1a1f4a] text-white">
              <Plus className="w-4 h-4 mr-2" />
              New Sale
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-[800px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Gas Sale</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Customer Selection with Autocomplete */}
              <div className="space-y-2 relative">
                <Label htmlFor="customer">Customer *</Label>
                <Input
                  id="customer"
                  placeholder="Search by name, email, or phone..."
                  value={customerSearch}
                  onChange={(e) => handleCustomerSearchChange(e.target.value)}
                  onFocus={handleCustomerInputFocus}
                  onBlur={handleCustomerInputBlur}
                  className="pr-10"
                />
                {showCustomerSuggestions && filteredCustomers.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredCustomers.map((customer) => (
                      <div
                        key={customer._id}
                        className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        onClick={() => handleCustomerSuggestionClick(customer)}
                      >
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">{customer.name}</span>
                          <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                            <span>Email: {customer.email}</span>
                            <span>Phone: {customer.phone}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Items Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Add Products</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Product</Label>
                    <Select value={currentItem.product} onValueChange={(value) => setCurrentItem({...currentItem, product: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product._id} value={product._id}>
                            {product.name} (Stock: {product.currentStock})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      value={currentItem.quantity}
                      onChange={(e) => setCurrentItem({...currentItem, quantity: parseInt(e.target.value) || 1})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Price (Auto-fetched)</Label>
                    <Input
                      value={currentItem.product ? `AED ${products.find(p => p._id === currentItem.product)?.costPrice || 0}` : "Select product"}
                      disabled
                    />
                  </div>
                </div>
                <Button type="button" onClick={addItem} className="w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </div>

              {/* Items List */}
              {items.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Items</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Qty</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item, index) => {
                          const product = products.find(p => p._id === item.product)
                          return (
                            <TableRow key={index}>
                              <TableCell>{product?.name}</TableCell>
                              <TableCell>{item.quantity}</TableCell>
                              <TableCell>AED {item.price}</TableCell>
                              <TableCell>AED {item.total}</TableCell>
                              <TableCell>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeItem(index)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                        <TableRow>
                          <TableCell colSpan={3} className="font-semibold">Total</TableCell>
                          <TableCell className="font-semibold">AED {calculateTotal()}</TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Payment Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select value={formData.paymentMethod} onValueChange={(value) => setFormData({...formData, paymentMethod: value})}>
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
                <div className="space-y-2">
                  <Label>Payment Status</Label>
                  <Select value={formData.paymentStatus} onValueChange={(value) => setFormData({...formData, paymentStatus: value})}>
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
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Additional notes..."
                />
              </div>

              {/* Customer Signature */}
              <div className="space-y-2">
                <Label>Customer Signature</Label>
                <Input
                  value={formData.customerSignature}
                  onChange={(e) => setFormData({...formData, customerSignature: e.target.value})}
                  placeholder="Customer signature or acknowledgment"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-4">
                <Button type="submit" className="flex-1 bg-[#2B3068] hover:bg-[#1a1f4a]">
                  Create Sale
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Sales</p>
                <p className="text-2xl font-bold text-[#2B3068]">{sales.length}</p>
              </div>
              <FileText className="w-8 h-8 text-[#2B3068]" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">
                  AED {sales.reduce((sum, sale) => sum + sale.totalAmount, 0).toFixed(2)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Payments</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {sales.filter(sale => sale.paymentStatus === "pending").length}
                </p>
              </div>
              <Package className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overdue Payments</p>
                <p className="text-2xl font-bold text-red-600">
                  {sales.filter(sale => sale.paymentStatus === "overdue").length}
                </p>
              </div>
              <Package className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales Table */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-[#2B3068] to-[#1a1f4a] text-white rounded-t-lg">
          <CardTitle>Recent Sales</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale) => (
                  <TableRow key={sale._id}>
                    <TableCell className="font-medium">{sale.invoiceNumber}</TableCell>
                    <TableCell>{sale.customer.name}</TableCell>
                    <TableCell>{sale.items.length} items</TableCell>
                    <TableCell>AED {sale.totalAmount.toFixed(2)}</TableCell>
                    <TableCell className="capitalize">{sale.paymentMethod}</TableCell>
                    <TableCell>{getPaymentStatusBadge(sale.paymentStatus)}</TableCell>
                    <TableCell>{new Date(sale.createdAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
                {sales.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                      No sales found. Create your first sale to get started.
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
