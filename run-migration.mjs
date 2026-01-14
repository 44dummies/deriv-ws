#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = 'https://ombjiivagfiulpfkcvbm.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tYmppaXZhZ2ZpdWxwZmtjdmJtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njk3NDg3OCwiZXhwIjoyMDgyNTUwODc4fQ.FdWJ8s9ZzC2amh0vfoNkkBa2eVIjdUYw1Tl4NvCo-Tk';

const supabase = createClient(supabaseUrl, serviceKey);

const migrationSQL = readFileSync('./supabase/migrations/20260114120000_fix_updated_at_column.sql', 'utf-8');

console.log('Running migration: 20260114120000_fix_updated_at_column.sql');
console.log('SQL:', migrationSQL.substring(0, 200) + '...');

const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

if (error) {
    console.error('Migration failed:', error);
    process.exit(1);
}

console.log('Migration completed successfully!');
console.log('Result:', data);
