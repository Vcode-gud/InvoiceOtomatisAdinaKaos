"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Trash2, Download, Save, Plus, User, MapPin, Phone, ShoppingBag } from "lucide-react"
import html2pdf from "html2pdf.js"
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
  })

  const [currentItem, setCurrentItem] = useState({
    product: "",
    color: "",
    size: "",
    quantity: 1,
    unitPrice: 0,
  })

  useEffect(() => {
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
  }, [])

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

  const generatePDF = () => {
    const element = document.getElementById("invoice")
    if (element) {
      // Hide interactive elements before generating PDF
      const interactiveElements = element.querySelectorAll(".pdf-hide")
      interactiveElements.forEach((el) => {
        ;(el as HTMLElement).style.display = "none"
      })

      const opt = {
        margin: 0.5,
        filename: `Invoice-${invoiceData.invoiceNumber}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: true,
        },
        jsPDF: {
          unit: "in",
          format: "a4",
          orientation: "portrait",
        },
      }

      html2pdf()
        .set(opt)
        .from(element)
        .save()
        .then(() => {
          // Show interactive elements back after PDF generation
          interactiveElements.forEach((el) => {
            ;(el as HTMLElement).style.display = ""
          })
          alert("PDF berhasil diunduh!")
        })
        .catch((error) => {
          console.error("Error generating PDF:", error)
          alert("Gagal mengunduh PDF")
          // Show interactive elements back even if there's an error
          interactiveElements.forEach((el) => {
            ;(el as HTMLElement).style.display = ""
          })
        })
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header with Logo */}
        <div className="text-center py-8">
          <div className="flex justify-center items-center mb-4">
            <Image
              src="/images/adina-logo.png"
              alt="ADINA KAOS Logo"
              width={200}
              height={120}
              className="object-contain"
            />
          </div>
          <p className="text-gray-600 text-lg font-medium">Invoice Otomatis ADINA KAOS</p>
          <div className="w-24 h-1 bg-gradient-to-r from-orange-400 to-orange-600 mx-auto mt-2 rounded-full"></div>
        </div>

        {/* Customer Information */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Informasi Pelanggan
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                  className="border-2 border-gray-200 focus:border-orange-400 transition-colors"
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
                  className="border-2 border-gray-200 focus:border-orange-400 transition-colors"
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
                  className="border-2 border-gray-200 focus:border-orange-400 transition-colors"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add Item Form */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              Tambah Item Produk
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">Produk</Label>
                <Select
                  value={currentItem.product}
                  onValueChange={(value) =>
                    setCurrentItem({ ...currentItem, product: value, color: "", size: "", unitPrice: 0 })
                  }
                >
                  <SelectTrigger className="border-2 border-gray-200 focus:border-blue-400">
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
                  <SelectTrigger className="border-2 border-gray-200 focus:border-blue-400">
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
                  <SelectTrigger className="border-2 border-gray-200 focus:border-blue-400">
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
                  className="border-2 border-gray-200 focus:border-blue-400 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">Harga Satuan</Label>
                <Input
                  type="number"
                  value={currentItem.unitPrice}
                  onChange={(e) => setCurrentItem({ ...currentItem, unitPrice: Number.parseInt(e.target.value) || 0 })}
                  className="border-2 border-gray-200 focus:border-blue-400 transition-colors"
                />
              </div>

              <div className="flex items-end">
                <Button
                  onClick={handleAddItem}
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg transform hover:scale-105 transition-all duration-200"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invoice Preview */}
        <Card className="shadow-xl border-0 bg-white">
          <CardHeader className="bg-gradient-to-r from-gray-700 to-gray-800 text-white rounded-t-lg">
            <CardTitle>Preview Invoice</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div id="invoice" className="bg-white p-8">
              {/* Invoice Header */}
              <div className="flex justify-between items-start mb-8 border-b pb-6">
                <div className="flex items-center gap-4">
                  <Image
                    src="/images/adina-logo.png"
                    alt="ADINA KAOS Logo"
                    width={120}
                    height={80}
                    className="object-contain"
                  />
                  <div>
                    <p className="text-gray-600 font-medium">Solo - Jawa Tengah</p>
                    <p className="text-gray-600">No. Handphone: 0856-4118-9772</p>
                  </div>
                </div>
                <div className="text-right">
                  <h3 className="text-3xl font-bold mb-2 text-gray-800">INVOICE</h3>
                  <p className="text-xl font-semibold text-orange-600">#{invoiceData.invoiceNumber}</p>
                  <p className="text-gray-600">Tanggal: {new Date(invoiceData.date).toLocaleDateString("id-ID")}</p>
                </div>
              </div>

              {/* Customer Info */}
              <div className="mb-8 bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-3 text-gray-800">Kepada:</h4>
                <div className="space-y-1">
                  <p className="font-medium text-lg">{invoiceData.customer || "Nama Pelanggan"}</p>
                  <p className="text-gray-600 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {invoiceData.address || "Alamat Pelanggan"}
                  </p>
                  <p className="text-gray-600 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {invoiceData.phone || "No. Handphone"}
                  </p>
                </div>
              </div>

              {/* Items Table */}
              <div className="mb-8">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-100">
                      <TableHead className="font-semibold">Produk</TableHead>
                      <TableHead className="font-semibold">Warna</TableHead>
                      <TableHead className="font-semibold">Ukuran</TableHead>
                      <TableHead className="text-center font-semibold">Qty</TableHead>
                      <TableHead className="text-right font-semibold">Harga Satuan</TableHead>
                      <TableHead className="text-right font-semibold">Total</TableHead>
                      <TableHead className="w-12 pdf-hide"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoiceData.items.map((item, index) => (
                      <TableRow key={index} className="hover:bg-gray-50">
                        <TableCell className="font-medium">{item.product}</TableCell>
                        <TableCell>{item.color}</TableCell>
                        <TableCell>{item.size}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(item.total)}</TableCell>
                        <TableCell className="pdf-hide">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(index)}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {invoiceData.items.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-gray-500 py-12">
                          <ShoppingBag className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                          Belum ada item yang ditambahkan
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Total */}
              <div className="flex justify-end mb-8">
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 rounded-lg shadow-lg">
                  <div className="text-3xl font-bold">Grand Total: {formatCurrency(grandTotal)}</div>
                </div>
              </div>

              {/* Notes */}
              {invoiceData.note && (
                <div className="border-t pt-6 mb-8">
                  <h4 className="font-semibold mb-3 text-gray-800">Catatan:</h4>
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                    <p className="text-gray-700">{invoiceData.note}</p>
                  </div>
                </div>
              )}

              {/* Payment Information */}
              <div className="border-t pt-6 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg">
                <h4 className="font-bold mb-4 text-lg text-gray-800">Informasi Pembayaran</h4>
                <div className="space-y-3">
                  <p className="font-semibold text-gray-700">Info pembayaran dapat ditransfer ke:</p>
                  <p className="text-lg font-bold text-blue-600">Maria Goreti Nugrahardina</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-blue-500">
                      <p className="font-semibold text-gray-700">Bank MANDIRI</p>
                      <p className="text-xl font-mono font-bold text-blue-600">1360004826878</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-green-500">
                      <p className="font-semibold text-gray-700">Bank BRI</p>
                      <p className="text-xl font-mono font-bold text-green-600">0097 0112 2186 505</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 bg-white p-3 rounded border-l-4 border-yellow-400">
                    Setelah melakukan transfer dapat mengirimkan bukti transfer
                  </p>
                  <p className="font-bold text-center text-xl text-orange-600 bg-white p-4 rounded-lg shadow-sm">
                    TERIMA KASIH
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes and Actions */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-t-lg">
            <CardTitle>Catatan & Aksi</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
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
                className="border-2 border-gray-200 focus:border-green-400 transition-colors"
              />
            </div>

            <div className="flex gap-4">
              <Button
                onClick={generatePDF}
                className="bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-800 hover:to-gray-900 text-white shadow-lg transform hover:scale-105 transition-all duration-200"
              >
                <Download className="w-4 h-4 mr-2" />
                Unduh PDF
              </Button>
              <Button
                onClick={handleSave}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg transform hover:scale-105 transition-all duration-200"
              >
                <Save className="w-4 h-4 mr-2" />
                Simpan Invoice
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
