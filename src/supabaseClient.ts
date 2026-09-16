import { createClient } from '@supabase/supabase-js';

// เปลี่ยนข้อความใน '...' ให้เป็นค่าจริงจาก Supabase
const supabaseUrl = 'https://mhxatmvuicnpjhqxdngc.supabase.co/rest/v1/'; 
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oeGF0bXZ1aWNucGpocXhkbmdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1NDg0MzIsImV4cCI6MjEwNTEyNDQzMn0.wwWULGQlfhgeUkXMpZtC284q0S8F0wDz1jkDIoduk8A'; 

export const supabase = createClient(supabaseUrl, supabaseAnonKey);