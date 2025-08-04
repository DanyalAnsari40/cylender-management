"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { X, Printer, Download } from "lucide-react"

interface ReceiptDialogProps {
  sale: {
    _id: string
    invoiceNumber: string
    customer: {
      name: string
      phone: string
      address: string
    }
    items: Array<{
      product: {
        name: string
        price: number
      }
      quantity: number
      price: number
      total: number
    }>
    totalAmount: number
    paymentMethod: string
    paymentStatus: string
    createdAt: string
    customerSignature?: string // Add signature to sale object
  }
  signature?: string
  onClose: () => void
}

export function ReceiptDialog({ sale, signature, onClose }: ReceiptDialogProps) {
  // Calculate subtotal from items
  const subtotal = sale.items.reduce((sum, item) => {
    return sum + (item.total || (item.price * item.quantity));
  }, 0);
  const vatAmount = subtotal * 0.05;
  const totalWithVat = subtotal + vatAmount;
  // Use signature from sale object if available, otherwise use signature prop
  const signatureToUse = sale.customerSignature || signature
  
  console.log('ReceiptDialog - Sale:', sale?.invoiceNumber)
  console.log('ReceiptDialog - Signature prop:', signature?.length)
  console.log('ReceiptDialog - Sale signature:', sale.customerSignature?.length)
  console.log('ReceiptDialog - Using signature:', signatureToUse?.length)

  // Convert signature to PNG with transparent background
  const convertToPNG = (signatureData: string): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()
      
      img.onload = () => {
        canvas.width = img.width
        canvas.height = img.height
        
        // Clear canvas with transparent background
        ctx!.clearRect(0, 0, canvas.width, canvas.height)
        
        // Draw the signature
        ctx!.drawImage(img, 0, 0)
        
        // Convert to PNG with transparency
        const pngData = canvas.toDataURL('image/png')
        resolve(pngData)
      }
      
      img.src = signatureData
    })
  }

  const handlePrint = () => {
    // Store the sale data in sessionStorage to pass it to the print page
    sessionStorage.setItem('printReceiptData', JSON.stringify(sale));
    window.open(`/print/receipt/${sale._id}`, '_blank');
  }

  const handleDownload = () => {
    const signatureData = signatureToUse || ""

    // Create a blob with the receipt HTML
    const receiptHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${sale.invoiceNumber}</title>
          <meta charset="utf-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              max-width: 400px;
              margin: 0 auto;
              padding: 20px;
              font-size: 14px;
              line-height: 1.6;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #2B3068;
              padding-bottom: 15px;
            }
            .company-name {
              font-size: 24px;
              font-weight: bold;
              color: #2B3068;
              margin-bottom: 5px;
            }
            .subtitle {
              color: #666;
              font-size: 16px;
            }
            .section {
              margin: 20px 0;
              padding: 15px;
              background-color: #f8f9fa;
              border-radius: 8px;
            }
            .section-title {
              font-weight: bold;
              color: #2B3068;
              margin-bottom: 10px;
              font-size: 16px;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            .items-table th,
            .items-table td {
              padding: 10px;
              text-align: left;
              border-bottom: 1px solid #ddd;
            }
            .items-table th {
              background-color: #2B3068;
              color: white;
              font-weight: bold;
            }
            .total-section {
              background-color: #2B3068;
              color: white;
              padding: 20px;
              border-radius: 8px;
              text-align: center;
              margin: 20px 0;
            }
            .total-amount {
              font-size: 24px;
              font-weight: bold;
            }
            .signature-section {
              margin: 30px 0;
              text-align: center;
              padding: 20px;
              border: 2px dashed #2B3068;
              border-radius: 8px;
            }
            .signature-image {
              max-width: 250px;
              max-height: 120px;
              border: 1px solid #ddd;
              margin: 15px 0;
              border-radius: 4px;
            }
            .footer {
              text-align: center;
              margin-top: 40px;
              padding-top: 20px;
              border-top: 2px solid #2B3068;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${window.location.origin}/images/header-invoice.jpeg" alt="BARAKAH ALJAZEERA Header" style="max-width: 100%; height: auto; margin: 0 auto; display: block;" />
          </div>
          
          <div class="section">
            <div class="section-title">Invoice Information</div>
            <div><strong>Invoice Number:</strong> ${sale.invoiceNumber}</div>
            <div><strong>Date:</strong> ${new Date(sale.createdAt).toLocaleDateString()}</div>
            <div><strong>Time:</strong> ${new Date(sale.createdAt).toLocaleTimeString()}</div>
          </div>
          
          <div class="section">
            <div class="section-title">Customer Information</div>
            <div><strong>Name:</strong> ${sale.customer.name}</div>
            <div><strong>Phone:</strong> ${sale.customer.phone}</div>
            <div><strong>Address:</strong> ${sale.customer.address}</div>
          </div>
          
          <table class="items-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${sale.items
                .map(
                  (item) => `
                <tr>
                  <td>${item.product.name}</td>
                  <td>${item.quantity}</td>
                  <td>AED ${item.price.toFixed(2)}</td>
                  <td>AED ${item.total.toFixed(2)}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
          
          <table class="items-table" style="margin-top: 20px;">
            <tbody>
              <tr>
                <td style="text-align: right;">Subtotal</td>
                <td style="text-align: right; width: 120px;">AED ${subtotal.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="text-align: right;">VAT (5%)</td>
                <td style="text-align: right; width: 120px;">AED ${vatAmount.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="text-align: right; font-weight: bold; font-size: 18px;">Total</td>
                <td style="text-align: right; font-weight: bold; font-size: 18px; width: 120px;">AED ${totalWithVat.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
          <div style="margin-top: 15px; font-size: 14px; text-align: right;">
              <div><strong>Payment Method:</strong> ${sale.paymentMethod.toUpperCase()}</div>
              <div><strong>Status:</strong> ${sale.paymentStatus.toUpperCase()}</div>
          </div>
          
          <div class="footer" style="position: relative; text-align: center; margin-top: 40px;">
            <img src="${window.location.origin}/images/footer.png" alt="BARAKAH ALJAZEERA Footer" style="max-width: 100%; height: auto; margin: 0 auto; display: block;" />
            ${
              signatureData
                ? `<div style="position: absolute; bottom: 10px; right: 30px;">
                     <img src="${signatureData}" alt="Customer Signature" style="max-height: 50px; object-fit: contain; opacity: 0.9; mix-blend-mode: multiply; filter: drop-shadow(0 0 2px rgba(255,255,255,0.8));" />
                   </div>`
                : ''
            }
          </div>
        </body>
      </html>
    `

    const blob = new Blob([receiptHTML], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `receipt-${sale.invoiceNumber}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }


  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby="receipt-description">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Receipt - {sale.invoiceNumber}</DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>
        
        {/* Hidden description for accessibility */}
        <div id="receipt-description" className="sr-only">
          Sales receipt for invoice {sale.invoiceNumber} showing customer information, purchased items, and total amount with signature area for printing or download.
        </div>

        <div className="space-y-6">
          {/* Company Header Image */}
          <div className="text-center pb-4">
            <img 
              src="/images/header-invoice.jpeg"
              alt="BARAKAH ALJAZEERA Header" 
              className="mx-auto max-w-full h-auto"
            />
          </div>

          {/* Invoice Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold text-[#2B3068] mb-2">Invoice Information</h3>
              <div className="space-y-1 text-sm">
                <div>
                  <strong>Invoice #:</strong> {sale.invoiceNumber}
                </div>
                <div>
                  <strong>Date:</strong> {new Date(sale.createdAt).toLocaleDateString()}
                </div>
                <div>
                  <strong>Time:</strong> {new Date(sale.createdAt).toLocaleTimeString()}
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-[#2B3068] mb-2">Customer Information</h3>
              <div className="space-y-1 text-sm">
                <div>
                  <strong>Name:</strong> {sale.customer.name}
                </div>
                <div>
                  <strong>Phone:</strong> {sale.customer.phone}
                </div>
                <div>
                  <strong>Address:</strong> {sale.customer.address}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Items */}
          <div>
            <h3 className="font-semibold text-[#2B3068] mb-3">Items</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#2B3068] text-white">
                    <th className="text-left p-3 border">Item</th>
                    <th className="text-center p-3 border">Qty</th>
                    <th className="text-right p-3 border">Price</th>
                    <th className="text-right p-3 border">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {sale.items.map((item, index) => (
                    <tr key={index} className="border-b">
                      <td className="p-3 border">{item.product.name}</td>
                      <td className="text-center p-3 border">{item.quantity}</td>
                      <td className="text-right p-3 border">AED {item.price.toFixed(2)}</td>
                      <td className="text-right p-3 border">AED {item.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <Separator />

          {/* Total */}
          <div className="mt-4">
            <table className="w-full">
              <tbody>
                <tr>
                  <td className="text-right pr-4">Subtotal</td>
                  <td className="text-right font-semibold w-32">AED {subtotal.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="text-right pr-4">VAT (5%)</td>
                  <td className="text-right font-semibold w-32">AED {vatAmount.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="text-right pr-4 font-bold text-xl">Total</td>
                  <td className="text-right font-bold text-xl w-32">AED {totalWithVat.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
            <div className="flex justify-end text-sm mt-4">
              <div className="text-right">
                <div>Payment Method: {sale.paymentMethod.toUpperCase()}</div>
                <div>Status: {sale.paymentStatus.toUpperCase()}</div>
              </div>
            </div>
          </div>

          {/* Footer with Signature */}
          <div className="mt-8 print-area relative">
            {/* Footer Image */}
            <div className="text-center">
              <img 
                src="/images/footer.png" 
                alt="BARAKAH ALJAZEERA Footer" 
                className="mx-auto max-w-full h-auto"
              />
            </div>
            
            {/* Signature overlaid on Footer - Right Side */}
            {signatureToUse && (
              <div className="absolute bottom-4 right-8">
                <img 
                  src={signatureToUse} 
                  alt="Customer Signature" 
                  className="max-h-12 object-contain opacity-90"
                  style={{
                    mixBlendMode: 'multiply',
                    filter: 'drop-shadow(0 0 2px rgba(255,255,255,0.8))'
                  }}
                />
              </div>
            )}
          </div>

          {/* Action Buttons - Moved to bottom */}
          <div className="flex gap-3 justify-center mt-8 no-print">
            <Button variant="outline" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button onClick={handlePrint} className="bg-[#2B3068] hover:bg-[#1a1f4a] text-white">
              <Printer className="w-4 h-4 mr-2" />
              Print Receipt
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
