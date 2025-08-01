"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, Users, Package, TrendingUp, AlertCircle } from "lucide-react"
import { dashboardAPI } from "@/lib/api"

export function Dashboard() {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalDue: 0,
    totalCustomers: 0,
    totalEmployees: 0,
    productsSold: 0,
    totalSales: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await dashboardAPI.getStats()
      console.log('Dashboard stats response:', response.data)
      
      // Handle nested data structure if needed
      const statsData = response.data?.data || response.data || {}
      
      setStats({
        totalRevenue: statsData.totalRevenue || 0,
        totalDue: statsData.totalDue || 0,
        totalCustomers: statsData.totalCustomers || 0,
        totalEmployees: statsData.totalEmployees || 0,
        productsSold: statsData.productsSold || 0,
        totalSales: statsData.totalSales || 0,
      })
    } catch (error) {
      console.error("Failed to fetch stats:", error)
      // Set default values on error
      setStats({
        totalRevenue: 0,
        totalDue: 0,
        totalCustomers: 0,
        totalEmployees: 0,
        productsSold: 0,
        totalSales: 0,
      })
    } finally {
      setLoading(false)
    }
  }

  const cards = [
    {
      title: "Total Revenue",
      value: `AED ${stats.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: "#2B3068",
      bgColor: "bg-gradient-to-br from-blue-50 to-indigo-100",
    },
    {
      title: "Total Due",
      value: `AED ${stats.totalDue.toLocaleString()}`,
      icon: AlertCircle,
      color: "#DC2626",
      bgColor: "bg-gradient-to-br from-red-50 to-red-100",
    },
    {
      title: "Total Customers",
      value: stats.totalCustomers.toString(),
      icon: Users,
      color: "#059669",
      bgColor: "bg-gradient-to-br from-green-50 to-emerald-100",
    },
    {
      title: "Products Sold",
      value: stats.productsSold.toString(),
      icon: Package,
      color: "#7C3AED",
      bgColor: "bg-gradient-to-br from-purple-50 to-violet-100",
    },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-32 bg-gray-200 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-[#2B3068] to-[#1a1f4a] rounded-2xl p-8 text-white">
        <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
        <p className="text-white/80 text-lg">Welcome to BARAKAH ALJAZEERA Gas Management System</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, index) => (
          <Card key={index} className={`hover:shadow-xl transition-all duration-300 border-0 ${card.bgColor}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">{card.title}</CardTitle>
              <div className="p-2 rounded-lg" style={{ backgroundColor: `${card.color}15` }}>
                <card.icon className="h-5 w-5" style={{ color: card.color }} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" style={{ color: card.color }}>
                {card.value}
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {card.title === "Total Revenue" && "Total amount received"}
                {card.title === "Total Due" && "Outstanding payments"}
                {card.title === "Total Customers" && "Registered customers"}
                {card.title === "Products Sold" && "Units sold"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-[#2B3068] to-[#1a1f4a] text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-700">New customer registered</span>
                <span className="text-xs text-gray-500">2 hours ago</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-700">Gas sale completed</span>
                <span className="text-xs text-gray-500">4 hours ago</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-700">Inventory updated</span>
                <span className="text-xs text-gray-500">6 hours ago</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-[#2B3068] to-[#1a1f4a] text-white rounded-t-lg">
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 gap-3">
              <button className="p-4 text-left rounded-lg border border-gray-200 hover:bg-[#2B3068] hover:text-white transition-all duration-200 text-sm font-medium">
                Add New Product
              </button>
              <button className="p-4 text-left rounded-lg border border-gray-200 hover:bg-[#2B3068] hover:text-white transition-all duration-200 text-sm font-medium">
                Create Sale
              </button>
              <button className="p-4 text-left rounded-lg border border-gray-200 hover:bg-[#2B3068] hover:text-white transition-all duration-200 text-sm font-medium">
                Add Customer
              </button>
              <button className="p-4 text-left rounded-lg border border-gray-200 hover:bg-[#2B3068] hover:text-white transition-all duration-200 text-sm font-medium">
                View Reports
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
