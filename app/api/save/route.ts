import { type NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir, readFile, access } from "fs/promises"
import { existsSync, mkdirSync } from "fs"
import path from "path"
import { constants } from "fs"

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

// Helper function to ensure directory exists
async function ensureDirectoryExists(dirPath: string) {
  try {
    await access(dirPath, constants.F_OK)
  } catch (error) {
    try {
      await mkdir(dirPath, { recursive: true })
      console.log(`Created directory: ${dirPath}`)
    } catch (mkdirError) {
      // Fallback to sync method
      try {
        if (!existsSync(dirPath)) {
          mkdirSync(dirPath, { recursive: true })
          console.log(`Created directory (sync): ${dirPath}`)
        }
      } catch (syncError) {
        console.error(`Failed to create directory: ${dirPath}`, syncError)
        throw new Error(`Cannot create directory: ${dirPath}`)
      }
    }
  }
}

// Helper function to safely write file
async function safeWriteFile(filePath: string, content: string) {
  try {
    await writeFile(filePath, content, "utf-8")
    return true
  } catch (error) {
    console.error(`Failed to write file: ${filePath}`, error)

    // Try alternative approach with different encoding
    try {
      await writeFile(filePath, content, { encoding: "utf8", flag: "w" })
      return true
    } catch (retryError) {
      console.error(`Retry failed for file: ${filePath}`, retryError)
      throw new Error(`Cannot write file: ${filePath}`)
    }
  }
}

// Helper function to safely read file
async function safeReadFile(filePath: string) {
  try {
    const content = await readFile(filePath, "utf-8")
    return content
  } catch (error) {
    console.error(`Failed to read file: ${filePath}`, error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("=== INVOICE SAVE REQUEST START ===")

    let invoiceData: InvoiceData
    try {
      invoiceData = await request.json()
      console.log("Invoice data received:", {
        invoiceNumber: invoiceData.invoiceNumber,
        customer: invoiceData.customer,
        itemCount: invoiceData.items?.length || 0,
      })
    } catch (parseError) {
      console.error("Failed to parse request JSON:", parseError)
      return NextResponse.json(
        {
          success: false,
          message: "Data request tidak valid. Mohon coba lagi.",
        },
        { status: 400 },
      )
    }

    // Validate required fields
    if (!invoiceData.customer || !invoiceData.invoiceNumber || !invoiceData.items || invoiceData.items.length === 0) {
      console.log("Validation failed:", {
        customer: !!invoiceData.customer,
        invoiceNumber: !!invoiceData.invoiceNumber,
        itemsLength: invoiceData.items?.length || 0,
      })
      return NextResponse.json(
        {
          success: false,
          message: "Data invoice tidak lengkap. Mohon lengkapi informasi pelanggan dan tambahkan minimal 1 item.",
        },
        { status: 400 },
      )
    }

    // Create invoices directory structure
    const dataDir = path.join(process.cwd(), "data")
    const invoicesDir = path.join(dataDir, "invoices")

    console.log("Ensuring directories exist:", {
      dataDir,
      invoicesDir,
    })

    try {
      await ensureDirectoryExists(dataDir)
      await ensureDirectoryExists(invoicesDir)
    } catch (dirError) {
      console.error("Directory creation failed:", dirError)
      return NextResponse.json(
        {
          success: false,
          message: "Gagal membuat direktori penyimpanan. Silakan hubungi administrator.",
        },
        { status: 500 },
      )
    }

    // Calculate totals
    const grandTotal = invoiceData.items.reduce((sum, item) => sum + (item.total || 0), 0)
    const dpAmount = invoiceData.dpAmount || 0
    const remainingAmount = Math.max(grandTotal - dpAmount, 0)

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

    console.log("Enriched invoice data:", {
      invoiceNumber: enrichedInvoiceData.invoiceNumber,
      grandTotal,
      paymentStatus,
      itemCount: enrichedInvoiceData.itemCount,
    })

    // Save individual invoice file
    const fileName = `${invoiceData.invoiceNumber}.json`
    const filePath = path.join(invoicesDir, fileName)

    console.log("Saving individual invoice file:", filePath)

    try {
      await safeWriteFile(filePath, JSON.stringify(enrichedInvoiceData, null, 2))
      console.log("Individual invoice file saved successfully")
    } catch (fileError) {
      console.error("Failed to save individual invoice file:", fileError)
      return NextResponse.json(
        {
          success: false,
          message: "Gagal menyimpan file invoice. Silakan coba lagi.",
        },
        { status: 500 },
      )
    }

    // Update master log file with complete historical data
    const logPath = path.join(invoicesDir, "invoice-log.json")
    let invoiceLog = []

    console.log("Processing invoice log:", logPath)

    // Try to read existing log
    try {
      const logContent = await safeReadFile(logPath)
      if (logContent) {
        try {
          invoiceLog = JSON.parse(logContent)
          console.log("Existing log loaded, entries:", invoiceLog.length)
        } catch (parseError) {
          console.error("Failed to parse existing log, creating new:", parseError)
          invoiceLog = []
        }
      } else {
        console.log("No existing log found, creating new")
        invoiceLog = []
      }
    } catch (logReadError) {
      console.log("Creating new invoice log file")
      invoiceLog = []
    }

    // Create comprehensive log entry with all data for historical tracking
    const logEntry = {
      invoiceNumber: invoiceData.invoiceNumber,
      customer: invoiceData.customer,
      address: invoiceData.address || "",
      phone: invoiceData.phone || "",
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
      note: invoiceData.note || "",
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
      console.log("Updated existing invoice, new version:", logEntry.version)
    } else {
      invoiceLog.push(logEntry)
      console.log("Added new invoice to log")
    }

    // Sort by creation date (newest first) but keep all historical data
    invoiceLog.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    // Save updated log
    try {
      await safeWriteFile(logPath, JSON.stringify(invoiceLog, null, 2))
      console.log("Invoice log updated successfully")
    } catch (logSaveError) {
      console.error("Failed to save invoice log:", logSaveError)
      // Don't fail the entire operation if log save fails
      console.log("Continuing despite log save failure...")
    }

    console.log(`=== INVOICE SAVE SUCCESS: ${invoiceData.invoiceNumber} ===`)

    return NextResponse.json({
      success: true,
      message: "Invoice berhasil disimpan",
      invoiceNumber: invoiceData.invoiceNumber,
      filePath: fileName,
      grandTotal,
      paymentStatus,
      remainingAmount,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("=== INVOICE SAVE ERROR ===", error)

    // Provide more specific error messages
    let errorMessage = "Terjadi kesalahan saat menyimpan invoice."

    if (error instanceof Error) {
      if (error.message.includes("ENOENT")) {
        errorMessage = "Direktori penyimpanan tidak dapat diakses. Silakan coba lagi."
      } else if (error.message.includes("EACCES")) {
        errorMessage = "Tidak memiliki izin untuk menyimpan file. Silakan hubungi administrator."
      } else if (error.message.includes("ENOSPC")) {
        errorMessage = "Ruang penyimpanan tidak cukup. Silakan hubungi administrator."
      } else if (error.message.includes("Cannot create directory")) {
        errorMessage = "Gagal membuat direktori penyimpanan. Silakan coba lagi."
      }
    }

    return NextResponse.json(
      {
        success: false,
        message: errorMessage,
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

// GET method to retrieve saved invoices
export async function GET(request: NextRequest) {
  try {
    console.log("=== INVOICE GET REQUEST START ===")

    const { searchParams } = new URL(request.url)
    const invoiceNumber = searchParams.get("invoice")
    const includeHistory = searchParams.get("history") === "true"

    const dataDir = path.join(process.cwd(), "data")
    const invoicesDir = path.join(dataDir, "invoices")

    console.log("GET request params:", { invoiceNumber, includeHistory, invoicesDir })

    // Ensure directories exist
    try {
      await ensureDirectoryExists(dataDir)
      await ensureDirectoryExists(invoicesDir)
    } catch (dirError) {
      console.error("Directory access failed:", dirError)
      return NextResponse.json({
        success: true,
        invoices: [],
        totalRecords: 0,
        activeRecords: 0,
        message: "Direktori penyimpanan belum tersedia. Silakan buat invoice pertama.",
      })
    }

    if (invoiceNumber) {
      // Get specific invoice
      const filePath = path.join(invoicesDir, `${invoiceNumber}.json`)
      console.log("Looking for specific invoice:", filePath)

      try {
        const fileContent = await safeReadFile(filePath)
        if (fileContent) {
          const invoiceData = JSON.parse(fileContent)
          console.log("Found specific invoice:", invoiceNumber)
          return NextResponse.json({
            success: true,
            invoice: invoiceData,
          })
        } else {
          console.log("Specific invoice not found:", invoiceNumber)
          return NextResponse.json(
            {
              success: false,
              message: "Invoice tidak ditemukan",
            },
            { status: 404 },
          )
        }
      } catch (error) {
        console.error("Error reading specific invoice:", error)
        return NextResponse.json(
          {
            success: false,
            message: "Gagal membaca data invoice",
          },
          { status: 500 },
        )
      }
    } else {
      // Get invoice log
      const logPath = path.join(invoicesDir, "invoice-log.json")
      console.log("Looking for invoice log:", logPath)

      try {
        const logContent = await safeReadFile(logPath)
        if (logContent) {
          const logData = JSON.parse(logContent)
          console.log("Invoice log loaded, entries:", logData.length)

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
            console.log("Active invoices:", activeInvoices.length)
            return NextResponse.json({
              success: true,
              invoices: activeInvoices || [],
              totalRecords: logData.length,
              activeRecords: activeInvoices.length,
            })
          }
        } else {
          console.log("No invoice log found")
          return NextResponse.json({
            success: true,
            invoices: [],
            totalRecords: 0,
            activeRecords: 0,
            message: "Belum ada invoice tersimpan.",
          })
        }
      } catch (error) {
        console.error("Error reading invoice log:", error)
        return NextResponse.json({
          success: true,
          invoices: [],
          totalRecords: 0,
          activeRecords: 0,
          message: "Gagal membaca log invoice, tapi sistem masih berfungsi.",
        })
      }
    }
  } catch (error) {
    console.error("=== INVOICE GET ERROR ===", error)
    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengambil data invoice",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 },
    )
  }
}

// PUT method to update payment status
export async function PUT(request: NextRequest) {
  try {
    console.log("=== INVOICE UPDATE REQUEST START ===")

    const { invoiceNumber, paymentAmount, paymentMethod, paymentNote } = await request.json()

    console.log("Update request:", { invoiceNumber, paymentAmount, paymentMethod })

    if (!invoiceNumber || !paymentAmount) {
      return NextResponse.json(
        { success: false, message: "Invoice number dan jumlah pembayaran harus diisi" },
        { status: 400 },
      )
    }

    const dataDir = path.join(process.cwd(), "data")
    const invoicesDir = path.join(dataDir, "invoices")
    const filePath = path.join(invoicesDir, `${invoiceNumber}.json`)

    // Ensure directories exist
    try {
      await ensureDirectoryExists(dataDir)
      await ensureDirectoryExists(invoicesDir)
    } catch (dirError) {
      console.error("Directory access failed:", dirError)
      return NextResponse.json(
        { success: false, message: "Direktori penyimpanan tidak dapat diakses" },
        { status: 500 },
      )
    }

    // Read existing invoice
    const fileContent = await safeReadFile(filePath)
    if (!fileContent) {
      return NextResponse.json(
        {
          success: false,
          message: "Invoice tidak ditemukan",
        },
        { status: 404 },
      )
    }

    let invoiceData
    try {
      invoiceData = JSON.parse(fileContent)
    } catch (parseError) {
      console.error("Failed to parse invoice data:", parseError)
      return NextResponse.json(
        {
          success: false,
          message: "Data invoice rusak",
        },
        { status: 500 },
      )
    }

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
    if (!invoiceData.paymentHistory) {
      invoiceData.paymentHistory = []
    }

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
    try {
      await safeWriteFile(filePath, JSON.stringify(invoiceData, null, 2))
      console.log("Invoice updated successfully")
    } catch (saveError) {
      console.error("Failed to save updated invoice:", saveError)
      return NextResponse.json(
        {
          success: false,
          message: "Gagal menyimpan update pembayaran",
        },
        { status: 500 },
      )
    }

    // Update log file with historical tracking
    const logPath = path.join(invoicesDir, "invoice-log.json")
    try {
      const logContent = await safeReadFile(logPath)
      if (logContent) {
        const logData = JSON.parse(logContent)

        // Find the active version and update it
        const activeIndex = logData.findIndex(
          (inv: any) => inv.invoiceNumber === invoiceNumber && inv.isActive !== false,
        )
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

          await safeWriteFile(logPath, JSON.stringify(logData, null, 2))
          console.log("Invoice log updated for payment")
        }
      }
    } catch (logError) {
      console.error("Failed to update log, but payment was saved:", logError)
      // Don't fail the operation if log update fails
    }

    console.log("=== INVOICE UPDATE SUCCESS ===")

    return NextResponse.json({
      success: true,
      message: "Status pembayaran berhasil diupdate",
      paymentStatus,
      paidAmount: invoiceData.paidAmount,
      remainingAmount: invoiceData.remainingAmount,
    })
  } catch (error) {
    console.error("=== INVOICE UPDATE ERROR ===", error)
    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengupdate status pembayaran",
      },
      { status: 500 },
    )
  }
}
