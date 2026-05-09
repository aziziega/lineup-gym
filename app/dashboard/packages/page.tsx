'use client'

import { useState } from 'react'
import { useMemberships, useCreateMembership, useUpdateMembership, useToggleMembership } from '@/hooks/useMemberships'
import { formatRupiah } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import NativeSelect from '@/components/dashboard/NativeSelect'
import { Plus, Edit, ToggleLeft, ToggleRight } from 'lucide-react'
import { toast } from 'sonner'
import type { Membership } from '@/lib/types'

export default function PackagesPage() {
  const { data: memberships, isLoading } = useMemberships()
  const createMembership = useCreateMembership()
  const updateMembership = useUpdateMembership()
  const toggleMembership = useToggleMembership()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Membership | null>(null)

  const [formName, setFormName] = useState('')
  const [formCategory, setFormCategory] = useState<'gym' | 'pt'>('gym')
  const [formDuration, setFormDuration] = useState('')
  const [formTotalSessions, setFormTotalSessions] = useState('')
  const [formPrice, setFormPrice] = useState('')
  const [formDesc, setFormDesc] = useState('')

  const openEdit = (m: Membership) => {
    setEditing(m)
    setFormName(m.name)
    setFormCategory(m.category as 'gym' | 'pt')
    setFormDuration(String(m.duration_days))
    setFormTotalSessions(m.total_sessions ? String(m.total_sessions) : '')
    setFormPrice(String(m.price))
    setFormDesc(m.description ?? '')
    setDialogOpen(true)
  }

  const openCreate = () => {
    setEditing(null)
    setFormName('')
    setFormCategory('gym')
    setFormDuration('')
    setFormTotalSessions('')
    setFormPrice('')
    setFormDesc('')
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!formName || !formDuration || !formPrice) {
      toast.error('Nama, durasi, dan harga wajib diisi')
      return
    }

    try {
      if (editing) {
        await updateMembership.mutateAsync({
          id: editing.id,
          data: {
            name: formName,
            category: formCategory,
            duration_days: parseInt(formDuration),
            total_sessions: formCategory === 'pt' && formTotalSessions ? parseInt(formTotalSessions) : null,
            price: parseFloat(formPrice),
            description: formDesc || null,
          },
        })
        toast.success(`Paket ${formName} berhasil diperbarui!`)
      } else {
        await createMembership.mutateAsync({
          gym_id: '',
          name: formName,
          category: formCategory,
          duration_days: parseInt(formDuration),
          total_sessions: formCategory === 'pt' && formTotalSessions ? parseInt(formTotalSessions) : null,
          price: parseFloat(formPrice),
          description: formDesc || null,
          is_active: true,
        })
        toast.success(`Paket ${formName} berhasil ditambahkan!`)
      }
      setDialogOpen(false)
    } catch {
      toast.error('Gagal menyimpan paket')
    }
  }

  const handleToggle = async (id: string, currentActive: boolean, name: string) => {
    try {
      await toggleMembership.mutateAsync({ id, is_active: !currentActive })
      toast.success(`Paket ${name} ${!currentActive ? 'diaktifkan' : 'dinonaktifkan'}`)
    } catch {
      toast.error('Gagal mengubah status paket')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Kelola paket membership dari sini. Perubahan langsung mempengaruhi form tambah member.</p>
        <Button size="sm" onClick={openCreate} className="bg-[#D4FF00] text-xs font-bold text-black hover:bg-[#E60000]">
          <Plus className="mr-1 h-3.5 w-3.5" /> Tambah Paket
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl border border-border bg-card" />
          ))}
        </div>
      ) : (!memberships || memberships.length === 0) ? (
        <div className="rounded-xl border border-border bg-card py-12 text-center">
          <p className="text-sm text-muted-foreground/60">Belum ada paket membership</p>
        </div>
      ) : (
        <div className="space-y-2">
          {memberships.map((pkg) => (
            <div
              key={pkg.id}
              className={`rounded-xl border bg-card p-4 transition-colors ${
                pkg.is_active ? 'border-border/50' : 'border-border/30 opacity-50'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading text-xl text-foreground">{pkg.name}</h3>
                    {!pkg.is_active && (
                      <span className="rounded bg-[#2A2A2A] px-1.5 py-0.5 text-[10px] text-muted-foreground">Nonaktif</span>
                    )}
                  </div>
                  <p className="mt-0.5 font-heading text-2xl text-primary">{formatRupiah(pkg.price)}</p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${pkg.category === 'pt' ? 'bg-blue-500/20 text-blue-400' : 'bg-primary/10 text-primary'}`}>
                      {pkg.category === 'pt' ? 'PT' : 'GYM'}
                    </span>
                    <span className="text-xs text-muted-foreground">{pkg.duration_days} hari</span>
                    {pkg.total_sessions && <span className="text-xs text-muted-foreground">Â· {pkg.total_sessions} sesi</span>}
                  </div>
                  {pkg.description && (
                    <p className="mt-1 text-xs text-muted-foreground/60">{pkg.description}</p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEdit(pkg)}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleToggle(pkg.id, pkg.is_active, pkg.name)}
                    className={`h-8 w-8 p-0 ${pkg.is_active ? 'text-primary' : 'text-muted-foreground/60'}`}
                  >
                    {pkg.is_active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog form */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border-border bg-card text-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">
              {editing ? 'Edit Paket' : 'Tambah Paket Baru'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Nama Paket *</Label>
              <Input 
                value={formName} 
                onChange={(e) => setFormName(e.target.value)} 
                disabled={editing?.name === 'DAY'}
                className="border-border bg-background text-foreground disabled:opacity-50" 
                placeholder="Contoh: Weekly" 
              />
              {editing?.name === 'DAY' && (
                <p className="mt-1 text-[10px] text-red-500 font-medium">
                  * Nama paket "DAY" dikunci untuk menjaga stabilitas sistem approval visitor harian.
                </p>
              )}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Kategori *</Label>
              <NativeSelect
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value as 'gym' | 'pt')}
                disabled={editing?.name === 'DAY'}
                className="disabled:opacity-50"
                options={[
                  { value: 'gym', label: 'Gym (Membership Biasa)' },
                  { value: 'pt', label: 'PT (Personal Trainer)' },
                ]}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Durasi (hari) *</Label>
                <Input 
                  type="number" 
                  value={formDuration} 
                  onChange={(e) => setFormDuration(e.target.value)} 
                  disabled={editing?.name === 'DAY'}
                  className="border-border bg-background text-foreground disabled:opacity-50" 
                  placeholder="30" 
                />
              </div>
              {formCategory === 'pt' && (
                <div>
                  <Label className="text-xs text-muted-foreground">Total Sesi *</Label>
                  <Input 
                    type="number" 
                    value={formTotalSessions} 
                    onChange={(e) => setFormTotalSessions(e.target.value)} 
                    disabled={editing?.name === 'DAY'}
                    className="border-border bg-background text-foreground disabled:opacity-50" 
                    placeholder="8" 
                  />
                </div>
              )}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Harga (Rp) *</Label>
              <Input type="number" value={formPrice} onChange={(e) => setFormPrice(e.target.value)} className="border-border bg-background text-foreground" placeholder="250000" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Deskripsi</Label>
              <Input value={formDesc} onChange={(e) => setFormDesc(e.target.value)} className="border-border bg-background text-foreground" placeholder="Akses penuh 1 bulan" />
            </div>
            <Button
              onClick={handleSubmit}
              disabled={createMembership.isPending || updateMembership.isPending}
              className="w-full bg-primary font-bold text-black hover:bg-[#E60000]"
            >
              {(createMembership.isPending || updateMembership.isPending) ? 'Menyimpan...' : editing ? 'Perbarui Paket' : 'Simpan Paket'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
