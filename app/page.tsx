"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  FileText,
  Search,
  Eye,
  ArrowLeft,
  Calendar,
  User,
  DollarSign,
  Package,
  CreditCard,
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
  Download,
  Printer,
  MapPin,
  Phone,
} from "lucide-react"
import Link from "next/link"
import { Label } from "@/components/ui/label"

interface InvoiceLog {
  invoiceNumber: string
  customer: string
  address: string
  phone: string
  date: string
  grandTotal: number
  itemCount: number
  createdAt: string
  updatedAt: string
  fileName: string
  paymentStatus: "unpaid" | "partial" | "paid"
  paidAmount: number
  remainingAmount: number
  dpAmount: number
}

interface PaymentHistory {
  date: string
  amount: number
  method: string
  note: string
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceLog[]>([])
  const [filteredInvoices, setFilteredInvoices] = useState<InvoiceLog[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [paymentFilter, setPaymentFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("Transfer")
  const [paymentNote, setPaymentNote] = useState("")
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [logoBase64, setLogoBase64] = useState("")

  useEffect(() => {
    fetchInvoices()
    convertLogoToBase64()
  }, [])

  useEffect(() => {
    let filtered = invoices.filter(
      (invoice) =>
        invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.customer.toLowerCase().includes(searchTerm.toLowerCase()),
    )

    // Apply payment status filter
    if (paymentFilter !== "all") {
      filtered = filtered.filter((invoice) => invoice.paymentStatus === paymentFilter)
    }

    setFilteredInvoices(filtered)
  }, [searchTerm, invoices, paymentFilter])

  const convertLogoToBase64 = async () => {
    try {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      const img = new Image()

      img.crossOrigin = "anonymous"
      img.onload = () => {
        canvas.width = img.width
        canvas.height = img.height
        ctx?.drawImage(img, 0, 0)
        const base64 = canvas.toDataURL("image/png")
        setLogoBase64(base64)
      }

      // Try to load the logo
      img.src = "/images/adina-logo.png"
    } catch (error) {
      console.error("Error converting logo to base64:", error)
      // Fallback: use a simple text logo
      setLogoBase64("")
    }
  }

  const fetchInvoices = async () => {
    try {
      const response = await fetch("/api/save")
      const result = await response.json()
      if (result.success) {
        setInvoices(result.invoices.reverse()) // Show newest first
        setFilteredInvoices(result.invoices.reverse())
      }
    } catch (error) {
      console.error("Error fetching invoices:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchInvoiceDetail = async (invoiceNumber: string) => {
    try {
      const response = await fetch(`/api/save?invoice=${invoiceNumber}`)
      const result = await response.json()
      if (result.success) {
        setSelectedInvoice(result.invoice)
        setShowDetail(true)
      }
    } catch (error) {
      console.error("Error fetching invoice detail:", error)
      alert("Gagal memuat detail invoice")
    }
  }

  const handlePayment = async () => {
    if (!paymentAmount || Number.parseFloat(paymentAmount) <= 0) {
      alert("Masukkan jumlah pembayaran yang valid")
      return
    }

    if (Number.parseFloat(paymentAmount) > selectedInvoice.remainingAmount) {
      alert("Jumlah pembayaran tidak boleh melebihi sisa tagihan")
      return
    }

    try {
      const response = await fetch("/api/save", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceNumber: selectedInvoice.invoiceNumber,
          paymentAmount: Number.parseFloat(paymentAmount),
          paymentMethod,
          paymentNote,
        }),
      })

      const result = await response.json()
      if (result.success) {
        alert("Pembayaran berhasil dicatat!")
        setShowPaymentForm(false)
        setPaymentAmount("")
        setPaymentNote("")
        // Refresh invoice detail
        fetchInvoiceDetail(selectedInvoice.invoiceNumber)
        // Refresh invoice list
        fetchInvoices()
      } else {
        alert("Gagal mencatat pembayaran: " + result.message)
      }
    } catch (error) {
      console.error("Error recording payment:", error)
      alert("Gagal mencatat pembayaran")
    }
  }

  const generateInvoicePDF = async (invoice: any) => {
    if (!invoice) return

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
        generateInvoicePDFPrint(invoice)
        setIsGeneratingPDF(false)
        return
      }

      // Create temporary invoice element
      const tempDiv = document.createElement("div")
      tempDiv.innerHTML = createInvoiceHTML(invoice, true) // Pass true for PDF version
      tempDiv.style.position = "absolute"
      tempDiv.style.left = "-9999px"
      tempDiv.style.top = "0"
      tempDiv.style.width = "800px"
      document.body.appendChild(tempDiv)

      // Configure PDF options
      const opt = {
        margin: [0.5, 0.5, 0.5, 0.5],
        filename: `Invoice-${invoice.invoiceNumber}.pdf`,
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
        // Check if html2pdf is a function
        if (typeof html2pdf === "function") {
          await html2pdf().set(opt).from(tempDiv).save()
          alert("PDF berhasil diunduh!")
        } else {
          throw new Error("html2pdf is not a function")
        }
      } catch (pdfError) {
        console.error("PDF generation failed:", pdfError)
        // Fallback to print method
        generateInvoicePDFPrint(invoice)
      }

      // Clean up
      if (document.body.contains(tempDiv)) {
        document.body.removeChild(tempDiv)
      }
    } catch (error) {
      console.error("Error generating PDF:", error)
      // Fallback to print method
      generateInvoicePDFPrint(invoice)
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  const generateInvoicePDFPrint = (invoice: any) => {
    const printWindow = window.open("", "_blank")
    if (printWindow) {
      const isFullyPaid = invoice.paymentStatus === "paid"

      const logoSrc = logoBase64 || "/images/adina-logo.png"

      const watermarkStyle = `
        .watermark {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
          font-size: 120px;
          font-weight: bold;
          color: rgba(249, 115, 22, 0.1);
          z-index: -1;
          pointer-events: none;
          user-select: none;
          font-family: Arial, sans-serif;
        }
        .watermark-logo {
          position: fixed;
          top: 20%;
          right: 10%;
          opacity: 0.1;
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
          background: linear-gradient(45deg, #10b981, #059669);
          color: white;
          padding: 30px 60px;
          border-radius: 20px;
          font-size: 48px;
          font-weight: bold;
          border: 8px solid #047857;
          box-shadow: 0 0 30px rgba(16, 185, 129, 0.5);
          z-index: 10;
          opacity: 0.9;
          pointer-events: none;
          user-select: none;
        }
        .payment-status {
          position: absolute;
          top: 20px;
          right: 20px;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: bold;
          font-size: 16px;
        }
        .status-paid {
          background: #10b981;
          color: white;
          transform: rotate(15deg);
        }
        .status-partial {
          background: #f59e0b;
          color: white;
          transform: rotate(15deg);
        }
        .status-unpaid {
          background: #ef4444;
          color: white;
          transform: rotate(15deg);
        }
        .logo-img {
          max-width: 120px;
          height: auto;
          display: block;
        }
      `

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Invoice ${invoice.invoiceNumber}</title>
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
              ${watermarkStyle}
              @media print {
                body { margin: 0; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            <div class="watermark">ADINA KAOS</div>
            <div class="watermark-logo">
              <img src="${logoSrc}" alt="ADINA KAOS Watermark" />
            </div>
            ${isFullyPaid ? '<div class="lunas-stamp">✓ LUNAS</div>' : ""}
            <div class="invoice-container">
              ${createInvoiceHTML(invoice, false, logoSrc)} 
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
  }

  const createInvoiceHTML = (invoice: any, isPDF = false, logoSrc?: string) => {
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
      }).format(amount)
    }

    const getStatusClass = (status: string) => {
      switch (status) {
        case "paid":
          return "status-paid"
        case "partial":
          return "status-partial"
        default:
          return "status-unpaid"
      }
    }

    const getStatusText = (status: string) => {
      switch (status) {
        case "paid":
          return "LUNAS"
        case "partial":
          return "SEBAGIAN"
        default:
          return "BELUM BAYAR"
      }
    }

    // Use base64 logo for PDF, or provided logoSrc, or fallback
    const finalLogoSrc = isPDF && logoBase64 ? logoBase64 : logoSrc || "/images/adina-logo.png"

    // Fallback logo content if image fails
    const logoContent =
      logoBase64 || logoSrc
        ? `<img src="${finalLogoSrc}" alt="ADINA KAOS Logo" class="logo-img" />`
        : `<div style="width: 120px; height: 80px; background: linear-gradient(45deg, #f97316, #ea580c); color: white; display: flex; align-items: center; justify-content: center; border-radius: 8px; font-weight: bold; font-size: 14px;">ADINA<br>KAOS</div>`

    return `
      <div class="payment-status ${getStatusClass(invoice.paymentStatus)}">
        ${getStatusText(invoice.paymentStatus)}
      </div>
      
      <!-- Invoice Header -->
      <div class="header-section">
        <div class="company-info">
          ${logoContent}
          <div>
            <p style="margin: 0; font-weight: 500;">Solo - Jawa Tengah</p>
            <p style="margin: 0;">No. Handphone: 0856-4118-9772</p>
          </div>
        </div>
        <div class="invoice-title">
          <h3 style="font-size: 2rem; margin-bottom: 8px;">INVOICE</h3>
          <p style="font-size: 1.25rem; font-weight: 600; color: #f97316; margin: 0;">#${invoice.invoiceNumber}</p>
          <p style="margin: 0;">Tanggal: ${new Date(invoice.date).toLocaleDateString("id-ID")}</p>
        </div>
      </div>

      <!-- Customer Info -->
      <div class="customer-info">
        <h4 style="margin-bottom: 12px; font-weight: 600;">Kepada:</h4>
        <div>
          <p style="margin: 4px 0; font-size: 1.125rem; font-weight: 500;">${invoice.customer}</p>
          <p style="margin: 4px 0; color: #666;">${invoice.address || "Alamat Pelanggan"}</p>
          <p style="margin: 4px 0; color: #666;">${invoice.phone || "No. Handphone"}</p>
        </div>
      </div>

      <!-- Items Table -->
      <table>
        <thead>
          <tr style="background-color: #f5f5f5;">
            <th>Produk</th>
            <th>Warna</th>
            <th>Ukuran</th>
            <th style="text-align: center;">Qty</th>
            <th style="text-align: right;">Harga Satuan</th>
            <th style="text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${invoice.items
            .map(
              (item: any) => `
            <tr>
              <td style="font-weight: 500;">${item.product}</td>
              <td>${item.color}</td>
              <td>${item.size}</td>
              <td style="text-align: center;">${item.quantity}</td>
              <td style="text-align: right;">${formatCurrency(item.unitPrice)}</td>
              <td style="text-align: right; font-weight: 600;">${formatCurrency(item.total)}</td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>

      <!-- Payment Summary -->
      <div style="display: flex; justify-content: flex-end; margin: 20px 0;">
        <div class="total-section" style="min-width: 320px;">
          <div style="margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 1.25rem;">
              <span>Subtotal:</span>
              <span style="font-weight: bold;">${formatCurrency(invoice.grandTotal)}</span>
            </div>
          </div>
          ${
            invoice.paidAmount > 0
              ? `
            <div style="border-top: 1px solid rgba(255,255,255,0.3); padding-top: 8px; margin-bottom: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 1rem;">
                <span>Sudah Dibayar:</span>
                <span style="font-weight: 600;">- ${formatCurrency(invoice.paidAmount)}</span>
              </div>
            </div>
            <div style="border-top: 1px solid rgba(255,255,255,0.3); padding-top: 8px;">
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 1.5rem; font-weight: bold;">
                <span>Sisa Bayar:</span>
                <span>${formatCurrency(invoice.remainingAmount)}</span>
              </div>
            </div>
          `
              : `
            <div style="border-top: 1px solid rgba(255,255,255,0.3); padding-top: 8px;">
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 1.5rem; font-weight: bold;">
                <span>Total Bayar:</span>
                <span>${formatCurrency(invoice.grandTotal)}</span>
              </div>
            </div>
          `
          }
        </div>
      </div>

      ${
        invoice.paymentHistory && invoice.paymentHistory.length > 0
          ? `
        <!-- Payment History -->
        <div style="margin: 20px 0;">
          <h4 style="font-weight: 600; margin-bottom: 12px;">Riwayat Pembayaran:</h4>
          <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
            ${invoice.paymentHistory
              .map(
                (payment: PaymentHistory) => `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                <div>
                  <p style="margin: 0; font-weight: 500; font-size: 0.875rem;">${payment.note}</p>
                  <p style="margin: 0; font-size: 0.75rem; color: #666;">
                    ${new Date(payment.date).toLocaleDateString("id-ID")} • ${payment.method}
                  </p>
                </div>
                <p style="margin: 0; font-weight: bold; color: #3b82f6;">${formatCurrency(payment.amount)}</p>
              </div>
            `,
              )
              .join("")}
          </div>
        </div>
      `
          : ""
      }

      ${
        invoice.note
          ? `
        <!-- Notes -->
        <div style="border-top: 1px solid #ddd; padding-top: 20px; margin: 20px 0;">
          <h4 style="font-weight: 600; margin-bottom: 12px;">Catatan:</h4>
          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px;">
            <p style="margin: 0; color: #374151;">${invoice.note}</p>
          </div>
        </div>
      `
          : ""
      }

      <!-- Payment Information -->
      <div class="payment-info">
        <h4 style="font-weight: bold; margin-bottom: 16px; font-size: 1.125rem;">Informasi Pembayaran</h4>
        <div>
          <p style="font-weight: 600; margin-bottom: 8px;">
            ${
              invoice.paidAmount > 0 && invoice.remainingAmount > 0
                ? "Sisa pembayaran dapat ditransfer ke:"
                : "Info pembayaran dapat ditransfer ke:"
            }
          </p>
          <p style="font-size: 1.125rem; font-weight: bold; color: #3b82f6; margin-bottom: 16px;">Maria Goreti Nugrahardina</p>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div class="bank-info">
              <p style="margin: 0 0 8px 0; font-weight: 600;">Bank MANDIRI</p>
              <p style="margin: 0; font-size: 1.25rem; font-family: monospace; font-weight: bold; color: #3b82f6;">1360004826878</p>
            </div>
            <div class="bank-info" style="border-left-color: #10b981;">
              <p style="margin: 0 0 8px 0; font-weight: 600;">Bank BRI</p>
              <p style="margin: 0; font-size: 1.25rem; font-family: monospace; font-weight: bold; color: #10b981;">0097 0112 2186 505</p>
            </div>
          </div>
          ${
            invoice.paidAmount > 0 && invoice.remainingAmount > 0
              ? `
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px; margin: 16px 0;">
              <p style="margin: 0 0 4px 0; font-weight: 600; color: #92400e;">
                DP sebesar ${formatCurrency(invoice.paidAmount)} telah dibayar.
              </p>
              <p style="margin: 0; font-weight: 600; color: #92400e;">
                Sisa pembayaran: ${formatCurrency(invoice.remainingAmount)}
              </p>
            </div>
          `
              : ""
          }
          <p style="font-size: 0.875rem; color: #666; background: white; padding: 12px; border-radius: 4px; border-left: 4px solid #f59e0b; margin: 16px 0;">
            Setelah melakukan transfer dapat mengirimkan bukti transfer
          </p>
          <p style="font-weight: bold; text-align: center; font-size: 1.25rem; color: #f97316; background: white; padding: 16px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin: 0;">
            TERIMA KASIH
          </p>
        </div>
      </div>
    `
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            LUNAS
          </Badge>
        )
      case "partial":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Clock className="w-3 h-3 mr-1" />
            SEBAGIAN
          </Badge>
        )
      default:
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            <AlertCircle className="w-3 h-3 mr-1" />
            BELUM BAYAR
          </Badge>
        )
    }
  }

  const getPaymentStamp = (status: string) => {
    if (status === "paid") {
      return (
        <div className="absolute top-4 right-4 transform rotate-12">
          <div className="bg-green-500 text-white px-4 py-2 rounded-lg font-bold text-lg shadow-lg border-2 border-green-600">
            ✓ LUNAS
          </div>
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 md:h-12 md:w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm md:text-base">Memuat data invoice...</p>
        </div>
      </div>
    )
  }

  if (showDetail && selectedInvoice) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100">
        <div className="max-w-4xl mx-auto p-3 md:p-6 space-y-4 md:space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4 mb-4 md:mb-6">
            <Button onClick={() => setShowDetail(false)} variant="outline" size="sm" className="text-sm md:text-base">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali
            </Button>
            <h1 className="text-xl md:text-2xl font-bold text-orange-600">Detail Invoice</h1>
            <div className="flex gap-2 ml-auto">
              <Button
                onClick={() => generateInvoicePDF(selectedInvoice)}
                disabled={isGeneratingPDF}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm"
              >
                <Download className="w-4 h-4 mr-2" />
                {isGeneratingPDF ? "Membuat..." : "Unduh PDF"}
              </Button>
              <Button onClick={() => generateInvoicePDFPrint(selectedInvoice)} variant="outline" className="text-sm">
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
            </div>
          </div>

          {/* Invoice Detail */}
          <Card className="shadow-lg border-0 bg-white relative">
            {getPaymentStamp(selectedInvoice.paymentStatus)}
            <CardHeader className="bg-gradient-to-r from-gray-700 to-gray-800 text-white rounded-t-lg p-4 md:p-6">
              <CardTitle className="text-base md:text-lg flex items-center justify-between">
                <span>Invoice #{selectedInvoice.invoiceNumber}</span>
                {getPaymentStatusBadge(selectedInvoice.paymentStatus)}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              {/* Customer Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-800 text-sm md:text-base">Informasi Pelanggan</h3>
                  <div className="space-y-2">
                    <p className="flex items-center gap-2 text-sm md:text-base">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">{selectedInvoice.customer}</span>
                    </p>
                    <p className="flex items-center gap-2 text-sm md:text-base">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <span>{selectedInvoice.address || "Alamat tidak tersedia"}</span>
                    </p>
                    <p className="flex items-center gap-2 text-sm md:text-base">
                      <Phone className="w-4 h-4 text-gray-500" />
                      <span>{selectedInvoice.phone || "No. HP tidak tersedia"}</span>
                    </p>
                    <p className="flex items-center gap-2 text-sm md:text-base">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span>{new Date(selectedInvoice.date).toLocaleDateString("id-ID")}</span>
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-800 text-sm md:text-base">Ringkasan</h3>
                  <div className="space-y-2">
                    <p className="flex items-center gap-2 text-sm md:text-base">
                      <Package className="w-4 h-4 text-gray-500" />
                      <span>{selectedInvoice.itemCount} Item</span>
                    </p>
                    <p className="flex items-center gap-2 text-sm md:text-base">
                      <DollarSign className="w-4 h-4 text-gray-500" />
                      <span className="font-semibold text-orange-600">
                        {formatCurrency(selectedInvoice.grandTotal)}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment Status Summary */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-3 text-sm md:text-base">Status Pembayaran</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Total Tagihan</p>
                    <p className="text-lg font-bold text-gray-800">{formatCurrency(selectedInvoice.grandTotal)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Sudah Dibayar</p>
                    <p className="text-lg font-bold text-green-600">{formatCurrency(selectedInvoice.paidAmount)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Sisa Tagihan</p>
                    <p className="text-lg font-bold text-red-600">{formatCurrency(selectedInvoice.remainingAmount)}</p>
                  </div>
                </div>
              </div>

              {/* Payment History */}
              {selectedInvoice.paymentHistory && selectedInvoice.paymentHistory.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-800 mb-3 text-sm md:text-base">Riwayat Pembayaran</h3>
                  <div className="space-y-2">
                    {selectedInvoice.paymentHistory.map((payment: PaymentHistory, index: number) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{payment.note}</p>
                          <p className="text-xs text-gray-500">
                            {formatDate(payment.date)} • {payment.method}
                          </p>
                        </div>
                        <p className="font-bold text-blue-600">{formatCurrency(payment.amount)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add Payment Button */}
              {selectedInvoice.paymentStatus !== "paid" && (
                <div className="mb-6">
                  <Button
                    onClick={() => setShowPaymentForm(!showPaymentForm)}
                    className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Tambah Pembayaran
                  </Button>
                </div>
              )}

              {/* Payment Form */}
              {showPaymentForm && (
                <Card className="mb-6 border-green-200">
                  <CardHeader className="bg-green-50">
                    <CardTitle className="text-green-800 text-base">Tambah Pembayaran</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="paymentAmount">Jumlah Pembayaran</Label>
                        <Input
                          id="paymentAmount"
                          type="number"
                          placeholder="Masukkan jumlah"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          max={selectedInvoice.remainingAmount}
                        />
                        <p className="text-xs text-gray-500">
                          Maksimal: {formatCurrency(selectedInvoice.remainingAmount)}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="paymentMethod">Metode Pembayaran</Label>
                        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Transfer">Transfer Bank</SelectItem>
                            <SelectItem value="Cash">Tunai</SelectItem>
                            <SelectItem value="E-Wallet">E-Wallet</SelectItem>
                            <SelectItem value="Other">Lainnya</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="paymentNote">Catatan</Label>
                      <Input
                        id="paymentNote"
                        placeholder="Catatan pembayaran (opsional)"
                        value={paymentNote}
                        onChange={(e) => setPaymentNote(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handlePayment} className="bg-green-600 hover:bg-green-700">
                        <CreditCard className="w-4 h-4 mr-2" />
                        Simpan Pembayaran
                      </Button>
                      <Button variant="outline" onClick={() => setShowPaymentForm(false)}>
                        Batal
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Items Table */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-800 mb-3 text-sm md:text-base">Detail Item</h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-100">
                        <TableHead className="font-semibold text-xs md:text-sm">Produk</TableHead>
                        <TableHead className="font-semibold text-xs md:text-sm hidden md:table-cell">Warna</TableHead>
                        <TableHead className="font-semibold text-xs md:text-sm hidden md:table-cell">Ukuran</TableHead>
                        <TableHead className="text-center font-semibold text-xs md:text-sm">Qty</TableHead>
                        <TableHead className="text-right font-semibold text-xs md:text-sm hidden md:table-cell">
                          Harga
                        </TableHead>
                        <TableHead className="text-right font-semibold text-xs md:text-sm">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedInvoice.items.map((item: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium text-xs md:text-sm">
                            <div>
                              <div>{item.product}</div>
                              <div className="md:hidden text-xs text-gray-500">
                                {item.color} - {item.size}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-xs md:text-sm">{item.color}</TableCell>
                          <TableCell className="hidden md:table-cell text-xs md:text-sm">{item.size}</TableCell>
                          <TableCell className="text-center text-xs md:text-sm">{item.quantity}</TableCell>
                          <TableCell className="text-right hidden md:table-cell text-xs md:text-sm">
                            {formatCurrency(item.unitPrice)}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-xs md:text-sm">
                            {formatCurrency(item.total)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Payment Summary */}
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 md:p-6 rounded-lg">
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-base md:text-xl">
                    <span>Subtotal:</span>
                    <span className="font-bold">{formatCurrency(selectedInvoice.grandTotal)}</span>
                  </div>
                  {selectedInvoice.paidAmount > 0 && (
                    <>
                      <div className="border-t border-orange-300 pt-2">
                        <div className="flex justify-between items-center text-sm md:text-lg">
                          <span>Sudah Dibayar:</span>
                          <span className="font-semibold">- {formatCurrency(selectedInvoice.paidAmount)}</span>
                        </div>
                      </div>
                      <div className="border-t border-orange-300 pt-2">
                        <div className="flex justify-between items-center text-lg md:text-2xl font-bold">
                          <span>Sisa Bayar:</span>
                          <span>{formatCurrency(selectedInvoice.remainingAmount)}</span>
                        </div>
                      </div>
                    </>
                  )}
                  {selectedInvoice.paidAmount === 0 && (
                    <div className="border-t border-orange-300 pt-2">
                      <div className="flex justify-between items-center text-lg md:text-2xl font-bold">
                        <span>Total Bayar:</span>
                        <span>{formatCurrency(selectedInvoice.grandTotal)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              {selectedInvoice.note && (
                <div className="mt-6">
                  <h3 className="font-semibold text-gray-800 mb-3 text-sm md:text-base">Catatan</h3>
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 md:p-4 rounded">
                    <p className="text-gray-700 text-sm md:text-base">{selectedInvoice.note}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100">
      <div className="max-w-7xl mx-auto p-3 md:p-6 space-y-4 md:space-y-8">
        {/* Header */}
        <div className="text-center py-4 md:py-8">
          <h1 className="text-2xl md:text-4xl font-bold text-orange-600 mb-2">Riwayat Transaksi</h1>
          <p className="text-gray-600 text-base md:text-lg font-medium">ADINA KAOS</p>
          <div className="w-16 md:w-24 h-1 bg-gradient-to-r from-orange-400 to-orange-600 mx-auto mt-2 rounded-full"></div>
        </div>

        {/* Actions and Filters */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <Link href="/">
            <Button className="w-full md:w-auto bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-sm md:text-base">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Buat Invoice Baru
            </Button>
          </Link>

          <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
            {/* Payment Status Filter */}
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="unpaid">Belum Bayar</SelectItem>
                <SelectItem value="partial">Sebagian</SelectItem>
                <SelectItem value="paid">Lunas</SelectItem>
              </SelectContent>
            </Select>

            {/* Search */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Search className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
              <Input
                placeholder="Cari invoice atau pelanggan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full md:w-64 text-sm md:text-base"
              />
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Total Invoice</p>
                  <p className="text-xl font-bold">{invoices.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Lunas</p>
                  <p className="text-xl font-bold">{invoices.filter((inv) => inv.paymentStatus === "paid").length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-600" />
                <div>
                  <p className="text-sm text-gray-600">Sebagian</p>
                  <p className="text-xl font-bold">
                    {invoices.filter((inv) => inv.paymentStatus === "partial").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <div>
                  <p className="text-sm text-gray-600">Belum Bayar</p>
                  <p className="text-xl font-bold">{invoices.filter((inv) => inv.paymentStatus === "unpaid").length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invoice List */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-gray-700 to-gray-800 text-white rounded-t-lg p-4 md:p-6">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <FileText className="w-4 h-4 md:w-5 md:h-5" />
              Invoice Tersimpan ({filteredInvoices.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filteredInvoices.length === 0 ? (
              <div className="text-center py-8 md:py-12">
                <FileText className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500 text-base md:text-lg">
                  {searchTerm || paymentFilter !== "all"
                    ? "Tidak ada invoice yang sesuai dengan filter"
                    : "Belum ada invoice tersimpan"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-100">
                      <TableHead className="font-semibold text-xs md:text-sm">No. Invoice</TableHead>
                      <TableHead className="font-semibold text-xs md:text-sm">Pelanggan</TableHead>
                      <TableHead className="font-semibold text-xs md:text-sm hidden md:table-cell">Tanggal</TableHead>
                      <TableHead className="text-center font-semibold text-xs md:text-sm hidden md:table-cell">
                        Items
                      </TableHead>
                      <TableHead className="text-right font-semibold text-xs md:text-sm">Total</TableHead>
                      <TableHead className="text-center font-semibold text-xs md:text-sm">Status</TableHead>
                      <TableHead className="text-center font-semibold text-xs md:text-sm">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((invoice, index) => (
                      <TableRow key={index} className="hover:bg-gray-50">
                        <TableCell className="font-mono font-semibold text-orange-600 text-xs md:text-sm">
                          {invoice.invoiceNumber}
                        </TableCell>
                        <TableCell className="font-medium text-xs md:text-sm">
                          <div>
                            <div>{invoice.customer}</div>
                            <div className="md:hidden text-xs text-gray-500">
                              {new Date(invoice.date).toLocaleDateString("id-ID")} • {invoice.itemCount} items
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-xs md:text-sm">
                          {new Date(invoice.date).toLocaleDateString("id-ID")}
                        </TableCell>
                        <TableCell className="text-center hidden md:table-cell text-xs md:text-sm">
                          {invoice.itemCount}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-xs md:text-sm">
                          <div>
                            <div>{formatCurrency(invoice.grandTotal)}</div>
                            {invoice.remainingAmount > 0 && (
                              <div className="text-xs text-red-600">
                                Sisa: {formatCurrency(invoice.remainingAmount)}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{getPaymentStatusBadge(invoice.paymentStatus)}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex gap-1 justify-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => fetchInvoiceDetail(invoice.invoiceNumber)}
                              className="text-xs md:text-sm"
                            >
                              <Eye className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                              <span className="hidden md:inline">Detail</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => generateInvoicePDF(invoice)}
                              disabled={isGeneratingPDF}
                              className="text-xs md:text-sm bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-200"
                            >
                              <Download className="w-3 h-3 md:w-4 md:h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
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
