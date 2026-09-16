import { createClient } from '@supabase/supabase-js';

// วาง URL และ Key ตรงๆ ลงในไฟล์นี้ได้เลยครับ
const supabaseUrl = 'วาง_PROJECT_URL_ตรงนี้';
const supabaseAnonKey = 'วาง_PUBLISHABLE_KEY_ตรงนี้';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);