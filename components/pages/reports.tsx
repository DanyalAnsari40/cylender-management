"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { DollarSign, Users, Fuel, Cylinder, UserCheck, ChevronDown, ChevronRight, Eye, Activity, Loader2, Receipt, FileText } from "lucide-react"
import { reportsAPI } from "@/lib/api"
import { SignatureDialog } from "@/components/signature-dialog"
import { ReceiptDialog } from "@/components/receipt-dialog"

interface CustomerLedgerData {
  _id: string
  name: string
  trNumber: string
  phone: string
  email: string
  address: string
  balance: number
  totalDebit: number
  totalCredit: number
  status: 'pending' | 'cleared' | 'overdue' | 'error'
  totalSales: number
  totalSalesAmount: number
  totalPaidAmount: number
  totalCylinderAmount: number
  totalDeposits: number
  totalRefills: number
  totalReturns: number
  hasRecentActivity: boolean
  lastTransactionDate: string | null
  recentSales: any[]
  recentCylinderTransactions: any[]
  error?: string
}

export function Reports() {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalEmployees: 0,
    gasSales: 0,
    cylinderRefills: 0,
    totalCustomers: 0,
    totalCombinedRevenue: 0,
    pendingCustomers: 0,
    overdueCustomers: 0,
    clearedCustomers: 0
  })

  const [filters, setFilters] = useState({
    customerName: "",
    status: "all",
    startDate: "",
    endDate: "",
  })

  const [customers, setCustomers] = useState<CustomerLedgerData[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set())
  
  // Autocomplete functionality state
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [filteredSuggestions, setFilteredSuggestions] = useState<CustomerLedgerData[]>([])

  // Receipt and signature functionality state
  const [showSignatureDialog, setShowSignatureDialog] = useState(false)
  const [pendingCustomer, setPendingCustomer] = useState<CustomerLedgerData | null>(null)
  const [customerSignature, setCustomerSignature] = useState<string>("")
  const [receiptDialogData, setReceiptDialogData] = useState<any>(null)

  // Signature dialog handlers
  const handleSignatureCancel = () => {
    setShowSignatureDialog(false)
    setPendingCustomer(null)
    setCustomerSignature("")
  }

  const handleSignatureComplete = (signature: string) => {
    console.log('Reports - Signature received:', signature)
    console.log('Reports - Signature length:', signature?.length)
    console.log('Reports - Pending customer:', pendingCustomer?.name)
    
    // Set signature state for future use
    setCustomerSignature(signature)
    setShowSignatureDialog(false)
    
    // Directly open receipt dialog with the pending customer and signature embedded
    if (pendingCustomer) {
      console.log('Reports - Opening receipt dialog with signature embedded')
      
      // Create detailed items array with all customer statement information
      const items = []
      
      // Add financial summary items
      if (pendingCustomer.totalSalesAmount > 0) {
        items.push({
          product: { name: "Gas Sales Total", price: pendingCustomer.totalSalesAmount },
          quantity: pendingCustomer.totalSales,
          price: pendingCustomer.totalSalesAmount / pendingCustomer.totalSales || 0,
          total: pendingCustomer.totalSalesAmount
        })
      }
      
      if (pendingCustomer.totalCylinderAmount > 0) {
        items.push({
          product: { name: "Cylinder Transactions Total", price: pendingCustomer.totalCylinderAmount },
          quantity: pendingCustomer.totalDeposits + pendingCustomer.totalRefills + pendingCustomer.totalReturns,
          price: pendingCustomer.totalCylinderAmount / (pendingCustomer.totalDeposits + pendingCustomer.totalRefills + pendingCustomer.totalReturns) || 0,
          total: pendingCustomer.totalCylinderAmount
        })
      }
      
      // Add recent sales as individual items
      if (pendingCustomer.recentSales && pendingCustomer.recentSales.length > 0) {
        pendingCustomer.recentSales.forEach((sale: any, index: number) => {
          items.push({
            product: { 
              name: `Sale #${sale.invoiceNumber || `${index + 1}`}`, 
              price: sale.totalAmount || 0 
            },
            quantity: 1,
            price: sale.totalAmount || 0,
            total: sale.totalAmount || 0
          })
        })
      }
      
      // Add recent cylinder transactions as individual items
      if (pendingCustomer.recentCylinderTransactions && pendingCustomer.recentCylinderTransactions.length > 0) {
        pendingCustomer.recentCylinderTransactions.forEach((transaction: any, index: number) => {
          items.push({
            product: { 
              name: `${transaction.type || 'Transaction'} - ${transaction.cylinderSize || 'Unknown'}kg`, 
              price: transaction.amount || 0 
            },
            quantity: transaction.quantity || 1,
            price: transaction.amount || 0,
            total: transaction.amount || 0
          })
        })
      }
      
      // Add balance summary items
      if (pendingCustomer.totalDebit > 0) {
        items.push({
          product: { name: "Total Debit", price: pendingCustomer.totalDebit },
          quantity: 1,
          price: pendingCustomer.totalDebit,
          total: pendingCustomer.totalDebit
        })
      }
      
      if (pendingCustomer.totalCredit > 0) {
        items.push({
          product: { name: "Total Credit", price: -pendingCustomer.totalCredit },
          quantity: 1,
          price: -pendingCustomer.totalCredit,
          total: -pendingCustomer.totalCredit
        })
      }
      
      // If no items, add a placeholder
      if (items.length === 0) {
        items.push({
          product: { name: "Account Statement", price: pendingCustomer.balance },
          quantity: 1,
          price: pendingCustomer.balance,
          total: pendingCustomer.balance
        })
      }
      
      const mockSale = {
        _id: pendingCustomer._id,
        invoiceNumber: `STATEMENT-${pendingCustomer.trNumber}`,
        customer: {
          name: pendingCustomer.name,
          phone: pendingCustomer.phone,
          address: pendingCustomer.address
        },
        items: items,
        totalAmount: pendingCustomer.balance,
        paymentMethod: "Account Statement",
        paymentStatus: pendingCustomer.status,
        createdAt: pendingCustomer.lastTransactionDate || new Date().toISOString(),
        customerSignature: signature
      }
      
      setReceiptDialogData(mockSale)
      setPendingCustomer(null)
    }
  }

  useEffect(() => {
    fetchReportsData()
  }, [])

  const fetchReportsData = async () => {
    try {
      setLoading(true)
      const [statsResponse] = await Promise.all([
        reportsAPI.getStats()
      ])

      if (statsResponse.data.success) {
        const statsData = statsResponse.data.data
        setStats({
          totalRevenue: statsData.totalRevenue || 0,
          totalEmployees: statsData.totalEmployees || 0,
          gasSales: statsData.gasSales || 0,
          cylinderRefills: statsData.cylinderRefills || 0,
          totalCustomers: statsData.totalCustomers || 0,
          totalCombinedRevenue: statsData.totalCombinedRevenue || 0,
          pendingCustomers: statsData.pendingCustomers || 0,
          overdueCustomers: statsData.overdueCustomers || 0,
          clearedCustomers: statsData.clearedCustomers || 0
        })
      }

      // Fetch initial ledger data
      await fetchLedgerData()
    } catch (error) {
      console.error("Failed to fetch report data:", error)
      setLoading(false)
    }
  }

  const fetchLedgerData = async () => {
    try {
      const params = new URLSearchParams()
      if (filters.customerName) params.append('customerName', filters.customerName)
      if (filters.status !== 'all') params.append('status', filters.status)
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)

      const response = await fetch(`/api/reports/ledger?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        setCustomers(data.data)
      } else {
        console.error('Ledger API error:', data.error)
      }
    } catch (error) {
      console.error("Failed to fetch ledger data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleFilter = async () => {
    setLoading(true)
    await fetchLedgerData()
  }

  // Autocomplete functionality
  const handleCustomerNameChange = (value: string) => {
    setFilters({ ...filters, customerName: value })
    
    if (value.trim().length > 0) {
      const filtered = customers.filter(customer => 
        customer.name.toLowerCase().includes(value.toLowerCase()) ||
        customer.trNumber.toLowerCase().includes(value.toLowerCase()) ||
        customer.phone.includes(value)
      ).slice(0, 5) // Limit to 5 suggestions
      
      setFilteredSuggestions(filtered)
      setShowSuggestions(true)
    } else {
      setShowSuggestions(false)
      setFilteredSuggestions([])
    }
  }

  const handleSuggestionClick = (customer: CustomerLedgerData) => {
    setFilters({ ...filters, customerName: customer.name })
    setShowSuggestions(false)
    setFilteredSuggestions([])
  }

  const handleInputBlur = () => {
    // Delay hiding suggestions to allow click events
    setTimeout(() => {
      setShowSuggestions(false)
    }, 200)
  }

  const handleInputFocus = () => {
    if (filters.customerName.trim().length > 0 && filteredSuggestions.length > 0) {
      setShowSuggestions(true)
    }
  }

  const toggleCustomerExpansion = (customerId: string) => {
    const newExpanded = new Set(expandedCustomers)
    if (newExpanded.has(customerId)) {
      newExpanded.delete(customerId)
    } else {
      newExpanded.add(customerId)
    }
    setExpandedCustomers(newExpanded)
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'secondary' as const, className: 'bg-yellow-500 hover:bg-yellow-600 text-white', label: 'Pending' },
      cleared: { variant: 'default' as const, className: 'bg-green-500 hover:bg-green-600 text-white', label: 'Cleared' },
      overdue: { variant: 'destructive' as const, className: 'bg-red-500 hover:bg-red-600 text-white', label: 'Overdue' },
      error: { variant: 'destructive' as const, className: 'bg-gray-500 hover:bg-gray-600 text-white', label: 'Error' }
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.error
    
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED'
    }).format(amount)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString()
  }

  const resetFilters = () => {
    setFilters({
      customerName: "",
      status: "all",
      startDate: "",
      endDate: "",
    })
    // Trigger refetch with cleared filters
    setTimeout(() => fetchLedgerData(), 100)
  }

  const handleReceiptClick = (customer: CustomerLedgerData) => {
    if (!customerSignature) {
      // No signature yet - show signature dialog first
      setPendingCustomer(customer)
      setShowSignatureDialog(true)
    } else {
      // Signature already exists - show receipt directly with existing signature
      // Create detailed items array with all customer statement information
      const items = []
      
      // Add financial summary items
      if (customer.totalSalesAmount > 0) {
        items.push({
          product: { name: "Gas Sales Total", price: customer.totalSalesAmount },
          quantity: customer.totalSales,
          price: customer.totalSalesAmount / customer.totalSales || 0,
          total: customer.totalSalesAmount
        })
      }
      
      if (customer.totalCylinderAmount > 0) {
        items.push({
          product: { name: "Cylinder Transactions Total", price: customer.totalCylinderAmount },
          quantity: customer.totalDeposits + customer.totalRefills + customer.totalReturns,
          price: customer.totalCylinderAmount / (customer.totalDeposits + customer.totalRefills + customer.totalReturns) || 0,
          total: customer.totalCylinderAmount
        })
      }
      
      // Add recent sales as individual items
      if (customer.recentSales && customer.recentSales.length > 0) {
        customer.recentSales.forEach((sale: any, index: number) => {
          items.push({
            product: { 
              name: `Sale #${sale.invoiceNumber || `${index + 1}`}`, 
              price: sale.totalAmount || 0 
            },
            quantity: 1,
            price: sale.totalAmount || 0,
            total: sale.totalAmount || 0
          })
        })
      }
      
      // Add recent cylinder transactions as individual items
      if (customer.recentCylinderTransactions && customer.recentCylinderTransactions.length > 0) {
        customer.recentCylinderTransactions.forEach((transaction: any, index: number) => {
          items.push({
            product: { 
              name: `${transaction.type || 'Transaction'} - ${transaction.cylinderSize || 'Unknown'}kg`, 
              price: transaction.amount || 0 
            },
            quantity: transaction.quantity || 1,
            price: transaction.amount || 0,
            total: transaction.amount || 0
          })
        })
      }
      
      // Add balance summary items
      if (customer.totalDebit > 0) {
        items.push({
          product: { name: "Total Debit", price: customer.totalDebit },
          quantity: 1,
          price: customer.totalDebit,
          total: customer.totalDebit
        })
      }
      
      if (customer.totalCredit > 0) {
        items.push({
          product: { name: "Total Credit", price: -customer.totalCredit },
          quantity: 1,
          price: -customer.totalCredit,
          total: -customer.totalCredit
        })
      }
      
      // If no items, add a placeholder
      if (items.length === 0) {
        items.push({
          product: { name: "Account Statement", price: customer.balance },
          quantity: 1,
          price: customer.balance,
          total: customer.balance
        })
      }
      
      const mockSale = {
        _id: customer._id,
        invoiceNumber: `STATEMENT-${customer.trNumber}`,
        customer: {
          name: customer.name,
          phone: customer.phone,
          address: customer.address
        },
        items: items,
        totalAmount: customer.balance,
        paymentMethod: "Account Statement",
        paymentStatus: customer.status,
        createdAt: customer.lastTransactionDate || new Date().toISOString(),
        customerSignature: customerSignature
      }
      
      setReceiptDialogData(mockSale)
    }
  }

  const reportCards = [
    {
      title: "Total Revenue",
      value: formatCurrency(stats.totalRevenue),
      icon: DollarSign,
      color: "#2B3068",
    },
    {
      title: "Total Customers",
      value: stats.totalCustomers.toLocaleString(),
      icon: Users,
      color: "#2B3068",
    },
    {
      title: "Gas Sales",
      value: stats.gasSales.toLocaleString(),
      icon: Fuel,
      color: "#2B3068",
    },
    {
      title: "Cylinder Refills",
      value: stats.cylinderRefills.toLocaleString(),
      icon: Cylinder,
      color: "#2B3068",
    },
    {
      title: "Total Employees",
      value: stats.totalEmployees.toLocaleString(),
      icon: UserCheck,
      color: "#2B3068",
    },
  ]

  if (loading && customers.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading reports data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="pt-16 lg:pt-0 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#2B3068] to-[#1a1f4a] rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 text-white">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 flex items-center gap-3">
          <FileText className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10" />
          Reports & Analytics
        </h1>
        <p className="text-white/80 text-sm sm:text-base lg:text-lg">Comprehensive business insights and customer ledger</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {reportCards.map((card, index) => (
          <Card key={index}>
            <CardContent className="flex items-center p-6">
              <card.icon className="h-8 w-8 mr-4" style={{ color: card.color }} />
              <div>
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                <div className="text-2xl font-bold" style={{ color: card.color }}>
                  {card.value}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Enhanced Customer Ledger */}
      <Card>
        <CardHeader>
          <CardTitle style={{ color: "#2B3068" }}>Enhanced Customer Ledger</CardTitle>
          <p className="text-sm text-gray-600">
            Comprehensive view of all customer transactions including gas sales, cylinder management, and financial history
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2 relative">
              <Label htmlFor="customerName">Customer Name</Label>
              <Input
                id="customerName"
                placeholder="Search by name, TR number, or phone..."
                value={filters.customerName}
                onChange={(e) => handleCustomerNameChange(e.target.value)}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                className="pr-10"
              />
              {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {filteredSuggestions.map((customer) => (
                    <div
                      key={customer._id}
                      className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      onClick={() => handleSuggestionClick(customer)}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">{customer.name}</span>
                        <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                          <span>TR: {customer.trNumber}</span>
                          <span>Phone: {customer.phone}</span>
                          <span className="ml-auto">
                            {getStatusBadge(customer.status)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="cleared">Cleared</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>
          </div>

          <div className="flex space-x-2">
            <Button onClick={handleFilter} style={{ backgroundColor: "#2B3068" }} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Apply Filters
            </Button>
            <Button onClick={resetFilters} variant="outline">
              Reset
            </Button>
          </div>

          {/* Customer Ledger Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead></TableHead>
                  <TableHead>Customer Name</TableHead>
                  <TableHead>TR Number</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Total Sales</TableHead>
                  <TableHead>Cylinder Transactions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <React.Fragment key={customer._id}>
                    <TableRow className="cursor-pointer hover:bg-gray-50">
                      <TableCell className="p-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleCustomerExpansion(customer._id)}
                          className="p-0 h-auto"
                        >
                          {expandedCustomers.has(customer._id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell>{customer.trNumber}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{customer.phone}</div>
                          <div className="text-gray-500">{customer.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={`font-semibold ${customer.balance > 0 ? 'text-red-600' : customer.balance < 0 ? 'text-orange-600' : 'text-green-600'}`}>
                          {formatCurrency(customer.balance)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{customer.totalSales} sales</div>
                          <div className="text-gray-500">{formatCurrency(customer.totalSalesAmount)}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{customer.totalDeposits + customer.totalRefills + customer.totalReturns} transactions</div>
                          <div className="text-gray-500">{formatCurrency(customer.totalCylinderAmount)}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(customer.status)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDate(customer.lastTransactionDate)}
                          {customer.hasRecentActivity && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              <Activity className="w-3 h-3 mr-1" />
                              Recent
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReceiptClick(customer)}
                          className="flex items-center gap-2"
                        >
                          <Receipt className="h-4 w-4" />
                          Receipt
                        </Button>
                      </TableCell>
                    </TableRow>
                    
                    {/* Expanded Details */}
                    {expandedCustomers.has(customer._id) && (
                      <TableRow>
                        <TableCell colSpan={10} className="bg-gray-50 p-6">
                          <Tabs defaultValue="all" className="w-full">
                            <TabsList className="grid w-full grid-cols-4">
                              <TabsTrigger value="all">All Transactions ({(customer.recentSales?.length || 0) + (customer.recentCylinderTransactions?.length || 0)})</TabsTrigger>
                              <TabsTrigger value="sales">Gas Sales ({customer.recentSales?.length || 0})</TabsTrigger>
                              <TabsTrigger value="cylinders">Cylinder Mgmt ({customer.recentCylinderTransactions?.length || 0})</TabsTrigger>
                              <TabsTrigger value="summary">Summary</TabsTrigger>
                            </TabsList>
                            
                            <TabsContent value="all" className="mt-4">
                              {/* Combined transactions view */}
                              {(() => {
                                const allTransactions = [
                                  ...(customer.recentSales || []).map(sale => ({
                                    ...sale,
                                    type: 'gas_sale',
                                    displayType: 'Gas Sale',
                                    amount: sale.totalAmount,
                                    description: `Invoice #${sale.invoiceNumber}`,
                                    status: sale.amountPaid >= sale.totalAmount ? 'paid' : 'pending'
                                  })),
                                  ...(customer.recentCylinderTransactions || []).map(transaction => ({
                                    ...transaction,
                                    type: 'cylinder',
                                    displayType: `Cylinder ${transaction.type}`,
                                    description: `${transaction.cylinderSize} (${transaction.quantity}x)`,
                                    amount: transaction.amount
                                  }))
                                ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                                
                                return allTransactions.length > 0 ? (
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Status</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {allTransactions.map((transaction, index) => (
                                        <TableRow key={`${transaction.type}-${transaction._id}-${index}`}>
                                          <TableCell>
                                            <Badge 
                                              variant={transaction.type === 'gas_sale' ? 'default' : 'outline'}
                                              className={transaction.type === 'gas_sale' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}
                                            >
                                              {transaction.displayType}
                                            </Badge>
                                          </TableCell>
                                          <TableCell>{formatDate(transaction.createdAt)}</TableCell>
                                          <TableCell>{transaction.description}</TableCell>
                                          <TableCell>{formatCurrency(transaction.amount)}</TableCell>
                                          <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                ) : (
                                  <p className="text-gray-500 text-center py-4">No transactions found</p>
                                )
                              })()
                              }
                            </TabsContent>
                            
                            <TabsContent value="sales" className="mt-4">
                              {customer.recentSales && customer.recentSales.length > 0 ? (
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Invoice #</TableHead>
                                      <TableHead>Date</TableHead>
                                      <TableHead>Total Amount</TableHead>
                                      <TableHead>Amount Paid</TableHead>
                                      <TableHead>Items</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {customer.recentSales.map((sale) => (
                                      <TableRow key={sale._id}>
                                        <TableCell className="font-mono">{sale.invoiceNumber}</TableCell>
                                        <TableCell>{formatDate(sale.createdAt)}</TableCell>
                                        <TableCell>{formatCurrency(sale.totalAmount || 0)}</TableCell>
                                        <TableCell>{formatCurrency(sale.amountPaid || 0)}</TableCell>
                                        <TableCell>{sale.items?.length || 0} items</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              ) : (
                                <p className="text-gray-500 text-center py-4">No recent sales found</p>
                              )}
                            </TabsContent>
                            
                            <TabsContent value="cylinders" className="mt-4">
                              {customer.recentCylinderTransactions && customer.recentCylinderTransactions.length > 0 ? (
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Type</TableHead>
                                      <TableHead>Date</TableHead>
                                      <TableHead>Cylinder Size</TableHead>
                                      <TableHead>Quantity</TableHead>
                                      <TableHead>Amount</TableHead>
                                      <TableHead>Status</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {customer.recentCylinderTransactions.map((transaction) => (
                                      <TableRow key={transaction._id}>
                                        <TableCell>
                                          <Badge variant="outline" className="capitalize">
                                            {transaction.type}
                                          </Badge>
                                        </TableCell>
                                        <TableCell>{formatDate(transaction.createdAt)}</TableCell>
                                        <TableCell>{transaction.cylinderSize}</TableCell>
                                        <TableCell>{transaction.quantity}</TableCell>
                                        <TableCell>{formatCurrency(transaction.amount)}</TableCell>
                                        <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              ) : (
                                <p className="text-gray-500 text-center py-4">No recent cylinder transactions found</p>
                              )}
                            </TabsContent>
                            
                            <TabsContent value="summary" className="mt-4">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Card>
                                  <CardHeader className="pb-2">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                      <Fuel className="h-4 w-4 text-blue-600" />
                                      Gas Sales Summary
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="space-y-2 text-sm">
                                      <div className="flex justify-between">
                                        <span>Total Sales:</span>
                                        <span className="font-semibold">{customer.totalSales}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>Sales Amount:</span>
                                        <span className="font-semibold text-blue-600">{formatCurrency(customer.totalSalesAmount)}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>Amount Paid:</span>
                                        <span className="font-semibold text-green-600">{formatCurrency(customer.totalPaidAmount)}</span>
                                      </div>
                                      <div className="flex justify-between border-t pt-2">
                                        <span>Outstanding:</span>
                                        <span className={`font-semibold ${(customer.totalSalesAmount - customer.totalPaidAmount) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                          {formatCurrency(customer.totalSalesAmount - customer.totalPaidAmount)}
                                        </span>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                                
                                <Card>
                                  <CardHeader className="pb-2">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                      <Cylinder className="h-4 w-4 text-green-600" />
                                      Cylinder Management
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="space-y-2 text-sm">
                                      <div className="flex justify-between">
                                        <span>Deposits:</span>
                                        <span className="font-semibold">{customer.totalDeposits}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>Refills:</span>
                                        <span className="font-semibold">{customer.totalRefills}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>Returns:</span>
                                        <span className="font-semibold">{customer.totalReturns}</span>
                                      </div>
                                      <div className="flex justify-between border-t pt-2">
                                        <span>Total Amount:</span>
                                        <span className="font-semibold text-green-600">{formatCurrency(customer.totalCylinderAmount)}</span>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                                
                                <Card>
                                  <CardHeader className="pb-2">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                      <DollarSign className="h-4 w-4 text-purple-600" />
                                      Overall Financial Summary
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="space-y-2 text-sm">
                                      <div className="flex justify-between">
                                        <span>Gas Sales Revenue:</span>
                                        <span className="font-semibold text-blue-600">{formatCurrency(customer.totalSalesAmount)}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>Cylinder Revenue:</span>
                                        <span className="font-semibold text-green-600">{formatCurrency(customer.totalCylinderAmount)}</span>
                                      </div>
                                      <div className="flex justify-between border-t pt-1">
                                        <span>Total Revenue:</span>
                                        <span className="font-semibold">{formatCurrency(customer.totalSalesAmount + customer.totalCylinderAmount)}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>Total Debit:</span>
                                        <span className="font-semibold text-red-600">{formatCurrency(customer.totalDebit)}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>Total Credit:</span>
                                        <span className="font-semibold text-green-600">{formatCurrency(customer.totalCredit)}</span>
                                      </div>
                                      <div className="flex justify-between border-t pt-2">
                                        <span>Current Balance:</span>
                                        <span className={`font-bold ${customer.balance > 0 ? 'text-red-600' : customer.balance < 0 ? 'text-orange-600' : 'text-green-600'}`}>
                                          {formatCurrency(customer.balance)}
                                        </span>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              </div>
                            </TabsContent>
                          </Tabs>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
                {customers.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                      No customers found matching the current filters.
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
        customerName={pendingCustomer?.name}
      />

      {/* Receipt Dialog */}
      {receiptDialogData && (
        <ReceiptDialog
          sale={receiptDialogData}
          onClose={() => setReceiptDialogData(null)}
        />
      )}
    </div>
  )
}
