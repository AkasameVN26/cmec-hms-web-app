import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://wkyyexkbgzahstfebtfh.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndreXlleGtiZ3phaHN0ZmVidGZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0NzU2MjAsImV4cCI6MjA3NTA1MTYyMH0.QYPXF3cDa6V0jkwAxt-6O-aLucAf2VtasKPU6IcObvQ'

export const supabase = createClient(supabaseUrl, supabaseKey)
