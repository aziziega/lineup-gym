'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  ShieldCheck, 
  UserPlus, 
  Search, 
  Circle, 
  Clock, 
  Mail,
  User,
  Trash2,
  Eye,
  EyeOff,
  Activity,
  ChevronLeft,
  ChevronRight,
  Calendar
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { formatTanggal, formatRupiah } from '@/lib/utils'
import { toast } from 'sonner'
import { createStaffAccount, deleteUserAccount } from '@/app/actions/users'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export default function UserManagementPage() {
  const { supabase, isAdmin, user: currentUser } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [activeTab, setActiveTab] = useState<'staff' | 'logs'>('staff')
  
  const [selectedLogDate, setSelectedLogDate] = useState<string>(new Date().toLocaleDateString('sv-SE'))
  
  // States for new user form
  const [newEmail, setNewEmail] = useState('')
  const [newName, setNewName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  // States for deleting user
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteUserData, setDeleteUserData] = useState<{ id: string; name: string } | null>(null)

  // 1. Fetch Users from Profiles
  const { data: users, isLoading, refetch } = useQuery({
    queryKey: ['users-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('role', { ascending: true })
        .order('full_name', { ascending: true })
      
      if (error) throw error
      return data
    },
    enabled: isAdmin
  })

  // 1b. Fetch Activity Logs
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
    enabled: isAdmin && activeTab === 'logs'
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
      case 'renew_subscription':
        return (
          <span>
            <strong className="text-foreground">{name}</strong> memperpanjang paket Member:{' '}
            <strong className="text-foreground">{details.new_data?.full_name || 'Member'}</strong>.
          </span>
        )
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

  // 2. Handle Add User
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEmail || !newName || !newPassword) {
      toast.error("Semua kolom harus diisi")
      return
    }
    
    if (newPassword.length < 6) {
      toast.error("Password minimal 6 karakter")
      return
    }

    setLoading(true)
    try {
      const res = await createStaffAccount({
        email: newEmail,
        fullName: newName,
        password: newPassword
      })

      if (res.success) {
        toast.success(`Staff ${newName} berhasil didaftarkan!`)
        setIsAdding(false)
        setNewEmail('')
        setNewName('')
        setNewPassword('')
        refetch()
      } else {
        toast.error(res.error || "Gagal mendaftarkan staff")
      }
    } catch (error) {
      console.error("Gagal daftarkan staff (sistem):", error)
      toast.error("Terjadi kesalahan sistem")
    } finally {
      setLoading(false)
    }
  }

  // 3. Handle Delete User
  const handleDelete = async () => {
    if (!deleteUserData) return
    const { id: userId, name } = deleteUserData

    if (userId === currentUser?.id) {
      toast.error("Kamu tidak bisa menghapus akunmu sendiri!")
      return
    }

    try {
      const res = await deleteUserAccount(userId)
      if (res.success) {
        toast.success(`Akun ${name} berhasil dihapus`)
        setDeleteOpen(false)
        refetch()
      } else {
        toast.error(res.error)
      }
    } catch {
      toast.error("Gagal menghapus akun")
    }
  }

  const filteredUsers = users?.filter(u => 
    u.id !== currentUser?.id && (
      u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
    )
  )

  if (!isAdmin) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center space-y-4">
        <ShieldCheck className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-heading uppercase">Akses Dibatasi</h2>
        <p className="text-muted-foreground text-sm">Hanya Owner yang dapat mengakses halaman ini.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl uppercase text-foreground sm:text-3xl">Manajemen User</h1>
          <p className="text-sm text-muted-foreground">Kelola akun Staff dan pantau aktivitas mereka</p>
        </div>
        <Button onClick={() => setIsAdding(!isAdding)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          {isAdding ? 'Batal' : 'Tambah Staff'}
        </Button>
      </div>

      {isAdding && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <form onSubmit={handleAddUser} className="grid gap-4 sm:grid-cols-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Nama Lengkap</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Nama Staff" 
                    className="pl-9" 
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="email" 
                    placeholder="staff@lineupgym.com" 
                    className="pl-9"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Password</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type={showPassword ? 'text' : 'password'} 
                    placeholder="******" 
                    className="pl-9 pr-10"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="flex items-end">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Memproses...' : 'Daftarkan Staff'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-border/40 pb-px">
        <button
          onClick={() => setActiveTab('staff')}
          className={`border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
            activeTab === 'staff'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Daftar Akun Staff
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
            activeTab === 'logs'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Aktivitas Staff (Audit Logs)
        </button>
      </div>

      {activeTab === 'staff' ? (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Cari nama atau email..." 
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {isLoading ? (
              Array(3).fill(0).map((_, i) => (
                <Card key={i} className="animate-pulse border-border/50 bg-card">
                  <CardContent className="h-32" />
                </Card>
              ))
            ) : filteredUsers?.map((user) => {
              const isOnline = user.last_seen_at && (new Date().getTime() - new Date(user.last_seen_at).getTime() < 1000 * 60 * 10)
              
              return (
                <Card key={user.id} className="group relative overflow-hidden border-border/50 bg-card transition-all hover:border-primary/30">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                            {user.full_name?.slice(0, 1).toUpperCase() || '?'}
                          </div>
                          <div className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card ${isOnline ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{user.full_name || 'Tanpa Nama'}</h3>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${user.role === 'admin' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                          {user.role}
                        </div>
                        {user.id !== currentUser?.id && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => {
                              setDeleteUserData({ id: user.id, name: user.full_name || 'Tanpa Nama' })
                              setDeleteOpen(true)
                            }}
                            className="h-8 w-8 text-muted-foreground hover:bg-red-500/10 hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        <span>
                          Terakhir aktif: {user.last_seen_at ? (
                            `${formatTanggal(user.last_seen_at)}, ${new Date(user.last_seen_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`
                          ) : 'Belum pernah'}
                        </span>
                      </div>
                      {isOnline && (
                        <span className="flex items-center gap-1 text-emerald-500 font-medium">
                          <Circle className="h-2 w-2 fill-current" /> Online
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </>
      ) : (
        <Card className="border-border/50 bg-card overflow-hidden">
          <CardHeader className="border-b border-border/30 px-5 py-4">
            <div className="flex items-center justify-between">
              <CardTitle className="font-heading text-lg text-foreground flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Log Riwayat Aktivitas Staff
              </CardTitle>
              <span className="text-xs text-muted-foreground font-semibold text-primary">Mode Audit Harian</span>
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
      )}

      {/* AlertDialog konfirmasi hapus akun staff */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="border-border bg-card text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Akun Staff?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Apakah kamu yakin ingin menghapus akun staff <span className="font-bold text-foreground">{deleteUserData?.name}</span>? Tindakan ini tidak bisa dibatalkan dan staff tersebut tidak akan bisa login lagi ke sistem.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border text-muted-foreground">Batal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-red-500 text-foreground hover:bg-red-600"
            >
              Hapus Akun
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
