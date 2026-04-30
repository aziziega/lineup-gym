import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing supabase credentials")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testUpdate() {
  console.log('1. Fetching a single member to test...')
  const { data: member, error: err1 } = await supabase.from('members').select('*').limit(1).single()
  
  if (err1) {
    console.error('Failed to fetch member:', err1)
    return
  }
  
  if (!member) {
    console.log('No members found!')
    return
  }
  
  console.log('Found member:', member.id, member.full_name, 'Current notes:', member.notes)
  
  console.log('\n2. Attempting to update notes to "TEST_UPDATE_123"...')
  const { data: updateData, error: updateError } = await supabase
    .from('members')
    .update({ notes: 'TEST_UPDATE_123' })
    .eq('id', member.id)
    .select()
    
  console.log('Update result data:', updateData)
  console.log('Update error:', updateError)
  
  if (!updateError) {
    console.log('\n3. Verifying update in DB...')
    const { data: verifyData } = await supabase.from('members').select('notes').eq('id', member.id).single()
    console.log('Verification DB notes:', verifyData?.notes)
    
    // Revert
    await supabase.from('members').update({ notes: member.notes }).eq('id', member.id)
    console.log('Reverted to original notes.')
  }
}

testUpdate()
