'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface ExportFinanceModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  payments: any[]
  expenses: any[]
}

export default function ExportFinanceModal({ isOpen, onOpenChange, payments, expenses }: ExportFinanceModalProps) {
  const [exportStartDate, setExportStartDate] = useState(() => {
    const d = new Date()
    d.setDate(1) // default awal bulan ini
    return d.toISOString().split('T')[0]
  })
  const [exportEndDate, setExportEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })

  const handleExportExcelRange = () => {
    const incList = (payments || []).filter((p: any) => {
      if (!p.paid_at) return false
      const d = p.paid_at.split('T')[0]
      return d >= exportStartDate && d <= exportEndDate
    })

    const expList = (expenses || []).filter((e: any) => {
      if (!e.expense_date) return false
      const d = e.expense_date.split('T')[0]
      return d >= exportStartDate && d <= exportEndDate
    })

    const totalInc = incList.reduce((sum, p) => sum + Number(p.amount), 0)
    const totalExp = expList.reduce((sum, e) => sum + Number(e.amount), 0)
    const netProfit = totalInc - totalExp

    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Report</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
        <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
        <style>
          table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
          th, td { border: 1px solid #aaaaaa; padding: 8px; text-align: left; font-family: Arial, sans-serif; }
          th { background-color: #f2f2f2; font-weight: bold; }
          .header-section { font-size: 16px; font-weight: bold; margin-top: 20px; margin-bottom: 10px; font-family: Arial, sans-serif; }
        </style>
      </head>
      <body>
        <div class="header-section">LAPORAN KEUANGAN: PEMASUKAN (${exportStartDate} s/d ${exportEndDate})</div>
        <table>
          <thead>
            <tr>
              <th>Nama Member</th>
              <th>Paket</th>
              <th>Metode Bayar</th>
              <th>Jumlah</th>
              <th>Tanggal</th>
            </tr>
          </thead>
          <tbody>
            ${incList.map(p => `
              <tr>
                <td>${p.members?.full_name ?? p.notes ?? '-'}</td>
                <td>${p.membership_type || '-'}</td>
                <td>${p.payment_method || '-'}</td>
                <td>${p.amount}</td>
                <td>${p.paid_at ? p.paid_at.substring(0, 10) : '-'}</td>
              </tr>
            `).join('')}
            <tr>
              <td colspan="3" style="text-align: right; font-weight: bold;">Total Pemasukan:</td>
              <td colspan="2" style="font-weight: bold;">${totalInc}</td>
            </tr>
          </tbody>
        </table>

        <div class="header-section">LAPORAN KEUANGAN: PENGELUARAN (${exportStartDate} s/d ${exportEndDate})</div>
        <table>
          <thead>
            <tr>
              <th>Kategori</th>
              <th>Deskripsi</th>
              <th>Jumlah</th>
              <th>Tanggal</th>
            </tr>
          </thead>
          <tbody>
            ${expList.map(e => `
              <tr>
                <td>${e.category || '-'}</td>
                <td>${e.description || '-'}</td>
                <td>${e.amount}</td>
                <td>${e.expense_date || '-'}</td>
              </tr>
            `).join('')}
            <tr>
              <td colspan="2" style="text-align: right; font-weight: bold;">Total Pengeluaran:</td>
              <td colspan="2" style="font-weight: bold;">${totalExp}</td>
            </tr>
          </tbody>
        </table>

        <div class="header-section">RINGKASAN KEUANGAN</div>
        <table>
          <tr>
            <td style="font-weight: bold;">Total Pemasukan</td>
            <td style="font-weight: bold;">${totalInc}</td>
          </tr>
          <tr>
            <td style="font-weight: bold;">Total Pengeluaran</td>
            <td style="font-weight: bold;">${totalExp}</td>
          </tr>
          <tr style="font-weight: bold; color: #00aa00;">
            <td>Profit Bersih (Net)</td>
            <td>${netProfit}</td>
          </tr>
        </table>
      </body>
      </html>
    `

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Laporan_Keuangan_${exportStartDate}_to_${exportEndDate}.xls`
    a.click()
    URL.revokeObjectURL(url)
    onOpenChange(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="border-[#2A2A2A] bg-[#1A1A1A] text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Export Laporan Keuangan</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#888] block mb-1">Dari Tanggal</label>
              <input
                type="date"
                value={exportStartDate}
                onChange={(e) => setExportStartDate(e.target.value)}
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#111] px-3 py-2 text-sm text-white [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="text-xs text-[#888] block mb-1">Sampai Tanggal</label>
              <input
                type="date"
                value={exportEndDate}
                onChange={(e) => setExportEndDate(e.target.value)}
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#111] px-3 py-2 text-sm text-white [color-scheme:dark]"
              />
            </div>
          </div>
          <p className="text-[10px] text-[#555]">
            *Laporan akan mencakup seluruh data Pemasukan, Pengeluaran, dan Ringkasan Keuangan dalam rentang waktu yang dipilih.
          </p>
          <Button
            onClick={handleExportExcelRange}
            className="w-full bg-[#D4FF00] font-bold text-black hover:bg-[#c5ef00]"
          >
            Download Excel (.xls)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
