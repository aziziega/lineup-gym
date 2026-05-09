'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import * as XLSX from 'xlsx'
import { toast } from 'sonner'
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle, ShieldAlert } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { GYM_ID } from '@/lib/constants'
import { toLocalISOString } from '@/lib/utils'

type ParsedRow = {
  no_member: string;
  nama: string;
  nomor_hp: string;
  membership: string;
  start: string;
  end: string;
}

export default function ImportPage() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<ParsedRow[]>([])
  const [isParsing, setIsParsing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importLogs, setImportLogs] = useState<{ status: 'success' | 'error', message: string }[]>([])
  const [showConfirm, setShowConfirm] = useState(false)

  // Ambil daftar paket aktif untuk mapping
  const { data: memberships } = useQuery({
    queryKey: ['active-memberships'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('memberships')
        .select('*')
        .eq('is_active', true)

      if (error) throw error
      return data || []
    }
  })

  // Format tanggal dari DD/MM/YYYY ke YYYY-MM-DD
  const formatDate = (dateStr: string) => {
    if (!dateStr || dateStr === '-') return null

    // Coba tangani format Excel Serial Number jika terbaca sebagai angka
    if (!isNaN(Number(dateStr)) && dateStr.trim() !== '') {
      // Excel date epoch starts at 1899-12-30
      const date = new Date((Number(dateStr) - 25569) * 86400 * 1000)

      // Tambahkan offset timezone agar tetap di tanggal yang sama saat dikonversi
      // Atau gunakan getFullYear/Month/Date untuk ambil local time
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')

      return `${year}-${month}-${day}`
    }

    // Format DD/MM/YYYY
    const parts = dateStr.split('/')
    if (parts.length === 3) {
      let year = parts[2]
      if (year.length === 2) year = '20' + year
      return `${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
    }
    return dateStr
  }

  // Fungsi pencocokan paket
  const findMembershipId = (excelName: string) => {
    if (!memberships || !excelName) return null
    const nameUpper = excelName.toUpperCase()

    // Mapping khusus
    if (nameUpper.includes('COUPLE')) {
      const match = memberships.find(m => m.name.toUpperCase().includes('COUPLE'))
      if (match) return match.id
    }

    if (nameUpper.includes('3') && (nameUpper.includes('BULAN') || nameUpper.includes('MONTH'))) {
      const match = memberships.find(m => m.duration_days >= 85 && m.duration_days <= 95) ||
        memberships.find(m => m.name.includes('3') && (m.name.toUpperCase().includes('BULAN') || m.name.toUpperCase().includes('MONTH')))
      if (match) return match.id
    }

    if (
      nameUpper.includes('MOUNTHLY') ||
      nameUpper.includes('MONTHLY') ||
      nameUpper.includes('MOTHLY') ||
      nameUpper.includes('1') ||
      nameUpper.includes('UMUM')
    ) {
      // Cari paket 1 bulan (durasi ~30 hari)
      const match = memberships.find(m => m.duration_days >= 28 && m.duration_days <= 31) ||
        memberships.find(m => m.name.includes('1') || m.name.toUpperCase().includes('MONTH') || m.name.toUpperCase().includes('BULAN') || m.name.toUpperCase().includes('UMUM'))
      if (match) return match.id
    }

    // Fallback: cari yang namanya paling mirip
    const partialMatch = memberships.find(m => nameUpper.includes(m.name.toUpperCase()))
    if (partialMatch) return partialMatch.id

    // Default fallback
    return memberships[0]?.id || null
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setIsParsing(true)

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result
        const wb = XLSX.read(bstr, { type: 'binary' })
        const wsname = wb.SheetNames[0]
        const ws = wb.Sheets[wsname]

        // Konversi ke JSON (array of arrays untuk melewati nama header yang mungkin tidak konsisten)
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][]

        // Asumsi baris 1 adalah header, mulai dari baris 2
        const rows: ParsedRow[] = []

        for (let i = 1; i < data.length; i++) {
          const row = data[i]
          // Skip baris kosong
          if (!row || row.length === 0 || !row[1]) continue

          rows.push({
            no_member: String(row[0] || ''),
            nama: String(row[1] || ''),
            nomor_hp: String(row[2] || ''),
            membership: String(row[3] || ''),
            start: String(row[4] || ''),
            end: String(row[5] || '')
          })
        }

        setParsedData(rows)
      } catch (error) {
        console.error(error)
        toast.error('Gagal membaca file Excel. Pastikan format sesuai.')
      } finally {
        setIsParsing(false)
      }
    }
    reader.readAsBinaryString(selectedFile)
  }

  const handleImport = async () => {
    if (parsedData.length === 0) return
    setShowConfirm(false)

    setIsImporting(true)
    setImportProgress(0)
    setImportLogs([])

    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < parsedData.length; i++) {
      const row = parsedData[i]

      try {
        // Bersihkan data & Auto-fix nomor HP (tambah 0 jika hilang)
        let phoneStr = row.nomor_hp.replace(/[^0-9]/g, '')
        if (phoneStr.startsWith('8')) {
          phoneStr = '0' + phoneStr
        } else if (phoneStr.startsWith('62')) {
          phoneStr = '0' + phoneStr.substring(2)
        }
        const finalPhone = phoneStr || `0000${i}`
        const memberNo = row.no_member.trim() || null

        const startDate = formatDate(row.start)
        const membershipId = findMembershipId(row.membership)
        const pkg = memberships?.find(m => m.id === membershipId)

        // Coba ambil dari Excel dulu
        let endDate = formatDate(row.end)

        // Jika di Excel kosong, baru hitung otomatis
        if ((!endDate || endDate === '-') && startDate && pkg) {
          const start = new Date(startDate)
          start.setDate(start.getDate() + pkg.duration_days)
          endDate = toLocalISOString(start).split('T')[0]
        }

        if (!row.nama) throw new Error('Nama kosong')

        // 1. Upsert ke tabel members
        // Kita coba insert, lalu ambil ID-nya. Karena phone tidak unik di level DB, kita harus berhati-hati.
        // Cek dulu apakah member_no sudah ada
        let memberId = null

        if (memberNo) {
          const { data: existing } = await supabase.from('members').select('id').eq('member_no', memberNo).single()
          if (existing) memberId = existing.id
        }

        // Jika tidak ketemu pakai member_no, coba pakai phone + name (upsert manual)
        if (!memberId) {
          const { data: existingPhone } = await supabase.from('members').select('id').eq('phone', finalPhone).ilike('full_name', row.nama).limit(1)
          if (existingPhone && existingPhone.length > 0) memberId = existingPhone[0].id
        }

        if (memberId) {
          // Update
          await supabase.from('members').update({
            full_name: row.nama,
            phone: finalPhone,
            member_no: memberNo
          }).eq('id', memberId)
        } else {
          // Insert
          const { data: newMember, error: insertError } = await supabase.from('members').insert({
            gym_id: GYM_ID,
            full_name: row.nama,
            phone: finalPhone,
            member_no: memberNo,
            notes: 'Imported from Excel'
          }).select('id').single()

          if (insertError) {
            // Jika gagal karena constraint unik (misal member_no duplikat), kita lewati
            throw insertError
          }
          memberId = newMember.id
        }

        // 2. Insert ke subscriptions (tanpa payment)
        if (memberId && membershipId && startDate && endDate) {
          // Cek apakah sudah punya active sub
          const { data: activeSub } = await supabase.from('subscriptions')
            .select('id')
            .eq('member_id', memberId)
            .eq('status', 'active')
            .limit(1)

          if (activeSub && activeSub.length > 0) {
            // Update masa aktif
            await supabase.from('subscriptions').update({
              membership_id: membershipId,
              start_date: startDate,
              end_date: endDate
            }).eq('id', activeSub[0].id)
          } else {
            // Insert baru
            await supabase.from('subscriptions').insert({
              member_id: memberId,
              membership_id: membershipId,
              start_date: startDate,
              end_date: endDate,
              status: 'active'
            })
          }
        }

        successCount++
        setImportLogs(prev => [...prev, { status: 'success', message: `${row.nama} berhasil diimpor` }])

      } catch (err: any) {
        errorCount++
        setImportLogs(prev => [...prev, { status: 'error', message: `Gagal impor ${row.nama}: ${err.message}` }])
      }

      setImportProgress(Math.round(((i + 1) / parsedData.length) * 100))
    }

    setIsImporting(false)
    queryClient.invalidateQueries({ queryKey: ['members-with-subscription'] })
    toast.success(`Impor selesai. ${successCount} berhasil, ${errorCount} gagal.`)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl uppercase text-foreground sm:text-3xl">Import Data Member</h1>
        <p className="text-sm text-muted-foreground">Migrasi data member massal dari file Excel (.xlsx) tanpa mempengaruhi Laporan Keuangan.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Upload Section */}
        <div className="md:col-span-1 space-y-4">
          <div
            className="w-full rounded-2xl bg-[#151515] p-8 border border-border text-center transition-all hover:bg-card cursor-pointer"
            onClick={() => !isImporting && fileInputRef.current?.click()}
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/20 mb-6">
              <FileSpreadsheet className="h-8 w-8 text-primary" />
            </div>

            <h3 className="text-lg font-bold text-foreground mb-2">Upload File Excel</h3>
            <p className="text-xs text-muted-foreground mb-6">Pilih file berformat .xlsx yang berisi data member.</p>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".xlsx,.xls,.csv"
              className="hidden"
              disabled={isImporting}
            />

            <button
              disabled={isImporting}
              className="flex items-center justify-center gap-2 w-full py-3 bg-primary hover:bg-[#E60000] text-foreground font-medium rounded-xl transition-all disabled:opacity-50"
            >
              <Upload className="h-4 w-4" />
              Pilih File Excel
            </button>
          </div>

          <div className="bg-[#151515] border border-border rounded-xl p-4 text-sm text-muted-foreground">
            <h4 className="font-bold text-foreground mb-2">Format Tabel Wajib:</h4>
            <ul className="list-disc pl-4 space-y-1 text-xs">
              <li>Kolom 1: Nomer Member</li>
              <li>Kolom 2: Nama</li>
              <li>Kolom 3: Telepon</li>
              <li>Kolom 4: Paket (1 BULAN/3 BULAN/COUPLE)</li>
              <li>Kolom 5: Mulai (DD/MM/YYYY)</li>
              <li>Kolom 6: Expired (DD/MM/YYYY)</li>
            </ul>
            <p className="mt-2 text-[10px] text-accent font-medium italic">*Sistem akan memvalidasi atau menghitung otomatis dari tanggal Mulai + durasi paket jika kolom ini kosong.</p>
          </div>
        </div>

        {/* Preview Section */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-card border border-border rounded-xl p-6 flex flex-col h-[500px]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-foreground">Pratinjau Data</h2>
              <span className="text-sm text-accent font-bold bg-[#D4FF00]/10 px-3 py-1 rounded-full">
                {parsedData.length} Member Ditemukan
              </span>
            </div>

            <div className="flex-1 overflow-auto border border-border rounded-lg">
              {isParsing ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                </div>
              ) : parsedData.length > 0 ? (
                <table className="w-full text-left text-xs text-gray-300">
                  <thead className="bg-[#222] sticky top-0 uppercase text-gray-400">
                    <tr>
                      <th className="px-4 py-3">Member No</th>
                      <th className="px-4 py-3">Nama</th>
                      <th className="px-4 py-3">Telepon</th>
                      <th className="px-4 py-3">Paket</th>
                      <th className="px-4 py-3">Mulai - Berakhir</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.slice(0, 100).map((row, idx) => (
                      <tr key={idx} className="border-t border-[#333] hover:bg-[#252525]">
                        <td className="px-4 py-2">{row.no_member}</td>
                        <td className="px-4 py-2 truncate max-w-[150px] font-medium text-foreground">{row.nama}</td>
                        <td className="px-4 py-2">{row.nomor_hp}</td>
                        <td className="px-4 py-2 truncate max-w-[100px]">{row.membership}</td>
                        <td className="px-4 py-2">
                          {formatDate(row.start) || '-'} - {(() => {
                            const end = formatDate(row.end)
                            if (end) return end

                            // Hitung otomatis untuk preview jika di excel kosong
                            const start = formatDate(row.start)
                            const mId = findMembershipId(row.membership)
                            const pkg = memberships?.find(m => m.id === mId)
                            if (start && pkg) {
                              const d = new Date(start)
                              d.setDate(d.getDate() + pkg.duration_days)
                              return toLocalISOString(d).split('T')[0]
                            }
                            return '-'
                          })()}
                        </td>
                      </tr>
                    ))}
                    {parsedData.length > 100 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-3 text-center text-muted-foreground bg-[#222]">
                          Menampilkan 100 dari {parsedData.length} data
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground/60">
                  <FileSpreadsheet className="h-12 w-12 mb-3 opacity-20" />
                  <p>Belum ada data file yang dimuat.</p>
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="w-full sm:w-1/2">
                {isImporting && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Proses Impor...</span>
                      <span>{importProgress}%</span>
                    </div>
                    <div className="h-2 w-full bg-[#333] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#D4FF00] transition-all duration-300"
                        style={{ width: `${importProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
                <AlertDialogTrigger>
                  <Button
                    disabled={parsedData.length === 0 || isImporting}
                    className="w-full sm:w-auto px-8 py-3 bg-[#D4FF00] hover:bg-[#bce600] text-black font-bold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" /> Mengimpor...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-5 w-5" /> Simpan ke Database
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="border-border bg-card text-foreground">
                  <AlertDialogHeader>
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 mb-4">
                      <ShieldAlert className="h-6 w-6 text-amber-500" />
                    </div>
                    <AlertDialogTitle className="font-heading text-xl">Konfirmasi Impor Massal</AlertDialogTitle>
                    <AlertDialogDescription className="text-muted-foreground">
                      Anda akan memasukkan <span className="text-foreground font-bold">{parsedData.length} data member</span> secara massal ke dalam database.
                      <br /><br />
                      <span className="text-red-400 font-medium">Peringatan:</span> Proses ini tidak dapat dibatalkan dan akan melakukan update otomatis jika nomor member sudah ada.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="border-border text-muted-foreground">Batal</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleImport}
                      className="bg-[#D4FF00] text-black font-bold hover:bg-[#bce600]"
                    >
                      Ya, Impor Sekarang
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </div>

      {/* Logs section if there are errors */}
      {importLogs.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-lg font-bold text-foreground mb-4">Log Impor</h3>
          <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
            {importLogs.map((log, i) => (
              <div key={i} className={`text-xs p-2 rounded flex items-start gap-2 ${log.status === 'error' ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                {log.status === 'error' ? <AlertCircle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
                <span>{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
