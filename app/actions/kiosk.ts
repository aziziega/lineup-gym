'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { GYM_ID } from '@/lib/constants'

/**
 * Mencari data member berdasarkan nomor member atau nomor HP secara aman di sisi server.
 * Menggunakan admin client untuk bypass RLS secara terkontrol dan aman.
 */
export async function kioskCheckinLookup(searchVal: string) {
  const supabase = createAdminClient()

  // 1. Ambil data profil & status langganan dari view
  const { data, error } = await supabase
    .from('active_subscriptions_view')
    .select(`
      member_id,
      gym_id,
      full_name,
      phone,
      member_no,
      emergency_contact,
      notes,
      photo_url,
      membership_name,
      price,
      subscription_id,
      start_date,
      end_date,
      days_remaining,
      status,
      pt_membership_name,
      pt_subscription_id,
      pt_start_date,
      pt_end_date,
      pt_remaining_sessions,
      pt_total_sessions,
      pt_status
    `)
    .eq('gym_id', GYM_ID)
    .or(`member_no.eq.${searchVal},phone.eq.${searchVal}`)
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error("kioskCheckinLookup Error [Fetch]:", error)
    return { success: false, error: error.message }
  }

  if (!data) {
    return { success: true, data: null }
  }

  // 2. Ambil data absensi terakhir untuk cek anti-spam (4 jam terakhir)
  const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
  const { data: recentLog } = await supabase
    .from('attendance_logs')
    .select('check_in_at')
    .eq('member_id', data.member_id)
    .gte('check_in_at', fourHoursAgo)
    .order('check_in_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return {
    success: true,
    data: {
      ...data,
      last_check_in_at: recentLog?.check_in_at || null
    }
  }
}

/**
 * Mengecek apakah nomor telepon sudah terdaftar di database secara aman di sisi server.
 */
export async function checkExistingPhone(phone: string) {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('members')
    .select('id')
    .eq('gym_id', GYM_ID)
    .eq('phone', phone)
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error("checkExistingPhone Error:", error)
    return { success: false, error: error.message }
  }

  return { success: true, exists: !!data }
}
