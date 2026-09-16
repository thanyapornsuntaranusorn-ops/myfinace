import { createClient } from '@supabase/supabase-js';

// เปลี่ยนข้อความใน '...' ให้เป็นค่าจริงจาก Supabase
const supabaseUrl = 'https://xxxx.supabase.co'; 
const supabaseAnonKey = 'eyJhY...'; 

export const supabase = createClient(supabaseUrl, supabaseAnonKey);