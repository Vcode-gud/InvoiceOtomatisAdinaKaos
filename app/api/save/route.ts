import { type NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir, readFile } from "fs/promises"
import { existsSync, mkdirSync, writeFileSync, readFileSync, statSync } from "fs"
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

// Enhanced directory creation with multiple fallback strategies
async function ensureDirectoryExists(dirPath: string): Promise<boolean> {
  console.log(`Attempting to ensure directory exists: ${dirPath}`)

  // Strategy 1: Check if directory already exists (sync)
  try {
    if (existsSync(dirPath)) {
      const stats = statSync(dirPath)
      if (stats.isDirectory()) {
        console.log(`Directory already exists: ${dirPath}`)
        return true
      }
    }
  } catch (error) {
    console.log(`Sync check failed, continuing with async: ${error}`)
  }

  // Strategy 2: Try async mkdir with recursive
  try {
    await mkdir(dirPath, { recursive: true, mode: 0o755 })
    console.log(`Directory created successfully (async): ${dirPath}`)
    return true
  } catch (asyncError) {
    console.log(`Async mkdir failed: ${asyncError}`)
  }

  // Strategy 3: Try sync mkdir as fallback
  try {
    mkdirSync(dirPath, { recursive: true, mode: 0o755 })
    console.log(`Directory created successfully (sync): ${dirPath}`)
    return true
  } catch (syncError) {
    console.log(`Sync mkdir failed: ${syncError}`)
  }

  // Strategy 4: Try creating parent directories step by step
  try {
    const pathParts = dirPath.split(path.sep)
    let currentPath = ""

    for (const part of pathParts) {
      if (!part) continue
      currentPath = currentPath ? path.join(currentPath, part) : part

      if (!existsSync(currentPath)) {
        try {
          mkdirSync(currentPath, { mode: 0o755 })
          console.log(`Created path segment: ${currentPath}`)
        } catch (segmentError) {
          console.log(`Failed to create segment ${currentPath}: ${segmentError}`)
        }
      }
    }

    // Verify final directory exists
    if (existsSync(dirPath)) {
      console.log(`Directory created via step-by-step approach: ${dirPath}`)
      return true
    }
  } catch (stepError) {
    console.log(`Step-by-step creation failed: ${stepError}`)
  }

  // Strategy 5: Try alternative paths
  const alternativePaths = [
    path.join(process.cwd(), "tmp", "invoices"),
    path.join(process.cwd(), "public", "data", "invoices"),
    path.join("/tmp", "adina-invoices"),
  ]

  for (const altPath of alternativePaths) {
    try {
      if (!existsSync(altPath)) {
        mkdirSync(altPath, { recursive: true, mode: 0o755 })
      }
      console.log(`Alternative directory created: ${altPath}`)
      return true
    } catch (altError) {
      console.log(`Alternative path failed ${altPath}: ${altError}`)
    }
  }

  console.error(`All directory creation strategies failed for: ${dirPath}`)
  return false
}

// Enhanced file writing with multiple strategies
async function safeWriteFile(filePath: string, content: string): Promise<boolean> {
  console.log(`Attempting to write file: ${filePath}`)

  // Strategy 1: Standard async writeFile
  try {
    await writeFile(filePath, content, { encoding: "utf8", mode: 0o644 })
    console.log(`File written successfully (async): ${filePath}`)
    return true
  } catch (asyncError) {
    console.log(`Async write failed: ${asyncError}`)
  }

  // Strategy 2: Sync writeFile as fallback
  try {
    writeFileSync(filePath, content, { encoding: "utf8", mode: 0o644 })
    console.log(`File written successfully (sync): ${filePath}`)
    return true
  } catch (syncError) {
    console.log(`Sync write failed: ${syncError}`)
  }

  // Strategy 3: Try with different encoding
  try {
    const buffer = Buffer.from(content, "utf8")
    await writeFile(filePath, buffer, { mode: 0o644 })
    console.log(`File written successfully (buffer): ${filePath}`)
    return true
  } catch (bufferError) {
    console.log(`Buffer write failed: ${bufferError}`)
  }

  // Strategy 4: Try alternative file location
  const dir = path.dirname(filePath)
  const filename = path.basename(filePath)
  const alternativeFile = path.join(dir, `backup_${filename}`)

  try {
    writeFileSync(alternativeFile, content, { encoding: "utf8", mode: 0o644 })
    console.log(`File written to alternative location: ${alternativeFile}`)
    return true
  } catch (altError) {
    console.log(`Alternative file write failed: ${altError}`)
  }

  console.error(`All file writing strategies failed for: ${filePath}`)
  return false
}

// Enhanced file reading with fallbacks
async function safeReadFile(filePath: string): Promise<string | null> {
  console.log(`Attempting to read file: ${filePath}`)

  // Strategy 1: Standard async readFile
  try {
    const content = await readFile(filePath, "utf-8")
    console.log(`File read successfully (async): ${filePath}`)
    return content
  } catch (asyncError) {
    console.log(`Async read failed: ${asyncError}`)
  }

  // Strategy 2: Sync readFile as fallback
  try {
    const content = readFileSync(filePath, "utf-8")
    console.log(`File read successfully (sync): ${filePath}`)
    return content
  } catch (syncError) {
    console.log(`Sync read failed: ${syncError}`)
  }

  // Strategy 3: Try backup file
  const dir = path.dirname(filePath)
  const filename = path.basename(filePath)
  const backupFile = path.join(dir, `backup_${filename}`)

  try {
    if (existsSync(backupFile)) {
      const content = readFileSync(backupFile, "utf-8")
      console.log(`Backup file read successfully: ${backupFile}`)
      return content
    }
  } catch (backupError) {
    console.log(`Backup file read failed: ${backupError}`)
  }

  console.log(`All file reading strategies failed for: ${filePath}`)
  return null
}

// Get appropriate storage directory
function getStorageDirectory(): string {
  const possiblePaths = [
    path.join(process.cwd(), "data", "invoices"),
    path.join(process.cwd(), "tmp", "invoices"),
    path.join(process.cwd(), "public", "data", "invoices"),
    path.join("/tmp", "adina-invoices"),
  ]

  // Try to find an existing directory first
  for (const dirPath of possiblePaths) {
    if (existsSync(dirPath)) {
      console.log(`Using existing directory: ${dirPath}`)
      return dirPath
    }
  }

  // Return the preferred path for creation
  console.log(`Will attempt to create: ${possiblePaths[0]}`)
  return possiblePaths[0]
}

export async function POST(request: NextRequest) {
  try {
    console.log("=== INVOICE SAVE REQUEST START ===")
    console.log("Environment:", {
      nodeEnv: process.env.NODE_ENV,
      platform: process.platform,
      cwd: process.cwd(),
    })

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

    // Get storage directory with fallback options
    const invoicesDir = getStorageDirectory()
    console.log("Target storage directory:", invoicesDir)

    // Ensure directory exists with enhanced error handling
    const dirCreated = await ensureDirectoryExists(invoicesDir)
    if (!dirCreated) {
      console.error("Failed to create storage directory after all attempts")

      // Try in-memory storage as last resort (for serverless environments)
      console.log("Attempting in-memory storage fallback...")

      try {
        // Store in a simple in-memory structure (this is a fallback for extreme cases)
        const memoryStorage = globalThis as any
        if (!memoryStorage.invoiceStorage) {
          memoryStorage.invoiceStorage = new Map()
        }

        const enrichedData = {
          ...invoiceData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          grandTotal: invoiceData.items.reduce((sum, item) => sum + (item.total || 0), 0),
          itemCount: invoiceData.items.length,
          paymentStatus:
            invoiceData.dpAmount >= invoiceData.items.reduce((sum, item) => sum + (item.total || 0), 0)
              ? "paid"
              : invoiceData.dpAmount > 0
                ? "partial"
                : "unpaid",
          paidAmount: invoiceData.dpAmount || 0,
          remainingAmount: Math.max(
            invoiceData.items.reduce((sum, item) => sum + (item.total || 0), 0) - (invoiceData.dpAmount || 0),
            0,
          ),
          paymentHistory:
            invoiceData.dpAmount > 0
              ? [
                  {
                    date: new Date().toISOString(),
                    amount: invoiceData.dpAmount,
                    method: "DP",
                    note: "Pembayaran DP awal",
                  },
                ]
              : [],
        }

        memoryStorage.invoiceStorage.set(invoiceData.invoiceNumber, enrichedData)

        console.log("Invoice stored in memory as fallback")

        return NextResponse.json({
          success: true,
          message: "Invoice berhasil disimpan (mode sementara)",
          invoiceNumber: invoiceData.invoiceNumber,
          grandTotal: enrichedData.grandTotal,
          paymentStatus: enrichedData.paymentStatus,
          remainingAmount: enrichedData.remainingAmount,
          warning: "Data disimpan sementara. Untuk penyimpanan permanen, silakan hubungi administrator.",
        })
      } catch (memoryError) {
        console.error("Memory storage fallback also failed:", memoryError)
        return NextResponse.json(
          {
            success: false,
            message: "Sistem penyimpanan tidak tersedia. Silakan coba lagi nanti atau hubungi administrator.",
            technicalInfo: process.env.NODE_ENV === "development" ? "All storage methods failed" : undefined,
          },
          { status: 500 },
        )
      }
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

    const fileSaved = await safeWriteFile(filePath, JSON.stringify(enrichedInvoiceData, null, 2))
    if (!fileSaved) {
      console.error("Failed to save individual invoice file after all attempts")
      return NextResponse.json(
        {
          success: false,
          message: "Gagal menyimpan file invoice. Silakan coba lagi atau hubungi administrator.",
        },
        { status: 500 },
      )
    }

    console.log("Individual invoice file saved successfully")

    // Update master log file with complete historical data
    const logPath = path.join(invoicesDir, "invoice-log.json")
    let invoiceLog = []

    console.log("Processing invoice log:", logPath)

    // Try to read existing log
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

    // Create comprehensive log entry
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
      items: invoiceData.items,
      note: invoiceData.note || "",
      paymentHistory: paymentHistory,
      version: 1,
      isActive: true,
    }

    // Check if invoice already exists in log
    const existingIndex = invoiceLog.findIndex((inv: any) => inv.invoiceNumber === invoiceData.invoiceNumber)
    if (existingIndex >= 0) {
      invoiceLog[existingIndex].isActive = false
      invoiceLog[existingIndex].version = invoiceLog[existingIndex].version || 1
      logEntry.version = (invoiceLog[existingIndex].version || 1) + 1
      invoiceLog.push(logEntry)
      console.log("Updated existing invoice, new version:", logEntry.version)
    } else {
      invoiceLog.push(logEntry)
      console.log("Added new invoice to log")
    }

    // Sort by creation date
    invoiceLog.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    // Save updated log (don't fail if this fails)
    const logSaved = await safeWriteFile(logPath, JSON.stringify(invoiceLog, null, 2))
    if (logSaved) {
      console.log("Invoice log updated successfully")
    } else {
      console.log("Invoice log update failed, but invoice was saved")
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
      storageLocation: invoicesDir,
    })
  } catch (error) {
    console.error("=== INVOICE SAVE ERROR ===", error)

    // Provide more specific error messages
    let errorMessage = "Terjadi kesalahan saat menyimpan invoice."

    if (error instanceof Error) {
      if (error.message.includes("ENOENT")) {
        errorMessage = "Direktori penyimpanan tidak dapat diakses. Sistem akan mencoba lokasi alternatif."
      } else if (error.message.includes("EACCES") || error.message.includes("EPERM")) {
        errorMessage = "Tidak memiliki izin untuk menyimpan file. Silakan refresh halaman dan coba lagi."
      } else if (error.message.includes("ENOSPC")) {
        errorMessage = "Ruang penyimpanan tidak cukup. Silakan hubungi administrator."
      } else if (error.message.includes("EMFILE") || error.message.includes("ENFILE")) {
        errorMessage = "Terlalu banyak file terbuka. Silakan refresh halaman dan coba lagi."
      }
    }

    return NextResponse.json(
      {
        success: false,
        message: errorMessage,
        suggestion: "Coba refresh halaman dan ulangi, atau hubungi administrator jika masalah berlanjut.",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

// GET method with enhanced error handling
export async function GET(request: NextRequest) {
  try {
    console.log("=== INVOICE GET REQUEST START ===")

    const { searchParams } = new URL(request.url)
    const invoiceNumber = searchParams.get("invoice")
    const includeHistory = searchParams.get("history") === "true"

    // Check memory storage first (fallback)
    const memoryStorage = globalThis as any
    if (memoryStorage?.invoiceStorage && invoiceNumber) {
      const memoryData = memoryStorage.invoiceStorage.get(invoiceNumber)
      if (memoryData) {
        console.log("Retrieved from memory storage:", invoiceNumber)
        return NextResponse.json({
          success: true,
          invoice: memoryData,
          source: "memory",
        })
      }
    }

    const invoicesDir = getStorageDirectory()
    console.log("GET request params:", { invoiceNumber, includeHistory, invoicesDir })

    // Try to ensure directory exists, but don't fail if it doesn't
    const dirExists = await ensureDirectoryExists(invoicesDir)
    if (!dirExists) {
      console.log("Storage directory not available, returning empty results")
      return NextResponse.json({
        success: true,
        invoices: [],
        totalRecords: 0,
        activeRecords: 0,
        message: "Sistem penyimpanan belum tersedia. Silakan buat invoice pertama.",
      })
    }

    if (invoiceNumber) {
      // Get specific invoice
      const filePath = path.join(invoicesDir, `${invoiceNumber}.json`)
      console.log("Looking for specific invoice:", filePath)

      const fileContent = await safeReadFile(filePath)
      if (fileContent) {
        try {
          const invoiceData = JSON.parse(fileContent)
          console.log("Found specific invoice:", invoiceNumber)
          return NextResponse.json({
            success: true,
            invoice: invoiceData,
          })
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
    } else {
      // Get invoice log
      const logPath = path.join(invoicesDir, "invoice-log.json")
      console.log("Looking for invoice log:", logPath)

      const logContent = await safeReadFile(logPath)
      if (logContent) {
        try {
          const logData = JSON.parse(logContent)
          console.log("Invoice log loaded, entries:", logData.length)

          if (includeHistory) {
            return NextResponse.json({
              success: true,
              invoices: logData || [],
              totalRecords: logData.length,
            })
          } else {
            const activeInvoices = logData.filter((inv: any) => inv.isActive !== false)
            console.log("Active invoices:", activeInvoices.length)
            return NextResponse.json({
              success: true,
              invoices: activeInvoices || [],
              totalRecords: logData.length,
              activeRecords: activeInvoices.length,
            })
          }
        } catch (parseError) {
          console.error("Failed to parse log data:", parseError)
          return NextResponse.json({
            success: true,
            invoices: [],
            totalRecords: 0,
            activeRecords: 0,
            message: "Log data rusak, tapi sistem masih berfungsi.",
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

// PUT method with enhanced error handling
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

    const invoicesDir = getStorageDirectory()
    const filePath = path.join(invoicesDir, `${invoiceNumber}.json`)

    // Ensure directory exists
    const dirExists = await ensureDirectoryExists(invoicesDir)
    if (!dirExists) {
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
    const fileSaved = await safeWriteFile(filePath, JSON.stringify(invoiceData, null, 2))
    if (!fileSaved) {
      console.error("Failed to save updated invoice")
      return NextResponse.json(
        {
          success: false,
          message: "Gagal menyimpan update pembayaran",
        },
        { status: 500 },
      )
    }

    console.log("Invoice updated successfully")

    // Update log file (don't fail if this fails)
    const logPath = path.join(invoicesDir, "invoice-log.json")
    const logContent = await safeReadFile(logPath)
    if (logContent) {
      try {
        const logData = JSON.parse(logContent)
        const activeIndex = logData.findIndex(
          (inv: any) => inv.invoiceNumber === invoiceNumber && inv.isActive !== false,
        )
        if (activeIndex >= 0) {
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

          logData[activeIndex].isActive = false
          logData.push(historyEntry)
          logData.sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

          await safeWriteFile(logPath, JSON.stringify(logData, null, 2))
          console.log("Invoice log updated for payment")
        }
      } catch (logError) {
        console.error("Failed to update log, but payment was saved:", logError)
      }
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
