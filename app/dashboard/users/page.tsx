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
  EyeOff
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { formatTanggal } from '@/lib/utils'
import { toast } from 'sonner'
import { createStaffAccount, deleteUserAccount } from '@/app/actions/users'

export default function UserManagementPage() {
  const { supabase, isAdmin, user: currentUser } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  
  // States for new user form
  const [newEmail, setNewEmail] = useState('')
  const [newName, setNewName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

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
      toast.error("Terjadi kesalahan sistem")
    } finally {
      setLoading(false)
    }
  }

  // 3. Handle Delete User
  const handleDelete = async (userId: string, name: string) => {
    if (userId === currentUser?.id) {
      toast.error("Kamu tidak bisa menghapus akunmu sendiri!")
      return
    }

    if (!confirm(`Hapus akun ${name}? Tindakan ini tidak bisa dibatalkan.`)) return

    try {
      const res = await deleteUserAccount(userId)
      if (res.success) {
        toast.success("Akun berhasil dihapus")
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
                        onClick={() => handleDelete(user.id, user.full_name)}
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
                    <span>Terakhir aktif: {user.last_seen_at ? formatTanggal(user.last_seen_at) : 'Belum pernah'}</span>
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
    </div>
  )
}
