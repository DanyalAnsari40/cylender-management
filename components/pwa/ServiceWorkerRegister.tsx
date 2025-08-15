"use client"

import { useEffect } from "react"

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return
    if (!("serviceWorker" in navigator)) return

    const isLocalhost = Boolean(
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname === "[::1]"
    )

    // Register only in production or localhost (for your testing)
    const shouldRegister = process.env.NODE_ENV === "production" || isLocalhost
    if (!shouldRegister) return

    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", { scope: "/" })
        // eslint-disable-next-line no-console
        console.log("Service worker registered")
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("Service worker registration failed:", err)
      }
    }

    register()
  }, [])

  return null
}
