"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Package, AlertCircle, CheckCircle, Bell } from "lucide-react"
import { stockAPI, notificationsAPI } from "@/lib/api"

interface EmployeeDashboardProps {
  user: { id: string; email: string; name: string; debitAmount?: number; creditAmount?: number }
  setUnreadCount?: (count: number) => void
}

export function EmployeeDashboard({ user, setUnreadCount }: EmployeeDashboardProps) {
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [assignedStock, setAssignedStock] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [notification, setNotification] = useState<{ message: string; visible: boolean }>({ message: "", visible: false })

  useEffect(() => {
    if (user?.id) {
      fetchEmployeeData()
      
      // Poll for notifications every 5 seconds
      const notificationInterval = setInterval(() => {
        checkForNewNotifications()
      }, 5000)
      
      return () => clearInterval(notificationInterval)
    }
  }, [user?.id])

  const fetchEmployeeData = async () => {
    try {
      const [stockResponse, notificationsResponse] = await Promise.all([
        stockAPI.getAll(),
        notificationsAPI.getAll(user.id),
      ])

      // Filter stock assignments for current employee
      const stockData = Array.isArray(stockResponse.data) ? stockResponse.data : (stockResponse.data?.data || []);
const employeeStock = stockData.filter((stock: any) => stock.employee?._id === user.id)
      setAssignedStock(employeeStock)
      setNotifications(notificationsResponse.data || [])
      if (setUnreadCount) setUnreadCount((notificationsResponse.data || []).filter((n: any) => !n.isRead).length)
    } catch (error) {
      console.error("Failed to fetch employee data:", error)
      setAssignedStock([])
      setNotifications([])
      if (setUnreadCount) setUnreadCount(0)
    } finally {
      setLoading(false)
    }
  }

  const checkForNewNotifications = async () => {
    try {
      console.log('Checking for notifications for employee user:', user.id)
      const response = await fetch('/api/notifications?userId=' + user.id + '&type=stock_assignment&unread=true')
      if (response.ok) {
        const data = await response.json()
        console.log('Received notifications:', data)
        if (data.length > 0) {
          const latestNotification = data[0]
          console.log('Showing notification for:', latestNotification)
          showNotification(`New stock assignment: ${latestNotification.message}`)
          // Mark notification as read
          await fetch(`/api/notifications/${latestNotification._id}/read`, { method: 'PUT' })
          // Refresh employee data to show updated assignments
          await fetchEmployeeData()
        }
      } else {
        console.error('Failed to fetch notifications, status:', response.status)
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

  const handleReceiveStock = async (assignmentId: string) => {
    try {
      await stockAPI.receive(assignmentId)
      fetchEmployeeData() // Refresh data
    } catch (error) {
      console.error("Failed to receive stock:", error)
    }
  }

  const handleReturnStock = async (assignmentId: string) => {
    try {
      await stockAPI.returnStock(assignmentId);
      // Refresh data immediately to ensure UI updates
      await fetchEmployeeData();
      console.log('Stock returned successfully');
    } catch (error) {
      console.error("Failed to return stock:", error);
      alert('Failed to return stock. Please try again.');
    }
  };

  const pendingStock = assignedStock.filter((stock: any) => stock.status === "assigned")
  const receivedStock = assignedStock.filter((stock: any) => stock.status === "received")
  const returnedStock = assignedStock.filter((stock: any) => stock.status === "returned")

  // Filtering logic for category
  const pendingStockFiltered = categoryFilter ? pendingStock.filter((stock: any) => stock.product?.category === categoryFilter) : pendingStock;
  const receivedStockFiltered = categoryFilter ? receivedStock.filter((stock: any) => stock.product?.category === categoryFilter) : receivedStock;
  const unreadNotifications = notifications.filter((n) => !n.isRead)
  
  // Enhanced stock calculations using the new logic
  const totalAssignedQuantity = assignedStock
    .filter((stock) => stock.status !== "returned")
    .reduce((sum, stock) => sum + (stock.quantity || 0), 0)
  
  const totalPendingQuantity = pendingStock.reduce((sum, stock) => sum + (stock.quantity || 0), 0)
  
  const totalRemainingQuantity = receivedStock.reduce((sum, stock) => sum + (stock.remainingQuantity || stock.quantity || 0), 0)
  
  const totalReturnedQuantity = returnedStock.reduce((sum, stock) => sum + (stock.quantity || 0), 0)

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
        <h1 className="text-4xl font-bold mb-2">Welcome back, {user?.name || "User"}!</h1>
        <p className="text-white/80 text-lg">Here's your current status and assignments</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Total Assigned Stock</CardTitle>
            <Package className="h-5 w-5 text-[#2B3068]" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#2B3068]">{totalAssignedQuantity}</div>
            <p className="text-xs text-gray-600 mt-1">Total quantity ever assigned</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Pending Stock</CardTitle>
            <AlertCircle className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-500">{totalPendingQuantity}</div>
            <p className="text-xs text-gray-600 mt-1">Awaiting receipt</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Remaining Stock</CardTitle>
            <CheckCircle className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">{totalRemainingQuantity}</div>
            <p className="text-xs text-gray-600 mt-1">Current stock after sales</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Returned Stock</CardTitle>
            <Package className="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-500">{totalReturnedQuantity}</div>
            <p className="text-xs text-gray-600 mt-1">Stock returned to admin</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-[#2B3068] to-[#1a1f4a] text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Pending Stock Assignments
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Least Price (Assigned)</TableHead>
                    <TableHead>Assigned Date</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingStockFiltered.map((stock) => (
                    <TableRow key={stock._id}>
                      <TableCell className="font-medium">{stock.product?.name || "Unknown Product"}</TableCell>
                      <TableCell>{stock.product?.category || "-"}</TableCell>
                      <TableCell>{stock.quantity}</TableCell>
                      <TableCell>{(() => {
                        const leastPrice = stock.leastPrice ?? stock.product?.leastPrice;
                        return leastPrice ? `AED ${leastPrice}` : <span className="text-gray-400">N/A</span>;
                      })()}</TableCell>
                      <TableCell>{new Date(stock.assignedDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => handleReceiveStock(stock._id)}
                          style={{ backgroundColor: "#2B3068" }}
                          className="hover:opacity-90"
                        >
                          Receive
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {pendingStock.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                        No pending stock assignments.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-[#2B3068] to-[#1a1f4a] text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Received Stock Assignments
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Least Price (Assigned)</TableHead>
                    <TableHead>Received Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receivedStockFiltered.map((stock) => (
                    <TableRow key={stock._id}>
                      <TableCell className="font-medium">{stock.product?.name || "Unknown Product"}</TableCell>
                      <TableCell>{stock.product?.category || "-"}</TableCell>
                      <TableCell>{stock.quantity}</TableCell>
                      <TableCell>{(() => {
                        const leastPrice = stock.leastPrice ?? stock.product?.leastPrice;
                        return leastPrice ? `AED ${leastPrice}` : <span className="text-gray-400">N/A</span>;
                      })()}</TableCell>
                      <TableCell>{stock.receivedDate ? new Date(stock.receivedDate).toLocaleDateString() : "-"}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReturnStock(stock._id)}
                          className="border-[#2B3068] text-[#2B3068] hover:bg-[#2B3068] hover:text-white"
                        >
                          Return Stock
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {receivedStock.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                        No received stock assignments.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-[#2B3068] to-[#1a1f4a] text-white rounded-t-lg">
          <CardTitle>Account Summary</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">${(user?.creditAmount || 0).toFixed(2)}</div>
              <p className="text-sm text-gray-600">Total Credit</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">${(user?.debitAmount || 0).toFixed(2)}</div>
              <p className="text-sm text-gray-600">Total Debit</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-[#2B3068]">
                ${((user?.creditAmount || 0) - (user?.debitAmount || 0)).toFixed(2)}
              </div>
              <p className="text-sm text-gray-600">Net Balance</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Popup */}
      {notification.visible && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg max-w-md">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Stock Assignment Notification</span>
          </div>
          <p className="mt-1 text-sm">{notification.message}</p>
        </div>
      )}
    </div>
  )
}
