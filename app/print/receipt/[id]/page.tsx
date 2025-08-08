"use client"

import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

// This interface MUST match the 'sale' object structure from ReceiptDialogProps
interface Sale {
  _id: string;
  invoiceNumber: string;
  customer: {
    name: string;
    phone: string;
    address: string;
  };
  items: Array<{
    product: {
      name: string;
      price: number;
    };
    quantity: number;
    price: number;
    total: number;
  }>;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
  customerSignature?: string;
}

const ReceiptPrintPage = () => {
  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminSignature, setAdminSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    try {
      // Data is passed from the dialog via sessionStorage
      const savedData = sessionStorage.getItem('printReceiptData');
      const savedAdminSig = sessionStorage.getItem('adminSignature');
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        setSale(parsedData);
        setAdminSignature(savedAdminSig);
        // We can clear the data after reading it to prevent it from being used again accidentally.
        // sessionStorage.removeItem('printReceiptData');
      } else {
        setError('Receipt data not found. Please generate the receipt again.');
      }
    } catch (err) {
      setError('Failed to load receipt data. The data format may be incorrect.');
      console.error('Error parsing receipt data from sessionStorage:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen font-semibold">Loading Receipt...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center h-screen text-red-600 font-semibold">Error: {error}</div>;
  }

  if (!sale) {
    return <div className="flex justify-center items-center h-screen font-semibold">Sale data is not available.</div>;
  }

  // Calculations
  const subtotal = sale.items.reduce((sum, item) => sum + item.total, 0);
  const vatAmount = subtotal * 0.05;
  const totalWithVat = subtotal + vatAmount;

  return (
    <div className="bg-gray-100 min-h-screen print:bg-white">
      {/* This is the non-printable header with the print button */}
      <header className="p-4 bg-white shadow-md no-print flex justify-between items-center sticky top-0 z-10">
        <h1 className="text-xl font-bold text-gray-800">Print Preview</h1>
        <Button onClick={handlePrint}>
          <Printer className="mr-2 h-5 w-5" />
          Print Receipt
        </Button>
      </header>

      {/* This is the printable receipt area */}
      <main className="printable-area max-w-3xl mx-auto p-8 bg-white">
        <div className="text-center pb-4 border-b-2 border-gray-300">
          <img 
            src="/images/header-invoice.jpeg"
            alt="Company Header"
            className="mx-auto max-w-full h-auto"
          />
        </div>

        <section className="grid grid-cols-2 gap-8 my-8">
          <div>
            <h2 className="font-bold text-lg text-[#2B3068] mb-2">Invoice Information</h2>
            <div className="space-y-1 text-sm text-gray-700">
              <div><strong>Invoice #:</strong> {sale.invoiceNumber}</div>
              <div><strong>Date:</strong> {new Date(sale.createdAt).toLocaleDateString()}</div>
              <div><strong>Time:</strong> {new Date(sale.createdAt).toLocaleTimeString()}</div>
            </div>
          </div>
          <div>
            <h2 className="font-bold text-lg text-[#2B3068] mb-2">Customer Information</h2>
            <div className="space-y-1 text-sm text-gray-700">
              <div><strong>Name:</strong> {sale.customer.name}</div>
              <div><strong>Phone:</strong> {sale.customer.phone}</div>
              <div><strong>Address:</strong> {sale.customer.address}</div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="font-bold text-lg text-[#2B3068] mb-3">Purchased Items</h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-[#2B3068] text-white">
                <th className="text-left p-3 font-semibold border">Item</th>
                <th className="text-center p-3 font-semibold border">Qty</th>
                <th className="text-right p-3 font-semibold border">Price</th>
                <th className="text-right p-3 font-semibold border">Total</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item, index) => (
                <tr key={index} className="border-b hover:bg-gray-50">
                  <td className="p-2 border">{item.product.name}</td>
                  <td className="text-center p-2 border">{item.quantity}</td>
                  <td className="text-right p-2 border">AED {item.price.toFixed(2)}</td>
                  <td className="text-right p-2 border font-medium">AED {item.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="flex justify-end mt-8">
          <div className="w-full max-w-sm text-sm">
            <table className="w-full">
              <tbody>
                <tr>
                  <td className="text-right pr-4 py-1 text-gray-600">Subtotal</td>
                  <td className="text-right font-semibold w-36 py-1">AED {subtotal.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="text-right pr-4 py-1 text-gray-600">VAT (5%)</td>
                  <td className="text-right font-semibold w-36 py-1">AED {vatAmount.toFixed(2)}</td>
                </tr>
                <tr className="border-t-2 border-black mt-2">
                  <td className="text-right pr-4 pt-2 font-bold text-xl">Total</td>
                  <td className="text-right font-bold text-xl w-36 pt-2">AED {totalWithVat.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="text-right mt-6 text-sm font-medium">
          <div><strong>Payment Method:</strong> {sale.paymentMethod.toUpperCase()}</div>
          <div><strong>Status:</strong> {sale.paymentStatus.toUpperCase()}</div>
        </section>

        <footer className="text-center pt-8 mt-8 border-t-2 border-gray-300 relative">
          {/* The footer image acts as a container */}
          <img 
            src="/images/footer.png" 
            alt="Footer Graphic"
            className="mx-auto max-w-full h-auto"
          />
          {/* The signatures are absolutely positioned on top of the footer image */}
          {sale.customerSignature && (
            <div className="absolute bottom-7 right-16">
              <img 
                src={sale.customerSignature} 
                alt="Customer Signature" 
                className="max-h-12 object-contain opacity-90 mix-blend-multiply"
                style={{ filter: 'drop-shadow(0 0 1px rgba(255,255,255,0.7))' }}
              />
            </div>
          )}
          {adminSignature && (
            <div className="absolute bottom-9 left-16">
              <img 
                src={adminSignature} 
                alt="Admin Signature" 
                className="max-h-12 object-contain opacity-90 mix-blend-multiply"
                style={{ filter: 'drop-shadow(0 0 1px rgba(255,255,255,0.7))' }}
              />
            </div>
          )}
        </footer>
      </main>

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background-color: #fff !important;
            -webkit-print-color-adjust: exact;
          }
          .printable-area {
            margin: 0;
            padding: 0;
            box-shadow: none;
            border: none;
            width: 100%;
            max-width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default ReceiptPrintPage;
