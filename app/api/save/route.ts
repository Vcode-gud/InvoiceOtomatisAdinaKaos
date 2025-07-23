import { type NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
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

    // Add timestamp and calculate totals
    const enrichedInvoiceData = {
      ...invoiceData,
      createdAt: new Date().toISOString(),
      grandTotal: invoiceData.items.reduce((sum, item) => sum + item.total, 0),
      itemCount: invoiceData.items.length,
    }

    // Save to JSON file
    const fileName = `${invoiceData.invoiceNumber}.json`
    const filePath = path.join(invoicesDir, fileName)

    await writeFile(filePath, JSON.stringify(enrichedInvoiceData, null, 2), "utf-8")

    // Also save to a master log file for easy tracking
    const logPath = path.join(invoicesDir, "invoice-log.json")
    let invoiceLog = []

    try {
      if (existsSync(logPath)) {
        const logContent = await import(logPath)
        invoiceLog = logContent.default || []
      }
    } catch (error) {
      console.log("Creating new invoice log file")
    }

    // Add current invoice to log
    invoiceLog.push({
      invoiceNumber: invoiceData.invoiceNumber,
      customer: invoiceData.customer,
      date: invoiceData.date,
      grandTotal: enrichedInvoiceData.grandTotal,
      itemCount: enrichedInvoiceData.itemCount,
      createdAt: enrichedInvoiceData.createdAt,
      fileName: fileName,
    })

    // Keep only last 1000 invoices in log
    if (invoiceLog.length > 1000) {
      invoiceLog = invoiceLog.slice(-1000)
    }

    await writeFile(logPath, JSON.stringify(invoiceLog, null, 2), "utf-8")

    console.log(`Invoice ${invoiceData.invoiceNumber} saved successfully for customer: ${invoiceData.customer}`)

    return NextResponse.json({
      success: true,
      message: "Invoice berhasil disimpan",
      invoiceNumber: invoiceData.invoiceNumber,
      filePath: fileName,
      grandTotal: enrichedInvoiceData.grandTotal,
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

    const invoicesDir = path.join(process.cwd(), "data", "invoices")

    if (invoiceNumber) {
      // Get specific invoice
      const filePath = path.join(invoicesDir, `${invoiceNumber}.json`)
      if (existsSync(filePath)) {
        const invoiceData = await import(filePath)
        return NextResponse.json({
          success: true,
          invoice: invoiceData.default,
        })
      } else {
        return NextResponse.json({ success: false, message: "Invoice tidak ditemukan" }, { status: 404 })
      }
    } else {
      // Get invoice log
      const logPath = path.join(invoicesDir, "invoice-log.json")
      if (existsSync(logPath)) {
        const logData = await import(logPath)
        return NextResponse.json({
          success: true,
          invoices: logData.default || [],
        })
      } else {
        return NextResponse.json({
          success: true,
          invoices: [],
        })
      }
    }
  } catch (error) {
    console.error("Error retrieving invoices:", error)
    return NextResponse.json({ success: false, message: "Gagal mengambil data invoice" }, { status: 500 })
  }
}
