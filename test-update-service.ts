import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing supabase credentials")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testUpdate() {
  const { data: member } = await supabase.from('members').select('*').limit(1).single()
  if (!member) return
  
  console.log('Using key:', supabaseKey.substring(0, 15) + '...')
  const { data, error } = await supabase
    .from('members')
    .update({ notes: 'TEST_UPDATE_123' })
    .eq('id', member.id)
    .select()
    
  console.log('Update result data:', data)
  console.log('Update error:', error)
}

testUpdate()
