'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  ShieldCheck, 
  Activity, 
  ChevronLeft, 
  ChevronRight, 
  Calendar 
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { formatTanggal, formatRupiah } from '@/lib/utils'

export default function ActivityLogsPage() {
  const { supabase, isAdmin } = useAuth()
  const [selectedLogDate, setSelectedLogDate] = useState<string>(new Date().toLocaleDateString('sv-SE'))

  // Fetch Users from Profiles for Actor Name resolution
  const { data: users } = useQuery({
    queryKey: ['users-list-for-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
      if (error) throw error
      return data
    },
    enabled: isAdmin
  })

  // Fetch Activity Logs
  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ['activity-logs', selectedLogDate],
    queryFn: async () => {
      const start = new Date(selectedLogDate + 'T00:00:00')
      const end = new Date(selectedLogDate + 'T23:59:59')
      
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data
    },
    enabled: isAdmin
  })

  // Date Navigation Handlers
  const handlePrevDay = () => {
    const d = new Date(selectedLogDate)
    d.setDate(d.getDate() - 1)
    setSelectedLogDate(d.toLocaleDateString('sv-SE'))
  }

  const handleNextDay = () => {
    const d = new Date(selectedLogDate)
    d.setDate(d.getDate() + 1)
    setSelectedLogDate(d.toLocaleDateString('sv-SE'))
  }

  const handleToday = () => {
    setSelectedLogDate(new Date().toLocaleDateString('sv-SE'))
  }

  // Parser Log Message
  const formatLogMessage = (log: any, userName: string) => {
    const name = userName || 'Admin/Owner'
    const details = log.details || {}

    switch (log.action_type) {
      case 'create_payment':
        return (
          <span>
            <strong className="text-foreground">{name}</strong> mencatat Pemasukan baru sebesar{' '}
            <strong className="text-accent">{formatRupiah(Number(details.new_data?.amount || 0))}</strong>{' '}
            ({details.new_data?.membership_type || 'Pemasukan Lainnya'}).
          </span>
        )
      case 'update_payment':
        return (
          <span>
            <strong className="text-foreground">{name}</strong> mengedit transaksi Pemasukan{' '}
            <strong className="text-accent">{formatRupiah(Number(details.new_data?.amount || 0))}</strong>.
          </span>
        )
      case 'delete_payment':
        return (
          <span>
            <strong className="text-foreground">{name}</strong> menghapus transaksi Pemasukan senilai{' '}
            <strong className="text-red-400">{formatRupiah(Number(details.old_data?.amount || 0))}</strong>.
          </span>
        )
      case 'create_expense':
        return (
          <span>
            <strong className="text-foreground">{name}</strong> mencatat Pengeluaran baru sebesar{' '}
            <strong className="text-red-400">{formatRupiah(Number(details.new_data?.amount || 0))}</strong>{' '}
            ({details.new_data?.description || 'Pengeluaran Lainnya'}).
          </span>
        )
      case 'update_expense':
        return (
          <span>
            <strong className="text-foreground">{name}</strong> mengedit data Pengeluaran menjadi{' '}
            <strong className="text-red-400">{formatRupiah(Number(details.new_data?.amount || 0))}</strong>.
          </span>
        )
      case 'delete_expense':
        return (
          <span>
            <strong className="text-foreground">{name}</strong> menghapus Pengeluaran senilai{' '}
            <strong className="text-red-400">{formatRupiah(Number(details.old_data?.amount || 0))}</strong>.
          </span>
        )
      case 'create_member':
        return (
          <span>
            <strong className="text-foreground">{name}</strong> mendaftarkan Member baru:{' '}
            <strong className="text-foreground">{details.new_data?.full_name}</strong>.
          </span>
        )
      case 'update_member':
        return (
          <span>
            <strong className="text-foreground">{name}</strong> memperbarui data Member:{' '}
            <strong className="text-foreground">{details.new_data?.full_name}</strong>.
          </span>
        )
      case 'renew_subscription': {
        const memberName = details.member_name || 'Member'
        const packages = []
        if (details.has_gym) {
          packages.push(details.membership_type || 'UMUM')
        }
        if (details.has_pt) {
          packages.push(details.pt_membership_type || 'PT')
        }
        return (
          <span>
            <strong className="text-foreground font-bold">{name}</strong> memperpanjang Paket Member atas nama:{' '}
            <strong className="text-foreground font-bold">{memberName}</strong>
            {packages.length > 0 && (
              <>
                , pilihan PAKET:{' '}
                <strong className="text-foreground font-bold">{packages.join(' & ').toUpperCase()}</strong>
              </>
            )}
            .
          </span>
        )
      }
      case 'complete_pt_session':
        return (
          <span>
            <strong className="text-foreground">{name}</strong> menandai Sesi Latihan PT selesai.
          </span>
        )
      case 'create_membership_package':
        return (
          <span>
            <strong className="text-foreground">{name}</strong> membuat Paket Membership baru:{' '}
            <strong className="text-foreground">{details.new_data?.name}</strong>.
          </span>
        )
      case 'check_in':
        return (
          <span>
            <strong className="text-foreground">{name}</strong> melakukan Check-In member:{' '}
            <strong className="text-accent">{details.new_data?.members?.full_name || details.new_data?.member_name || 'Member'}</strong>.
          </span>
        )
      case 'delete_check_in':
        return (
          <span>
            <strong className="text-foreground">{name}</strong> <strong className="text-red-400">membatalkan/menghapus</strong> Check-In member:{' '}
            <strong className="text-red-400">{details.old_data?.member_name || 'Member'}</strong>.
          </span>
        )
      default:
        return (
          <span>
            <strong className="text-foreground">{name}</strong> melakukan aksi{' '}
            <strong className="text-foreground">{log.action_type}</strong> pada tabel{' '}
            <strong className="text-foreground">{log.table_name}</strong>.
          </span>
        )
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center space-y-4">
        <ShieldCheck className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-heading uppercase">Akses Dibatasi</h2>
        <p className="text-muted-foreground text-sm">Hanya Owner/Admin yang dapat mengakses halaman ini.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl uppercase text-foreground sm:text-3xl flex items-center gap-2.5">
            <Activity className="h-7 w-7 text-primary" />
            Log Aktivitas Staff
          </h1>
          <p className="text-sm text-muted-foreground">Pantau riwayat aksi dan audit harian seluruh staff gym</p>
        </div>
      </div>

      <Card className="border-border/50 bg-card overflow-hidden">
        <CardHeader className="border-b border-border/30 px-5 py-4">
          <div className="flex items-center justify-between">
            <CardTitle className="font-heading text-lg text-foreground flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Log Riwayat Aktivitas Staff
            </CardTitle>
            <span className="text-xs font-semibold text-primary">Mode Audit Harian</span>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          {/* Control Panel: Date Navigation, Calendar Picker & Color Legend */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-border/30 pb-4 mb-5">
            {/* Date Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePrevDay}
                className="h-8 w-8 border-border/50 hover:bg-primary/10"
              >
                <ChevronLeft className="h-4 w-4 text-foreground" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleToday}
                disabled={selectedLogDate === new Date().toLocaleDateString('sv-SE')}
                className="h-8 text-xs font-bold border-border/50 hover:bg-[#D4FF00] hover:text-black disabled:opacity-50"
              >
                Hari Ini
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={handleNextDay}
                disabled={selectedLogDate >= new Date().toLocaleDateString('sv-SE')}
                className="h-8 w-8 border-border/50 hover:bg-primary/10 disabled:opacity-50"
              >
                <ChevronRight className="h-4 w-4 text-foreground" />
              </Button>

              {/* Styled Date Picker Input */}
              <div className="relative flex items-center gap-2 rounded-lg border border-border/50 bg-background px-3 py-1.5 text-xs text-foreground font-semibold">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                <input
                  type="date"
                  value={selectedLogDate}
                  max={new Date().toLocaleDateString('sv-SE')}
                  onChange={(e) => setSelectedLogDate(e.target.value)}
                  className="bg-transparent text-foreground outline-none cursor-pointer [color-scheme:dark] font-heading"
                />
              </div>
            </div>

            {/* Legend / Indikator Warna */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground bg-primary/5 px-3 py-1.5 rounded-lg border border-border/20">
              <span className="font-semibold text-foreground">Arti Warna:</span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-accent" /> Tambah Data
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Edit Data
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Hapus Data
              </span>
            </div>
          </div>

          {logsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-muted/10 border border-border/20" />
              ))}
            </div>
          ) : !logs || logs.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground border border-dashed border-border/30 rounded-xl bg-muted/5">
              Belum ada aktivitas staff yang tercatat pada tanggal <span className="font-bold text-foreground">{formatTanggal(selectedLogDate)}</span>.
            </div>
          ) : (
            <div className="relative border-l border-border/50 pl-5 ml-2 space-y-6">
              {logs.map((log: any) => {
                const userProfile = users?.find((u: any) => u.id === log.admin_id)
                const actorName = userProfile?.full_name || 'Admin/Owner'
                const isDelete = log.action_type.startsWith('delete')
                const isUpdate = log.action_type.startsWith('update')
                
                return (
                  <div key={log.id} className="relative group">
                    {/* Marker dot */}
                    <div className={`absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-card ${
                      isDelete ? 'bg-red-500' : isUpdate ? 'bg-blue-500' : 'bg-accent'
                    }`} />
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                      <p className="text-sm text-muted-foreground pr-4 leading-relaxed">
                        {formatLogMessage(log, actorName)}
                      </p>
                      <span className="text-[10px] text-muted-foreground/60 whitespace-nowrap pt-0.5 font-mono">
                        {formatTanggal(log.created_at)}, {new Date(log.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
