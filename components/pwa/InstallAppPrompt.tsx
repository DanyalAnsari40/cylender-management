"use client"

import { useEffect, useState } from "react"

// Types for the beforeinstallprompt event (not in TS lib by default)
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
}

export default function InstallAppPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isInStandalone, setIsInStandalone] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return

    // Detect iOS and standalone mode
    const ua = window.navigator.userAgent
    const iOS = /iPhone|iPad|iPod/i.test(ua)
    const standalone = (window.navigator as any).standalone === true || window.matchMedia("(display-mode: standalone)").matches
    setIsIOS(iOS)
    setIsInStandalone(standalone)

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowPrompt(true)
    }

    window.addEventListener("beforeinstallprompt", handler)
    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  // Don’t show if already installed or on iOS (we will show help card instead)
  if (isInStandalone) return null

  const onInstallClick = async () => {
    if (!deferredPrompt) return
    setShowPrompt(false)
    try {
      await deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice
      // eslint-disable-next-line no-console
      console.log("PWA install outcome:", choice.outcome)
      setDeferredPrompt(null)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("Install prompt failed:", err)
    }
  }

  const onDismiss = () => setShowPrompt(false)

  // iOS add-to-home-screen helper (since iOS has no beforeinstallprompt)
  if (isIOS) {
    return (
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-[560px]">
        <div className="rounded-xl border border-blue-200 bg-white shadow-lg p-3 sm:p-4 flex items-start gap-3">
          <div className="text-[#2B3068] font-semibold">Install on iPhone</div>
          <div className="text-sm text-gray-600 flex-1">
            Open Share menu and tap <span className="font-medium">Add to Home Screen</span> to install the app.
          </div>
          <button onClick={onDismiss} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
      </div>
    )
  }

  if (!showPrompt) return null

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-[560px]">
      <div className="rounded-xl border border-indigo-200 bg-white shadow-lg p-3 sm:p-4 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-sm sm:text-base font-semibold text-gray-800">Install this app</div>
          <div className="text-xs sm:text-sm text-gray-600 truncate">Use it full-screen without the browser.</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onDismiss} className="px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Not now</button>
          <button onClick={onInstallClick} className="px-3 py-2 text-sm rounded-lg bg-[#2B3068] text-white hover:opacity-90">Install</button>
        </div>
      </div>
    </div>
  )
}
