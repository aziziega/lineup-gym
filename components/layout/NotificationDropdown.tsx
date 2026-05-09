'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, Clock, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Notification {
  id: string
  title: string
  content: string
  type: string
  is_read: boolean
  created_at: string
}

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const supabase = createClient()
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchNotifications()

    // Realtime subscription
    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => {
          fetchNotifications()
        }
      )
      .subscribe()

    // Click outside listener
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      supabase.removeChannel(channel)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [supabase])

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) throw error

      setNotifications(data || [])
      
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false)
        
      setUnreadCount(count || 0)
    } catch (err) {
      console.error('Error fetching notifications:', err)
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-all hover:bg-accent/10"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-border bg-card shadow-lg shadow-black/50">
          <div className="border-b border-border p-3">
            <h3 className="font-heading text-sm font-bold text-foreground">Notifikasi</h3>
          </div>
          
          <div className="max-h-[300px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                Belum ada notifikasi.
              </div>
            ) : (
              <div className="flex flex-col">
                {notifications.map((notif) => (
                  <Link
                    key={notif.id}
                    href="/dashboard/notifications"
                    onClick={() => {
                      setIsOpen(false)
                      supabase.from('notifications').update({ is_read: true }).eq('id', notif.id).then(() => fetchNotifications())
                    }}
                    className={`flex gap-3 border-b border-border p-3 transition-colors hover:bg-muted/50 ${
                      !notif.is_read ? 'bg-primary/5' : ''
                    }`}
                  >
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      {notif.type === 'visitor_approval' ? (
                        <AlertCircle className="h-4 w-4" />
                      ) : (
                        <Bell className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 relative pr-4">
                      <p className="text-sm font-bold text-foreground">{notif.title}</p>
                      {!notif.is_read && (
                        <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500 shadow-sm shadow-red-500/50" />
                      )}
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {notif.content}
                      </p>
                      <div className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>
                          {new Date(notif.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="p-2">
            <Link
              href="/dashboard/notifications"
              onClick={() => setIsOpen(false)}
              className="block rounded-lg p-2 text-center text-xs font-bold text-primary transition-colors hover:bg-primary/10"
            >
              Lihat semua notifikasi
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}