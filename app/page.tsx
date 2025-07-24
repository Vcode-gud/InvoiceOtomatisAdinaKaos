"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Trash2,
  Download,
  Save,
  Plus,
  User,
  MapPin,
  Phone,
  ShoppingBag,
  CreditCard,
  Shield,
  History,
  RefreshCw,
} from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import Link from "next/link"
import Image from "next/image"

const produkList = {
  "Lengan Pendek Combed 24S": {
    Putih: { S: 42000, M: 42500, L: 46000, XL: 49000, "2XL": 50500, "3XL": 52500 },
    Hitam: { S: 44500, M: 45000, L: 49000, XL: 52000, "2XL": 54000, "3XL": 56500 },
    Warna: { S: 45000, M: 46000, L: 50600, XL: 53000, "2XL": 55000, "3XL": 57500 },
  },
  "Lengan Pendek Combed 30S": {
    Putih: { S: 39500, M: 40000, L: 42500, XL: 43500, "2XL": 46000, "3XL": 49500 },
    Hitam: { S: 41500, M: 42000, L: 45000, XL: 46500, "2XL": 49500, "3XL": 52500 },
    Warna: { S: 42500, M: 43000, L: 46000, XL: 47000, "2XL": 50000, "3XL": 53500 },
  },
  "Lengan Panjang Combed 24S": {
    Putih: { S: 47500, M: 49000, L: 51000, XL: 54000, "2XL": 57500, "3XL": 61000 },
    Hitam: { S: 50500, M: 52500, L: 54500, XL: 58000, "2XL": 62000, "3XL": 66000 },
    Warna: { S: 51500, M: 53500, L: 55500, XL: 59000, "2XL": 63000, "3XL": 67000 },
  },
  "Lengan Panjang Combed 30S": {
    Putih: { S: 44500, M: 45500, L: 47500, XL: 49500, "2XL": 52000, "3XL": 58000 },
    Hitam: { S: 46500, M: 48600, L: 51000, XL: 53000, "2XL": 55500, "3XL": 62000 },
    Warna: { S: 48000, M: 49500, L: 52000, XL: 54000, "2XL": 56500, "3XL": 63000 },
  },
  Polo: {
    "Semua Warna": { S: 87000, M: 87000, L: 87000, XL: 87000, "2XL": 93500, "3XL": 100000 },
  },
  Desain: {
    Layanan: { "Per Desain": 10000 },
  },
  "Sablon/Bordir": {
    Layanan: { "Per Item": 15000 },
  },
}

interface InvoiceItem {
  product: string
  color: string
  size: string
  quantity: number
  unitPrice: number
  total: number
}

interface InvoiceData {
  invoiceNumber: string
  date: string
  customer: string
  address: string
  phone: string
  items: InvoiceItem[]
  note: string
  dpAmount: number
}

export default function Home() {
  const [invoiceData, setInvoiceData] = useState<InvoiceData>({
    invoiceNumber: "",
    date: "",
    customer: "",
    address: "",
    phone: "",
    items: [],
    note: "",
    dpAmount: 0,
  })

  const [currentItem, setCurrentItem] = useState({
    product: "",
    color: "",
    size: "",
    quantity: 1,
    unitPrice: 0,
  })

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [enableWatermark, setEnableWatermark] = useState(true)
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.1)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    generateNewInvoiceNumber()
  }, [])

  const generateNewInvoiceNumber = () => {
    const now = new Date()
    const number = `INV-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, "0")}-${Math.floor(
      Math.random() * 10000,
    )
      .toString()
      .padStart(4, "0")}`
    setInvoiceData((prev) => ({
      ...prev,
      invoiceNumber: number,
      date: now.toISOString().slice(0, 10),
    }))
  }

  const handleRefreshData = () => {
    setIsRefreshing(true)

    // Generate new invoice number
    generateNewInvoiceNumber()

    // Reset form but keep existing functionality
    setInvoiceData((prev) => ({
      ...prev,
      customer: "",
      address: "",
      phone: "",
      items: [],
      note: "",
      dpAmount: 0,
    }))

    // Reset current item
    setCurrentItem({
      product: "",
      color: "",
      size: "",
      quantity: 1,
      unitPrice: 0,
    })

    // Simulate refresh delay
    setTimeout(() => {
      setIsRefreshing(false)
      alert("Data berhasil di-refresh! Siap untuk pelanggan baru.")
    }, 1000)
  }

  const handleAddItem = () => {
    if (!currentItem.product || !currentItem.color || !currentItem.size || currentItem.quantity <= 0) {
      alert("Mohon lengkapi semua field item")
      return
    }

    const total = currentItem.quantity * currentItem.unitPrice
    setInvoiceData((prev) => ({
      ...prev,
      items: [...prev.items, { ...currentItem, total }],
    }))

    // Reset form
    setCurrentItem({
      product: "",
      color: "",
      size: "",
      quantity: 1,
      unitPrice: 0,
    })
  }

  const handleRemoveItem = (index: number) => {
    setInvoiceData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }))
  }

  const generatePDF = async () => {
    if (invoiceData.items.length === 0) {
      alert("Mohon tambahkan minimal 1 item untuk membuat PDF")
      return
    }

    setIsGeneratingPDF(true)

    try {
      // Try to import html2pdf dynamically
      let html2pdf
      try {
        const html2pdfModule = await import("html2pdf.js")
        html2pdf = html2pdfModule.default || html2pdfModule
      } catch (importError) {
        console.error("Failed to import html2pdf:", importError)
        // Fallback to print method
        generatePDFPrint()
        setIsGeneratingPDF(false)
        return
      }

      const element = document.getElementById("invoice")
      if (element) {
        // Hide interactive elements before generating PDF
        const interactiveElements = element.querySelectorAll(".pdf-hide")
        interactiveElements.forEach((el) => {
          ;(el as HTMLElement).style.display = "none"
        })

        // Show watermark if enabled
        const watermarkElements = element.querySelectorAll(".pdf-watermark")
        watermarkElements.forEach((el) => {
          ;(el as HTMLElement).style.display = enableWatermark ? "block" : "none"
        })

        // Configure PDF options
        const opt = {
          margin: [0.5, 0.5, 0.5, 0.5],
          filename: `Invoice-${invoiceData.invoiceNumber}.pdf`,
          image: {
            type: "jpeg",
            quality: 0.98,
          },
          html2canvas: {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            letterRendering: true,
            logging: false,
          },
          jsPDF: {
            unit: "in",
            format: "a4",
            orientation: "portrait",
          },
        }

        try {
          // Generate PDF using html2pdf
          await html2pdf().set(opt).from(element).save()
          alert("PDF berhasil diunduh!")
        } catch (pdfError) {
          console.error("PDF generation failed:", pdfError)
          // Fallback to print method
          generatePDFPrint()
        }

        // Show interactive elements back
        interactiveElements.forEach((el) => {
          ;(el as HTMLElement).style.display = ""
        })

        // Hide watermark elements back for screen view
        watermarkElements.forEach((el) => {
          ;(el as HTMLElement).style.display = "none"
        })
      }
    } catch (error) {
      console.error("Error generating PDF:", error)
      // Fallback to print method
      generatePDFPrint()
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  // Alternative PDF generation using window.print
  const generatePDFPrint = () => {
    if (invoiceData.items.length === 0) {
      alert("Mohon tambahkan minimal 1 item untuk membuat PDF")
      return
    }

    const element = document.getElementById("invoice")
    if (element) {
      // Hide interactive elements
      const interactiveElements = element.querySelectorAll(".pdf-hide")
      interactiveElements.forEach((el) => {
        ;(el as HTMLElement).style.display = "none"
      })

      // Create a new window for printing
      const printWindow = window.open("", "_blank")
      if (printWindow) {
        const watermarkStyle = enableWatermark
          ? `
          .watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 120px;
            font-weight: bold;
            color: rgba(249, 115, 22, ${watermarkOpacity});
            z-index: -1;
            pointer-events: none;
            user-select: none;
            font-family: Arial, sans-serif;
          }
          .watermark-logo {
            position: fixed;
            top: 20%;
            right: 10%;
            opacity: ${watermarkOpacity};
            z-index: -1;
            pointer-events: none;
            user-select: none;
            transform: rotate(-15deg);
          }
          .watermark-logo img {
            width: 200px;
            height: auto;
          }
          .lunas-stamp {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-15deg);
            background: #10b981;
            color: white;
            padding: 30px 60px;
            border-radius: 20px;
            font-size: 48px;
            font-weight: bold;
            border: 8px solid #059669;
            box-shadow: 0 0 30px rgba(16, 185, 129, 0.5);
            z-index: 10;
            opacity: 0.9;
          }
          `
          : ""

        printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Invoice ${invoiceData.invoiceNumber}</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                margin: 0; 
                padding: 20px; 
                color: #333;
                position: relative;
              }
              .invoice-container { 
                max-width: 800px; 
                margin: 0 auto;
                position: relative;
                z-index: 1;
              }
              table { 
                width: 100%; 
                border-collapse: collapse; 
                margin: 20px 0; 
              }
              th, td { 
                border: 1px solid #ddd; 
                padding: 12px 8px; 
                text-align: left; 
                font-size: 14px;
              }
              th { 
                background-color: #f5f5f5; 
                font-weight: bold; 
              }
              .text-right { text-align: right; }
              .text-center { text-align: center; }
              .total-section { 
                background: linear-gradient(to right, #f97316, #ea580c); 
                color: white; 
                padding: 20px; 
                border-radius: 8px; 
                margin: 20px 0; 
                text-align: right;
              }
              .payment-info { 
                background: #f0f9ff; 
                padding: 20px; 
                border-radius: 8px; 
                margin: 20px 0; 
              }
              .bank-info { 
                background: white; 
                padding: 15px; 
                margin: 10px 0; 
                border-left: 4px solid #3b82f6; 
                border-radius: 4px; 
                display: inline-block;
                width: 45%;
                margin-right: 2%;
              }
              .logo { 
                max-width: 120px; 
                height: auto; 
              }
              .header-section {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 30px;
                border-bottom: 2px solid #ddd;
                padding-bottom: 20px;
              }
              .company-info {
                display: flex;
                align-items: center;
                gap: 15px;
              }
              .invoice-title {
                text-align: right;
              }
              .customer-info {
                background: #f9f9f9;
                padding: 15px;
                border-radius: 8px;
                margin-bottom: 20px;
              }
              .pdf-hide { display: none !important; }
              ${watermarkStyle}
              @media print {
                body { margin: 0; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            ${
              enableWatermark
                ? `
            <div class="watermark">ADINA KAOS</div>
            <div class="watermark-logo">
              <img src="/images/adina-logo.png" alt="ADINA KAOS Watermark" />
            </div>
            `
                : ""
            }
            <div class="invoice-container">
              ${element.innerHTML}
            </div>
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                  setTimeout(function() {
                    window.close();
                  }, 100);
                }, 500);
              }
            </script>
          </body>
        </html>
      `)
        printWindow.document.close()
      } else {
        alert("Pop-up diblokir. Silakan izinkan pop-up untuk fitur print PDF.")
      }

      // Show interactive elements back
      setTimeout(() => {
        interactiveElements.forEach((el) => {
          ;(el as HTMLElement).style.display = ""
        })
      }, 1000)
    }
  }

  const handleSave = async () => {
    if (!invoiceData.customer || invoiceData.items.length === 0) {
      alert("Mohon lengkapi informasi pelanggan dan tambahkan minimal 1 item")
      return
    }

    try {
      const response = await fetch("/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invoiceData),
      })

      const result = await response.json()

      if (result.success) {
        alert(`Invoice ${invoiceData.invoiceNumber} berhasil disimpan!`)
        // Auto refresh for next customer
        setTimeout(() => {
          handleRefreshData()
        }, 1500)
      } else {
        alert("Gagal menyimpan invoice: " + result.message)
      }
    } catch (error) {
      console.error("Error saving invoice:", error)
      alert("Gagal menyimpan invoice. Silakan coba lagi.")
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const grandTotal = invoiceData.items.reduce((sum, item) => sum + item.total, 0)
  const remainingBalance = grandTotal - invoiceData.dpAmount

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100">
      <style jsx global>{`
        /* Mobile (kecil) */
        @media (max-width: 480px) {
          .mobile-stack {
            flex-direction: column !important;
          }
          .mobile-full {
            width: 100% !important;
          }
          .mobile-text-sm {
            font-size: 0.875rem !important;
          }
          .mobile-p-2 {
            padding: 0.5rem !important;
          }
          .mobile-gap-2 {
            gap: 0.5rem !important;
          }
          .mobile-hidden {
            display: none !important;
          }
          .mobile-scroll {
            overflow-x: auto !important;
          }
        }

        /* Mobile (umum) */
        @media (max-width: 768px) {
          .tablet-stack {
            flex-direction: column !important;
          }
          .tablet-full {
            width: 100% !important;
          }
          .tablet-p-4 {
            padding: 1rem !important;
          }
          .tablet-gap-4 {
            gap: 1rem !important;
          }
          .tablet-text-base {
            font-size: 1rem !important;
          }
        }

        /* Tablet Portrait */
        @media (min-width: 768px) and (max-width: 1024px) {
          .tablet-grid-2 {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }

        /* Tablet Landscape & small laptops */
        @media (min-width: 1024px) and (max-width: 1280px) {
          .laptop-grid-3 {
            grid-template-columns: repeat(3, 1fr) !important;
          }
        }

        /* Desktop */
        @media (min-width: 1280px) {
          .desktop-grid-4 {
            grid-template-columns: repeat(4, 1fr) !important;
          }
        }

        /* Large LUNAS stamp */
        .lunas-stamp {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-15deg);
          background: linear-gradient(45deg, #10b981, #059669);
          color: white;
          padding: 20px 40px;
          border-radius: 15px;
          font-size: 36px;
          font-weight: bold;
          border: 6px solid #047857;
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.4);
          z-index: 5;
          opacity: 0.9;
          pointer-events: none;
          user-select: none;
        }

        @media (max-width: 768px) {
          .lunas-stamp {
            font-size: 24px;
            padding: 15px 30px;
            border: 4px solid #047857;
          }
        }
      `}</style>

      <div className="max-w-7xl mx-auto p-3 md:p-6 space-y-4 md:space-y-8">
        {/* Mobile Navigation */}
        <div className="md:hidden bg-white/80 backdrop-blur-sm rounded-lg p-4 shadow-lg">
          <div className="flex justify-between items-center">
            <h1 className="text-lg font-bold text-orange-600">ADINA KAOS</h1>
            <div className="flex gap-2">
              <Link href="/invoices">
                <Button size="sm" variant="outline" className="mobile-text-sm bg-transparent">
                  <History className="w-4 h-4 mr-1" />
                  Riwayat
                </Button>
              </Link>
              <Button
                size="sm"
                variant="outline"
                onClick={handleRefreshData}
                disabled={isRefreshing}
                className="bg-green-50 hover:bg-green-100 text-green-600 border-green-200"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </div>

        {/* Header with Logo */}
        <div className="text-center py-4 md:py-8">
          <div className="flex justify-center items-center mb-4">
            <Image
              src="/images/adina-logo.png"
              alt="ADINA KAOS Logo"
              width={150}
              height={90}
              className="object-contain md:w-[200px] md:h-[120px]"
            />
          </div>
          <p className="text-gray-600 text-base md:text-lg font-medium">Invoice Otomatis ADINA KAOS</p>
          <div className="w-16 md:w-24 h-1 bg-gradient-to-r from-orange-400 to-orange-600 mx-auto mt-2 rounded-full"></div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex justify-center items-center gap-4 mt-4">
            <Link href="/invoices">
              <Button className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white">
                <History className="w-4 h-4 mr-2" />
                Lihat Riwayat Transaksi
              </Button>
            </Link>
            <Button
              onClick={handleRefreshData}
              disabled={isRefreshing}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
              {isRefreshing ? "Refreshing..." : "Refresh Data"}
            </Button>
          </div>
        </div>

        {/* Customer Information */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-t-lg p-4 md:p-6">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <User className="w-4 h-4 md:w-5 md:h-5" />
              Informasi Pelanggan
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              <div className="space-y-2">
                <Label htmlFor="customer" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Nama Pelanggan
                </Label>
                <Input
                  id="customer"
                  placeholder="Masukkan nama pelanggan"
                  value={invoiceData.customer}
                  onChange={(e) => setInvoiceData({ ...invoiceData, customer: e.target.value })}
                  className="border-2 border-gray-200 focus:border-orange-400 transition-colors text-sm md:text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Alamat
                </Label>
                <Input
                  id="address"
                  placeholder="Masukkan alamat pelanggan"
                  value={invoiceData.address}
                  onChange={(e) => setInvoiceData({ ...invoiceData, address: e.target.value })}
                  className="border-2 border-gray-200 focus:border-orange-400 transition-colors text-sm md:text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  No. Handphone
                </Label>
                <Input
                  id="phone"
                  placeholder="Masukkan nomor handphone"
                  value={invoiceData.phone}
                  onChange={(e) => setInvoiceData({ ...invoiceData, phone: e.target.value })}
                  className="border-2 border-gray-200 focus:border-orange-400 transition-colors text-sm md:text-base"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add Item Form */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg p-4 md:p-6">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <ShoppingBag className="w-4 h-4 md:w-5 md:h-5" />
              Tambah Item Produk
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
              <div className="space-y-2 md:col-span-2 lg:col-span-1">
                <Label className="text-sm font-semibold text-gray-700">Produk</Label>
                <Select
                  value={currentItem.product}
                  onValueChange={(value) =>
                    setCurrentItem({ ...currentItem, product: value, color: "", size: "", unitPrice: 0 })
                  }
                >
                  <SelectTrigger className="border-2 border-gray-200 focus:border-blue-400 text-sm md:text-base">
                    <SelectValue placeholder="Pilih produk" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(produkList).map((product) => (
                      <SelectItem key={product} value={product}>
                        {product}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">Warna</Label>
                <Select
                  value={currentItem.color}
                  onValueChange={(value) => setCurrentItem({ ...currentItem, color: value, size: "", unitPrice: 0 })}
                  disabled={!currentItem.product}
                >
                  <SelectTrigger className="border-2 border-gray-200 focus:border-blue-400 text-sm md:text-base">
                    <SelectValue placeholder="Pilih warna" />
                  </SelectTrigger>
                  <SelectContent>
                    {currentItem.product &&
                      Object.keys(produkList[currentItem.product as keyof typeof produkList]).map((color) => (
                        <SelectItem key={color} value={color}>
                          {color}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">Ukuran</Label>
                <Select
                  value={currentItem.size}
                  onValueChange={(value) => {
                    const price =
                      produkList[currentItem.product as keyof typeof produkList]?.[
                        currentItem.color as keyof (typeof produkList)[keyof typeof produkList]
                      ]?.[
                        value as keyof (typeof produkList)[keyof typeof produkList][keyof (typeof produkList)[keyof typeof produkList]]
                      ] || 0
                    setCurrentItem({ ...currentItem, size: value, unitPrice: price })
                  }}
                  disabled={!currentItem.color}
                >
                  <SelectTrigger className="border-2 border-gray-200 focus:border-blue-400 text-sm md:text-base">
                    <SelectValue placeholder="Ukuran" />
                  </SelectTrigger>
                  <SelectContent>
                    {currentItem.product &&
                      currentItem.color &&
                      Object.keys(
                        produkList[currentItem.product as keyof typeof produkList][
                          currentItem.color as keyof (typeof produkList)[keyof typeof produkList]
                        ],
                      ).map((size) => (
                        <SelectItem key={size} value={size}>
                          {size}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">Jumlah</Label>
                <Input
                  type="number"
                  min={1}
                  value={currentItem.quantity}
                  onChange={(e) => setCurrentItem({ ...currentItem, quantity: Number.parseInt(e.target.value) || 1 })}
                  className="border-2 border-gray-200 focus:border-blue-400 transition-colors text-sm md:text-base"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">Harga Satuan</Label>
                <Input
                  type="number"
                  value={currentItem.unitPrice}
                  onChange={(e) => setCurrentItem({ ...currentItem, unitPrice: Number.parseInt(e.target.value) || 0 })}
                  className="border-2 border-gray-200 focus:border-blue-400 transition-colors text-sm md:text-base"
                />
              </div>

              <div className="flex items-end">
                <Button
                  onClick={handleAddItem}
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg transform hover:scale-105 transition-all duration-200 text-sm md:text-base"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* DP Payment Section */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-t-lg p-4 md:p-6">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <CreditCard className="w-4 h-4 md:w-5 md:h-5" />
              Pembayaran DP (Down Payment)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              <div className="space-y-2">
                <Label htmlFor="dpAmount" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Jumlah DP
                </Label>
                <Input
                  id="dpAmount"
                  type="number"
                  min={0}
                  max={grandTotal}
                  placeholder="Masukkan jumlah DP"
                  value={invoiceData.dpAmount}
                  onChange={(e) => setInvoiceData({ ...invoiceData, dpAmount: Number.parseInt(e.target.value) || 0 })}
                  className="border-2 border-gray-200 focus:border-purple-400 transition-colors text-sm md:text-base"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">Total Invoice</Label>
                <div className="p-3 bg-gray-100 rounded-lg font-semibold text-sm md:text-lg">
                  {formatCurrency(grandTotal)}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">Sisa Pembayaran</Label>
                <div className="p-3 bg-orange-100 rounded-lg font-semibold text-sm md:text-lg text-orange-600">
                  {formatCurrency(remainingBalance)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PDF Watermark Settings */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-t-lg p-4 md:p-6">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Shield className="w-4 h-4 md:w-5 md:h-5" />
              Pengaturan Watermark PDF
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="enableWatermark"
                    checked={enableWatermark}
                    onCheckedChange={(checked) => setEnableWatermark(checked as boolean)}
                  />
                  <Label htmlFor="enableWatermark" className="text-sm font-semibold text-gray-700">
                    Aktifkan Watermark
                  </Label>
                </div>
                <p className="text-xs md:text-sm text-gray-600">
                  Menambahkan watermark ADINA KAOS pada PDF untuk melindungi dokumen
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="watermarkOpacity" className="text-sm font-semibold text-gray-700">
                  Transparansi Watermark
                </Label>
                <Input
                  id="watermarkOpacity"
                  type="range"
                  min="0.05"
                  max="0.3"
                  step="0.05"
                  value={watermarkOpacity}
                  onChange={(e) => setWatermarkOpacity(Number.parseFloat(e.target.value))}
                  disabled={!enableWatermark}
                  className="w-full"
                />
                <div className="text-xs md:text-sm text-gray-600 text-center">
                  {Math.round(watermarkOpacity * 100)}% Opacity
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">Preview Watermark</Label>
                <div className="p-4 bg-gray-100 rounded-lg relative overflow-hidden h-16 md:h-20">
                  {enableWatermark && (
                    <>
                      <div
                        className="absolute inset-0 flex items-center justify-center transform rotate-12 text-orange-500 font-bold text-sm md:text-lg pointer-events-none select-none"
                        style={{ opacity: watermarkOpacity * 3 }}
                      >
                        ADINA KAOS
                      </div>
                      <div
                        className="absolute top-1 right-1 transform rotate-12 pointer-events-none select-none"
                        style={{ opacity: watermarkOpacity * 3 }}
                      >
                        <Image
                          src="/images/adina-logo.png"
                          alt="Logo"
                          width={30}
                          height={18}
                          className="object-contain md:w-[40px] md:h-[24px]"
                        />
                      </div>
                    </>
                  )}
                  <div className="relative z-10 text-xs md:text-sm text-gray-700">Sample invoice content...</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invoice Preview */}
        <Card className="shadow-xl border-0 bg-white">
          <CardHeader className="bg-gradient-to-r from-gray-700 to-gray-800 text-white rounded-t-lg p-4 md:p-6">
            <CardTitle className="text-base md:text-lg">Preview Invoice</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div id="invoice" className="bg-white p-4 md:p-8 relative">
              {/* Large LUNAS stamp in center - only show if fully paid */}
              {invoiceData.dpAmount >= grandTotal && grandTotal > 0 && <div className="lunas-stamp">✓ LUNAS</div>}

              {/* PDF Watermark Elements (hidden by default, shown only in PDF) */}
              <div
                className="pdf-watermark absolute inset-0 flex items-center justify-center transform rotate-45 text-orange-500 font-bold pointer-events-none select-none z-0"
                style={{
                  fontSize: "120px",
                  opacity: watermarkOpacity,
                  display: "none",
                }}
              >
                ADINA KAOS
              </div>
              <div
                className="pdf-watermark absolute top-1/4 right-1/4 transform rotate-12 pointer-events-none select-none z-0"
                style={{
                  opacity: watermarkOpacity,
                  display: "none",
                }}
              >
                <Image
                  src="/images/adina-logo.png"
                  alt="Watermark Logo"
                  width={200}
                  height={120}
                  className="object-contain"
                />
              </div>

              {/* Invoice Content */}
              <div className="relative z-10">
                {/* Invoice Header */}
                <div className="flex flex-col md:flex-row justify-between items-start mb-6 md:mb-8 border-b pb-4 md:pb-6 gap-4">
                  <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                    <Image
                      src="/images/adina-logo.png"
                      alt="ADINA KAOS Logo"
                      width={100}
                      height={60}
                      className="object-contain logo md:w-[120px] md:h-[80px]"
                    />
                    <div className="text-center md:text-left">
                      <p className="text-gray-600 font-medium text-sm md:text-base">Solo - Jawa Tengah</p>
                      <p className="text-gray-600 text-sm md:text-base">No. Handphone: 0856-4118-9772</p>
                    </div>
                  </div>
                  <div className="text-center md:text-right w-full md:w-auto">
                    <h3 className="text-2xl md:text-3xl font-bold mb-2 text-gray-800">INVOICE</h3>
                    <p className="text-lg md:text-xl font-semibold text-orange-600">#{invoiceData.invoiceNumber}</p>
                    <p className="text-gray-600 text-sm md:text-base">
                      Tanggal: {new Date(invoiceData.date).toLocaleDateString("id-ID")}
                    </p>
                  </div>
                </div>

                {/* Customer Info */}
                <div className="mb-6 md:mb-8 bg-gray-50 p-3 md:p-4 rounded-lg">
                  <h4 className="font-semibold mb-3 text-gray-800 text-sm md:text-base">Kepada:</h4>
                  <div className="space-y-1">
                    <p className="font-medium text-base md:text-lg">{invoiceData.customer || "Nama Pelanggan"}</p>
                    <p className="text-gray-600 flex items-center gap-2 text-sm md:text-base">
                      <MapPin className="w-4 h-4" />
                      {invoiceData.address || "Alamat Pelanggan"}
                    </p>
                    <p className="text-gray-600 flex items-center gap-2 text-sm md:text-base">
                      <Phone className="w-4 h-4" />
                      {invoiceData.phone || "No. Handphone"}
                    </p>
                  </div>
                </div>

                {/* Items Table */}
                <div className="mb-6 md:mb-8 mobile-scroll">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-100">
                        <TableHead className="font-semibold text-xs md:text-sm">Produk</TableHead>
                        <TableHead className="font-semibold text-xs md:text-sm mobile-hidden">Warna</TableHead>
                        <TableHead className="font-semibold text-xs md:text-sm mobile-hidden">Ukuran</TableHead>
                        <TableHead className="text-center font-semibold text-xs md:text-sm">Qty</TableHead>
                        <TableHead className="text-right font-semibold text-xs md:text-sm mobile-hidden">
                          Harga
                        </TableHead>
                        <TableHead className="text-right font-semibold text-xs md:text-sm">Total</TableHead>
                        <TableHead className="w-8 md:w-12 pdf-hide"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoiceData.items.map((item, index) => (
                        <TableRow key={index} className="hover:bg-gray-50">
                          <TableCell className="font-medium text-xs md:text-sm">
                            <div>
                              <div>{item.product}</div>
                              <div className="md:hidden text-xs text-gray-500">
                                {item.color} - {item.size}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="mobile-hidden text-xs md:text-sm">{item.color}</TableCell>
                          <TableCell className="mobile-hidden text-xs md:text-sm">{item.size}</TableCell>
                          <TableCell className="text-center text-xs md:text-sm">{item.quantity}</TableCell>
                          <TableCell className="text-right mobile-hidden text-xs md:text-sm">
                            {formatCurrency(item.unitPrice)}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-xs md:text-sm">
                            {formatCurrency(item.total)}
                          </TableCell>
                          <TableCell className="pdf-hide">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveItem(index)}
                              className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1"
                            >
                              <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {invoiceData.items.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-gray-500 py-8 md:py-12">
                            <ShoppingBag className="w-8 h-8 md:w-12 md:h-12 mx-auto mb-4 text-gray-300" />
                            <span className="text-sm md:text-base">Belum ada item yang ditambahkan</span>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Total Section with DP */}
                <div className="mb-6 md:mb-8 space-y-4">
                  <div className="flex justify-end">
                    <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 md:p-6 rounded-lg shadow-lg w-full md:min-w-80 md:w-auto">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-base md:text-xl">
                          <span>Subtotal:</span>
                          <span className="font-bold">{formatCurrency(grandTotal)}</span>
                        </div>
                        {invoiceData.dpAmount > 0 && (
                          <>
                            <div className="border-t border-orange-300 pt-2">
                              <div className="flex justify-between items-center text-sm md:text-lg">
                                <span>DP Dibayar:</span>
                                <span className="font-semibold">- {formatCurrency(invoiceData.dpAmount)}</span>
                              </div>
                            </div>
                            <div className="border-t border-orange-300 pt-2">
                              <div className="flex justify-between items-center text-lg md:text-2xl font-bold">
                                <span>Sisa Bayar:</span>
                                <span>{formatCurrency(remainingBalance)}</span>
                              </div>
                            </div>
                          </>
                        )}
                        {invoiceData.dpAmount === 0 && (
                          <div className="border-t border-orange-300 pt-2">
                            <div className="flex justify-between items-center text-lg md:text-2xl font-bold">
                              <span>Total Bayar:</span>
                              <span>{formatCurrency(grandTotal)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {invoiceData.note && (
                  <div className="border-t pt-4 md:pt-6 mb-6 md:mb-8">
                    <h4 className="font-semibold mb-3 text-gray-800 text-sm md:text-base">Catatan:</h4>
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 md:p-4 rounded">
                      <p className="text-gray-700 text-sm md:text-base">{invoiceData.note}</p>
                    </div>
                  </div>
                )}

                {/* Payment Information */}
                <div className="border-t pt-4 md:pt-6 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 md:p-6 rounded-lg payment-info">
                  <h4 className="font-bold mb-4 text-base md:text-lg text-gray-800">Informasi Pembayaran</h4>
                  <div className="space-y-3">
                    <p className="font-semibold text-gray-700 text-sm md:text-base">
                      {invoiceData.dpAmount > 0 && remainingBalance > 0
                        ? "Sisa pembayaran dapat ditransfer ke:"
                        : "Info pembayaran dapat ditransfer ke:"}
                    </p>
                    <p className="text-base md:text-lg font-bold text-blue-600">Maria Goreti Nugrahardina</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white p-3 md:p-4 rounded-lg shadow-sm border-l-4 border-blue-500">
                        <p className="font-semibold text-gray-700 text-sm md:text-base">Bank MANDIRI</p>
                        <p className="text-lg md:text-xl font-mono font-bold text-blue-600">1360004826878</p>
                      </div>
                      <div className="bg-white p-3 md:p-4 rounded-lg shadow-sm border-l-4 border-green-500">
                        <p className="font-semibold text-gray-700 text-sm md:text-base">Bank BRI</p>
                        <p className="text-lg md:text-xl font-mono font-bold text-green-600">0097 0112 2186 505</p>
                      </div>
                    </div>
                    {invoiceData.dpAmount > 0 && remainingBalance > 0 && (
                      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 md:p-4 rounded">
                        <p className="font-semibold text-yellow-800 text-sm md:text-base">
                          DP sebesar {formatCurrency(invoiceData.dpAmount)} telah dibayar.
                        </p>
                        <p className="font-semibold text-yellow-800 text-sm md:text-base">
                          Sisa pembayaran: {formatCurrency(remainingBalance)}
                        </p>
                      </div>
                    )}
                    <p className="text-xs md:text-sm text-gray-600 bg-white p-3 rounded border-l-4 border-yellow-400">
                      Setelah melakukan transfer dapat mengirimkan bukti transfer
                    </p>
                    <p className="font-bold text-center text-lg md:text-xl text-orange-600 bg-white p-3 md:p-4 rounded-lg shadow-sm">
                      TERIMA KASIH
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes and Actions */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-t-lg p-4 md:p-6">
            <CardTitle className="text-base md:text-lg">Catatan & Aksi</CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 space-y-4 md:space-y-6">
            <div className="space-y-2">
              <Label htmlFor="note" className="text-sm font-semibold text-gray-700">
                Catatan Tambahan
              </Label>
              <Textarea
                id="note"
                placeholder="Masukkan catatan tambahan untuk invoice..."
                value={invoiceData.note}
                onChange={(e) => setInvoiceData({ ...invoiceData, note: e.target.value })}
                rows={4}
                className="border-2 border-gray-200 focus:border-green-400 transition-colors text-sm md:text-base"
              />
            </div>

            <div className="flex flex-col md:flex-row gap-2 md:gap-4">
              <Button
                onClick={generatePDF}
                disabled={isGeneratingPDF}
                className="w-full md:w-auto bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-800 hover:to-gray-900 text-white shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 text-sm md:text-base"
              >
                <Download className="w-4 h-4 mr-2" />
                {isGeneratingPDF ? "Membuat PDF..." : "Unduh PDF"}
              </Button>
              <Button
                onClick={generatePDFPrint}
                className="w-full md:w-auto bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-lg transform hover:scale-105 transition-all duration-200 text-sm md:text-base"
              >
                <Download className="w-4 h-4 mr-2" />
                Print PDF
              </Button>
              <Button
                onClick={handleSave}
                className="w-full md:w-auto bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg transform hover:scale-105 transition-all duration-200 text-sm md:text-base"
              >
                <Save className="w-4 h-4 mr-2" />
                Simpan Invoice
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Developer Footer */}
        <div className="mt-8 md:mt-12 py-6 md:py-8 border-t border-gray-200 bg-white/60 backdrop-blur-sm rounded-lg">
          <div className="text-center space-y-2">
            <p className="text-xs md:text-sm text-gray-600">Aplikasi Invoice Otomatis ini dikembangkan oleh</p>
            <p className="text-base md:text-lg font-bold text-orange-600">Bikin Teknologi Asik - SMG</p>
            <p className="text-xs text-gray-500">© 2025 - Solusi teknologi untuk kemudahan bisnis Anda</p>
          </div>
        </div>
      </div>
    </div>
  )
}
