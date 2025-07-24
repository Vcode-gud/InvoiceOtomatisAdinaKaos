import { type NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir, readFile } from "fs/promises"
import { existsSync } from "fs"
import path from "path"

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
  paymentStatus: "unpaid" | "partial" | "paid"
  paidAmount: number
  paymentHistory: Array<{
    date: string
    amount: number
    method: string
    note: string
  }>
}

export async function POST(request: NextRequest) {
  try {
    const invoiceData: InvoiceData = await request.json()

    // Validate required fields
    if (!invoiceData.customer || !invoiceData.invoiceNumber || invoiceData.items.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Data invoice tidak lengkap. Mohon lengkapi informasi pelanggan dan tambahkan minimal 1 item.",
        },
        { status: 400 },
      )
    }

    // Create invoices directory if it doesn't exist
    const invoicesDir = path.join(process.cwd(), "data", "invoices")
    if (!existsSync(invoicesDir)) {
      await mkdir(invoicesDir, { recursive: true })
    }

    // Calculate totals
    const grandTotal = invoiceData.items.reduce((sum, item) => sum + item.total, 0)
    const dpAmount = invoiceData.dpAmount || 0
    const remainingAmount = grandTotal - dpAmount

    // Determine payment status
    let paymentStatus: "unpaid" | "partial" | "paid" = "unpaid"
    let paidAmount = dpAmount

    if (dpAmount === 0) {
      paymentStatus = "unpaid"
    } else if (dpAmount >= grandTotal) {
      paymentStatus = "paid"
      paidAmount = grandTotal
    } else {
      paymentStatus = "partial"
    }

    // Initialize payment history
    const paymentHistory = []
    if (dpAmount > 0) {
      paymentHistory.push({
        date: new Date().toISOString(),
        amount: dpAmount,
        method: "DP",
        note: "Pembayaran DP awal",
      })
    }

    // Add timestamp and calculate totals
    const enrichedInvoiceData = {
      ...invoiceData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      grandTotal,
      itemCount: invoiceData.items.length,
      remainingAmount,
      paymentStatus,
      paidAmount,
      paymentHistory,
    }

    // Save to JSON file
    const fileName = `${invoiceData.invoiceNumber}.json`
    const filePath = path.join(invoicesDir, fileName)

    await writeFile(filePath, JSON.stringify(enrichedInvoiceData, null, 2), "utf-8")

    // Update master log file with complete historical data
    const logPath = path.join(invoicesDir, "invoice-log.json")
    let invoiceLog = []

    try {
      if (existsSync(logPath)) {
        const logContent = await readFile(logPath, "utf-8")
        invoiceLog = JSON.parse(logContent)
      }
    } catch (error) {
      console.log("Creating new invoice log file")
    }

    // Create comprehensive log entry with all data for historical tracking
    const logEntry = {
      invoiceNumber: invoiceData.invoiceNumber,
      customer: invoiceData.customer,
      address: invoiceData.address,
      phone: invoiceData.phone,
      date: invoiceData.date,
      grandTotal,
      itemCount: enrichedInvoiceData.itemCount,
      createdAt: enrichedInvoiceData.createdAt,
      updatedAt: enrichedInvoiceData.updatedAt,
      fileName: fileName,
      paymentStatus,
      paidAmount,
      remainingAmount,
      dpAmount,
      items: invoiceData.items, // Store complete item details
      note: invoiceData.note,
      paymentHistory: paymentHistory,
      // Add version tracking for historical data
      version: 1,
      isActive: true,
    }

    // Check if invoice already exists in log
    const existingIndex = invoiceLog.findIndex((inv: any) => inv.invoiceNumber === invoiceData.invoiceNumber)
    if (existingIndex >= 0) {
      // Mark previous version as inactive (for historical tracking)
      invoiceLog[existingIndex].isActive = false
      invoiceLog[existingIndex].version = invoiceLog[existingIndex].version || 1

      // Add new version
      logEntry.version = (invoiceLog[existingIndex].version || 1) + 1
      invoiceLog.push(logEntry)
    } else {
      invoiceLog.push(logEntry)
    }

    // Sort by creation date (newest first) but keep all historical data
    invoiceLog.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    await writeFile(logPath, JSON.stringify(invoiceLog, null, 2), "utf-8")

    console.log(`Invoice ${invoiceData.invoiceNumber} saved successfully for customer: ${invoiceData.customer}`)

    return NextResponse.json({
      success: true,
      message: "Invoice berhasil disimpan",
      invoiceNumber: invoiceData.invoiceNumber,
      filePath: fileName,
      grandTotal,
      paymentStatus,
      remainingAmount,
    })
  } catch (error) {
    console.error("Error saving invoice:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan saat menyimpan invoice. Silakan coba lagi.",
      },
      { status: 500 },
    )
  }
}

// GET method to retrieve saved invoices
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const invoiceNumber = searchParams.get("invoice")
    const includeHistory = searchParams.get("history") === "true"

    const invoicesDir = path.join(process.cwd(), "data", "invoices")

    if (invoiceNumber) {
      // Get specific invoice
      const filePath = path.join(invoicesDir, `${invoiceNumber}.json`)
      if (existsSync(filePath)) {
        const fileContent = await readFile(filePath, "utf-8")
        const invoiceData = JSON.parse(fileContent)
        return NextResponse.json({
          success: true,
          invoice: invoiceData,
        })
      } else {
        return NextResponse.json({ success: false, message: "Invoice tidak ditemukan" }, { status: 404 })
      }
    } else {
      // Get invoice log
      const logPath = path.join(invoicesDir, "invoice-log.json")
      if (existsSync(logPath)) {
        const logContent = await readFile(logPath, "utf-8")
        const logData = JSON.parse(logContent)

        if (includeHistory) {
          // Return all historical data
          return NextResponse.json({
            success: true,
            invoices: logData || [],
            totalRecords: logData.length,
          })
        } else {
          // Return only active (latest) versions
          const activeInvoices = logData.filter((inv: any) => inv.isActive !== false)
          return NextResponse.json({
            success: true,
            invoices: activeInvoices || [],
            totalRecords: logData.length,
            activeRecords: activeInvoices.length,
          })
        }
      } else {
        return NextResponse.json({
          success: true,
          invoices: [],
          totalRecords: 0,
          activeRecords: 0,
        })
      }
    }
  } catch (error) {
    console.error("Error retrieving invoices:", error)
    return NextResponse.json({ success: false, message: "Gagal mengambil data invoice" }, { status: 500 })
  }
}

// PUT method to update payment status
export async function PUT(request: NextRequest) {
  try {
    const { invoiceNumber, paymentAmount, paymentMethod, paymentNote } = await request.json()

    if (!invoiceNumber || !paymentAmount) {
      return NextResponse.json(
        { success: false, message: "Invoice number dan jumlah pembayaran harus diisi" },
        { status: 400 },
      )
    }

    const invoicesDir = path.join(process.cwd(), "data", "invoices")
    const filePath = path.join(invoicesDir, `${invoiceNumber}.json`)

    if (!existsSync(filePath)) {
      return NextResponse.json({ success: false, message: "Invoice tidak ditemukan" }, { status: 404 })
    }

    // Read existing invoice
    const fileContent = await readFile(filePath, "utf-8")
    const invoiceData = JSON.parse(fileContent)

    // Update payment information
    const newPaidAmount = invoiceData.paidAmount + paymentAmount
    const remainingAmount = invoiceData.grandTotal - newPaidAmount

    // Determine new payment status
    let paymentStatus: "unpaid" | "partial" | "paid" = "partial"
    if (newPaidAmount >= invoiceData.grandTotal) {
      paymentStatus = "paid"
    } else if (newPaidAmount <= 0) {
      paymentStatus = "unpaid"
    }

    // Add to payment history
    invoiceData.paymentHistory.push({
      date: new Date().toISOString(),
      amount: paymentAmount,
      method: paymentMethod || "Transfer",
      note: paymentNote || "Pembayaran",
    })

    // Update invoice data
    invoiceData.paidAmount = Math.min(newPaidAmount, invoiceData.grandTotal)
    invoiceData.remainingAmount = Math.max(remainingAmount, 0)
    invoiceData.paymentStatus = paymentStatus
    invoiceData.updatedAt = new Date().toISOString()

    // Save updated invoice
    await writeFile(filePath, JSON.stringify(invoiceData, null, 2), "utf-8")

    // Update log file with historical tracking
    const logPath = path.join(invoicesDir, "invoice-log.json")
    if (existsSync(logPath)) {
      const logContent = await readFile(logPath, "utf-8")
      const logData = JSON.parse(logContent)

      // Find the active version and update it
      const activeIndex = logData.findIndex((inv: any) => inv.invoiceNumber === invoiceNumber && inv.isActive !== false)
      if (activeIndex >= 0) {
        // Create historical entry for payment update
        const historyEntry = {
          ...logData[activeIndex],
          paymentStatus,
          paidAmount: invoiceData.paidAmount,
          remainingAmount: invoiceData.remainingAmount,
          updatedAt: invoiceData.updatedAt,
          paymentHistory: invoiceData.paymentHistory,
          version: (logData[activeIndex].version || 1) + 1,
          updateType: "payment",
          isActive: true,
        }

        // Mark previous version as inactive
        logData[activeIndex].isActive = false

        // Add new version
        logData.push(historyEntry)

        // Sort by update time
        logData.sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

        await writeFile(logPath, JSON.stringify(logData, null, 2), "utf-8")
      }
    }

    return NextResponse.json({
      success: true,
      message: "Status pembayaran berhasil diupdate",
      paymentStatus,
      paidAmount: invoiceData.paidAmount,
      remainingAmount: invoiceData.remainingAmount,
    })
  } catch (error) {
    console.error("Error updating payment:", error)
    return NextResponse.json({ success: false, message: "Gagal mengupdate status pembayaran" }, { status: 500 })
  }
}
