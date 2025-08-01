"use client"

import { useState, useEffect } from "react"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Dashboard } from "@/components/pages/dashboard"
import { ProductManagement } from "@/components/pages/product-management"
import { SupplierManagement } from "@/components/pages/supplier-management"
import { PurchaseManagement } from "@/components/pages/purchase-management"
import { Inventory } from "@/components/pages/inventory"
import { CustomerManagement } from "@/components/pages/customer-management"
import { GasSales } from "@/components/pages/gas-sales"
import { EmployeeManagement } from "@/components/pages/employee-management"
import { CylinderManagement } from "@/components/pages/cylinder-management"
import { Reports } from "@/components/pages/reports"
import { EmployeeDashboard } from "@/components/pages/employee-dashboard"
import { Notifications } from "@/components/pages/notifications"
import { authAPI } from "@/lib/api"

interface MainLayoutProps {
  user: {
    id: string
    email: string
    role: "admin" | "employee"
    name: string
    debitAmount?: number
    creditAmount?: number
  }
  onLogout: () => void
}

export function MainLayout({ user, onLogout }: MainLayoutProps) {
  const [currentPage, setCurrentPage] = useState("dashboard")
  const [mounted, setMounted] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleLogout = async () => {
    try {
      await authAPI.logout()
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      onLogout()
    }
  }

  const renderPage = () => {
    if (user.role === "employee") {
      switch (currentPage) {
        case "notifications":
          return <Notifications user={user} setUnreadCount={setUnreadCount} />
        default:
          return <EmployeeDashboard user={user} setUnreadCount={setUnreadCount} />
      }
    }

    switch (currentPage) {
      case "dashboard":
        return <Dashboard />
      case "products":
        return <ProductManagement />
      case "suppliers":
        return <SupplierManagement />
      case "purchases":
        return <PurchaseManagement />
      case "inventory":
        return <Inventory />
      case "customers":
        return <CustomerManagement />
      case "sales":
        return <GasSales />
      case "employees":
        return <EmployeeManagement user={user} />
      case "cylinders":
        return <CylinderManagement />
      case "reports":
        return <Reports />
      default:
        return <Dashboard />
    }
  }

  // Don't render until mounted
  if (!mounted) {
    return null
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-gray-50">
        <AppSidebar currentPage={currentPage} onPageChange={setCurrentPage} user={user} onLogout={handleLogout} unreadCount={unreadCount} setUnreadCount={setUnreadCount} />
        <main className="flex-1 overflow-auto">
          <div className="pt-16 lg:pt-0 p-3 sm:p-4 lg:p-6 xl:p-8">{renderPage()}</div>
        </main>
      </div>
    </SidebarProvider>
  )
}
