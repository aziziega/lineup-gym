'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell, CheckCircle2, AlertCircle, Clock, Trash2, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { useCheckIn } from '@/hooks/useAttendance'
import { GYM_ID } from '@/lib/constants'

interface Notification {
  id: string
  title: string
  content: string
  type: string
  is_read: boolean
  created_at: string
  related_member_id?: string
  metadata?: {
    full_name: string
    phone: string
  }
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const supabase = createClient()
  const queryClient = useQueryClient()
  const checkIn = useCheckIn()

  useEffect(() => {
    fetchNotifications()

    // Realtime subscription
    const channel = supabase
      .channel('notifications-page-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => {
          fetchNotifications()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setNotifications(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notifId: string) => {
    try {
      const notif = notifications.find(n => n.id === notifId)
      if (!notif || notif.is_read) return

      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notifId)
      
      setNotifications(prev => prev.map(n => 
        n.id === notifId ? { ...n, is_read: true } : n
      ))
    } catch (err) {
      console.error('Error marking as read:', err)
    }
  }

  const handleApproveVisitor = async (notifId: string, memberId: string) => {
    setProcessingId(notifId)
    let currentMemberId = memberId
    let currentMemberName = ''
    try {

      // 1. Jika member belum ada (flow baru), buat member dulu dari metadata
      if (!currentMemberId) {
        const { data: notifData } = await supabase
          .from('notifications')
          .select('metadata')
          .eq('id', notifId)
          .single()
        
        if (!notifData?.metadata) throw new Error('Data visitor tidak ditemukan di notifikasi')
        
        const { full_name, phone } = notifData.metadata as any
        currentMemberName = full_name

        const { data: newMember, error: memberErr } = await supabase.from('members').insert({
          gym_id: GYM_ID,
          full_name,
          phone,
          notes: 'Visitor Harian (Approved)'
        }).select('id').single()

        if (memberErr) throw memberErr
        currentMemberId = newMember.id
      } else {
        // Ambil nama member jika member_id sudah ada
        const { data: member } = await supabase
          .from('members')
          .select('full_name')
          .eq('id', currentMemberId)
          .single()
        if (!member) throw new Error('Member tidak ditemukan')
        currentMemberName = member.full_name
      }

      // 2. Ambil paket DAY
      let { data: pkgData, error: pkgError } = await supabase
        .from('memberships')
        .select('id, price')
        .ilike('name', 'VISITOR')
        .limit(1)
        .single()
      
      if (pkgError || !pkgData) {
        const { data: fallbackPkg } = await supabase
          .from('memberships')
          .select('id, price')
          .ilike('name', '%VISITOR%')
          .limit(1)
          .single()
        pkgData = fallbackPkg
      }

      if (!pkgData) throw new Error('Paket VISITOR tidak ditemukan')

      const pkgId = pkgData.id
      const pkgPrice = pkgData.price
      const startDate = new Date().toISOString().split('T')[0]
      const endDate = new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0]

      // 3. Subscription
      const { error: subErr } = await supabase.from('subscriptions').insert({
        member_id: currentMemberId,
        membership_id: pkgId,
        start_date: startDate,
        end_date: endDate,
        status: 'active',
      })
      if (subErr) throw subErr

      // 4. Pembayaran
      const { error: payErr } = await supabase.from('payments').insert({
        gym_id: GYM_ID,
        member_id: currentMemberId,
        amount: pkgPrice,
        payment_method: 'cash',
        membership_type: 'VISITOR',
        paid_at: startDate,
        notes: 'Auto-payment: Approval Visitor Harian'
      })
      if (payErr) throw payErr

      // 5. Check-in
      await checkIn.mutateAsync({ memberId: currentMemberId, notes: 'Visitor Check-In (Approval)' })

      // 6. Update Notes
      await supabase.from('members').update({ notes: 'Visitor Harian (Selesai)' }).eq('id', currentMemberId)

      // 7. Hapus Notifikasi
      await supabase.from('notifications').delete().eq('id', notifId)
      setNotifications(prev => prev.filter(n => n.id !== notifId))
      
      queryClient.invalidateQueries({ queryKey: ['members-with-subscription'] })
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['overview'] })
      
      const formattedPrice = new Intl.NumberFormat('id-ID', {
        style: 'currency', currency: 'IDR', minimumFractionDigits: 0
      }).format(pkgPrice)

      toast.success(`${currentMemberName} berhasil disetujui! Paket VISITOR & Pembayaran ${formattedPrice} tercatat.`)
    } catch (err: any) {
      console.error('ERROR APPROVING VISITOR:', err)
      toast.error(`Gagal menyetujui: ${err.message || 'Terjadi kesalahan'}`)
      
      // Manual rollback jika flow member baru gagal di tengah jalan
      if (!memberId && currentMemberId) {
        console.log('Rolling back partially created member:', currentMemberId)
        await supabase.from('members').delete().eq('id', currentMemberId)
      }
    } finally {
      setProcessingId(null)
    }
  }

  const handleRejectVisitor = async (notifId: string, memberId: string) => {
    setProcessingId(notifId)
    try {
      // Jika ada member_id dari parameter, hapus
      if (memberId) {
        await supabase.from('members').delete().eq('id', memberId)
      } else {
        // Coba cari dari metadata notifikasi jika flow baru nyangkut
        const { data: notifData } = await supabase.from('notifications').select('metadata').eq('id', notifId).single()
        if (notifData?.metadata) {
          const { phone } = notifData.metadata as any
          if (phone) {
             await supabase.from('members').delete().eq('phone', phone).eq('notes', 'Visitor Harian (Approved)')
          }
        }
      }
      
      // Hapus notifikasi
      await supabase.from('notifications').delete().eq('id', notifId)
      
      setNotifications(prev => prev.filter(n => n.id !== notifId))
      toast.success('Notifikasi berhasil dihapus')
    } catch (err) {
      toast.error('Gagal menghapus notifikasi')
      console.error(err)
    } finally {
      setProcessingId(null)
    }
  }

  // Pengelompokan berdasarkan tanggal
  const groupedNotifications = notifications.reduce((acc, notif) => {
    const dateObj = new Date(notif.created_at)
    // Gunakan format lokal bahasa Indonesia
    const dateKey = dateObj.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).toUpperCase()

    if (!acc[dateKey]) acc[dateKey] = []
    acc[dateKey].push(notif)
    return acc
  }, {} as Record<string, Notification[]>)

  const totalNotif = notifications.length
  const unreadNotif = notifications.filter(n => !n.is_read).length
  const readNotif = totalNotif - unreadNotif

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Memuat notifikasi...</div>
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl uppercase text-foreground sm:text-3xl flex items-center gap-2">
          <Bell className="h-6 w-6 text-primary" /> Notifikasi
        </h1>
        <p className="text-sm text-muted-foreground">
          {unreadNotif > 0 ? `Ada ${unreadNotif} pesan baru yang belum dibaca` : 'Semua notifikasi sudah dibaca'}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
            <Bell className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Notifikasi</p>
            <p className="font-heading text-2xl font-bold text-foreground">{totalNotif}</p>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Belum Dibaca</p>
            <p className="font-heading text-2xl font-bold text-foreground">{unreadNotif}</p>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/10 text-green-500">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Sudah Dibaca</p>
            <p className="font-heading text-2xl font-bold text-foreground">{readNotif}</p>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="space-y-6">
        {Object.entries(groupedNotifications).length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">
            Tidak ada notifikasi saat ini.
          </div>
        ) : (
          Object.entries(groupedNotifications).map(([dateLabel, items]) => (
            <div key={dateLabel} className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                <Clock className="h-4 w-4" />
                {dateLabel}
              </div>
              
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                {items.map((notif, idx) => (
                  <div 
                    key={notif.id}
                    onClick={() => markAsRead(notif.id)}
                    className={`flex flex-col gap-3 p-4 transition-colors cursor-pointer ${
                      idx !== items.length - 1 ? 'border-b border-border' : ''
                    } ${!notif.is_read ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-[#1a1a1a]'}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-500/10 text-orange-500">
                        <AlertCircle className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-orange-500/10 px-2 py-0.5 text-[10px] font-bold text-orange-500">
                            Persetujuan Visitor
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(notif.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="mt-2 text-sm text-foreground">{notif.content}</p>
                          {!notif.is_read && (
                            <span className="h-2.5 w-2.5 rounded-full bg-red-500 shadow-sm shadow-red-500/50" />
                          )}
                        </div>

                        {/* Actions for visitor_approval */}
                        {notif.type === 'visitor_approval' && (
                          <div className="mt-4 flex gap-2">
                            <Button 
                              size="sm"
                              disabled={processingId === notif.id}
                              onClick={() => handleApproveVisitor(notif.id, notif.related_member_id || '')}
                              className="bg-primary/10 text-primary hover:bg-primary/20 h-8 text-xs px-3"
                            >
                              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> 
                              {processingId === notif.id ? 'Memproses...' : 'Izinkan & Absen'}
                            </Button>
                            <Button 
                              size="sm"
                              variant="ghost"
                              disabled={processingId === notif.id}
                              onClick={() => handleRejectVisitor(notif.id, notif.related_member_id || '')}
                              className="text-red-500 hover:bg-red-500/10 h-8 text-xs px-3"
                            >
                              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Tolak & Hapus
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
