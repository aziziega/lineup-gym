'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function createStaffAccount(formData: {
  email: string
  fullName: string
  password?: string
}) {
  const supabase = createAdminClient()
  
  // 1. Create the user in Auth
  const { data, error } = await supabase.auth.admin.createUser({
    email: formData.email,
    password: formData.password || 'Lineup123!', // Password default
    email_confirm: true,
    user_metadata: {
      full_name: formData.fullName
    }
  })

  if (error) {
    console.error('Error creating user:', error.message)
    return { success: false, error: error.message }
  }

  // 2. The profile will be auto-created by our SQL trigger
  // but we can update it just in case metadata wasn't enough
  if (data.user) {
    await supabase
      .from('profiles')
      .update({ full_name: formData.fullName, role: 'staff' })
      .eq('id', data.user.id)
  }

  revalidatePath('/dashboard/users')
  return { success: true }
}

export async function deleteUserAccount(userId: string) {
  const supabase = createAdminClient()
  
  const { error } = await supabase.auth.admin.deleteUser(userId)
  
  if (error) {
    console.error('Error deleting user:', error.message)
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/users')
  return { success: true }
}
