"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FileText, Search, Eye } from "lucide-react"
import Link from "next/link"

interface InvoiceLog {
  invoiceNumber: string
  customer: string
  date: string
  grandTotal: number
  itemCount: number
  createdAt: string
  fileName: string
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceLog[]>([])
  const [filteredInvoices, setFilteredInvoices] = useState<InvoiceLog[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchInvoices()
  }, [])

  useEffect(() => {
    const filtered = invoices.filter(
      (invoice) =>
        invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.customer.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    setFilteredInvoices(filtered)
  }, [searchTerm, invoices])

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat data invoice...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="text-center py-8">
          <h1 className="text-4xl font-bold text-orange-600 mb-2">Daftar Invoice</h1>
          <p className="text-gray-600 text-lg font-medium">ADINA KAOS</p>
          <div className="w-24 h-1 bg-gradient-to-r from-orange-400 to-orange-600 mx-auto mt-2 rounded-full"></div>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center">
          <Link href="/">
            <Button className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white">
              Buat Invoice Baru
            </Button>
          </Link>

          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-gray-400" />
            <Input
              placeholder="Cari invoice atau pelanggan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
            />
          </div>
        </div>

        {/* Invoice List */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-gray-700 to-gray-800 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Invoice Tersimpan ({filteredInvoices.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filteredInvoices.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500 text-lg">
                  {searchTerm ? "Tidak ada invoice yang sesuai dengan pencarian" : "Belum ada invoice tersimpan"}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-100">
                    <TableHead className="font-semibold">No. Invoice</TableHead>
                    <TableHead className="font-semibold">Pelanggan</TableHead>
                    <TableHead className="font-semibold">Tanggal</TableHead>
                    <TableHead className="text-center font-semibold">Items</TableHead>
                    <TableHead className="text-right font-semibold">Total</TableHead>
                    <TableHead className="text-center font-semibold">Dibuat</TableHead>
                    <TableHead className="text-center font-semibold">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice, index) => (
                    <TableRow key={index} className="hover:bg-gray-50">
                      <TableCell className="font-mono font-semibold text-orange-600">{invoice.invoiceNumber}</TableCell>
                      <TableCell className="font-medium">{invoice.customer}</TableCell>
                      <TableCell>{new Date(invoice.date).toLocaleDateString("id-ID")}</TableCell>
                      <TableCell className="text-center">{invoice.itemCount}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(invoice.grandTotal)}</TableCell>
                      <TableCell className="text-center text-sm text-gray-600">
                        {formatDate(invoice.createdAt)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex gap-2 justify-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Here you could implement view functionality
                              alert(`Fitur lihat detail untuk ${invoice.invoiceNumber} akan segera tersedia`)
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
