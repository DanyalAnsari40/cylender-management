"use client"

import { useState, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import SignatureCanvas from "react-signature-canvas"

interface SignatureDialogProps {
  isOpen: boolean
  onClose: () => void
  onSignatureComplete: (signature: string) => void
  customerName?: string
}

export function SignatureDialog({ isOpen, onClose, onSignatureComplete, customerName }: SignatureDialogProps) {
  const signatureRef = useRef<SignatureCanvas>(null)

  const handleSave = () => {
    const signatureData = signatureRef.current?.toDataURL()
    console.log('SignatureDialog - Signature captured:', signatureData)
    console.log('SignatureDialog - Signature length:', signatureData?.length)
    if (signatureData) {
      onSignatureComplete(signatureData)
    }
    onClose()
  }

  const clearSignature = () => {
    signatureRef.current?.clear()
  }

  const handleCancel = () => {
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl" aria-describedby="signature-description">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Customer Signature Required</DialogTitle>
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>
        
        {/* Hidden description for accessibility */}
        <div id="signature-description" className="sr-only">
          Customer signature required for receipt generation. Use your finger or mouse to sign in the designated area.
        </div>

        <div className="space-y-4">
          <div className="text-center">
            <p className="text-lg font-medium text-[#2B3068]">
              {customerName ? `${customerName}, please sign below:` : "Please sign below:"}
            </p>
            <p className="text-sm text-gray-600">Use your finger or mouse to sign in the box</p>
          </div>

          <div className="border-2 border-[#2B3068] rounded-lg p-4 bg-gray-50">
            <div className="bg-white border border-gray-300 rounded-lg">
              <SignatureCanvas
                ref={signatureRef}
                canvasProps={{
                  width: 600,
                  height: 200,
                  className: "signature-canvas w-full",
                  style: { border: "1px solid #ddd", borderRadius: "4px" },
                }}
                backgroundColor="white"
              />
            </div>
            <div className="flex justify-center mt-3">
              <Button variant="outline" size="sm" onClick={clearSignature}>
                Clear Signature
              </Button>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-[#2B3068] hover:bg-[#1a1f4a] text-white">
              Continue to Receipt
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
