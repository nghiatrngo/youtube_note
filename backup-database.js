const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Supabase client configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables!');
    console.error('Please set SUPABASE_URL and SUPABASE_ANON_KEY in your .env file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Backup function
async function backupDatabase() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = '/Users/nghiango-mbp/projects/backup';
    const backupFile = path.join(backupDir, `backup-${timestamp}.json`);
    
    console.log('🗄️ Starting database backup...');
    console.log(`📁 Backup will be saved to: ${backupFile}`);
    
    try {
        // Create backup directory if it doesn't exist
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
            console.log('📁 Created backup directory');
        }
        
        const backup = {
            timestamp: new Date().toISOString(),
            database: 'Supabase',
            tables: {}
        };
        
        // Backup users table
        console.log('👥 Backing up users table...');
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('*');
        
        if (usersError) {
            console.error('❌ Error backing up users:', usersError);
            backup.tables.users = { error: usersError.message, data: [] };
        } else {
            backup.tables.users = users || [];
            console.log(`✅ Users backed up: ${backup.tables.users.length} records`);
        }
        
        // Backup notes table
        console.log('📝 Backing up notes table...');
        const { data: notes, error: notesError } = await supabase
            .from('notes')
            .select('*');
        
        if (notesError) {
            console.error('❌ Error backing up notes:', notesError);
            backup.tables.notes = { error: notesError.message, data: [] };
        } else {
            backup.tables.notes = notes || [];
            console.log(`✅ Notes backed up: ${backup.tables.notes.length} records`);
        }
        
        // Add summary statistics
        backup.summary = {
            totalUsers: backup.tables.users.length || 0,
            totalNotes: backup.tables.notes.length || 0,
            backupSize: JSON.stringify(backup).length
        };
        
        // Write backup to file
        fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
        
        console.log('✅ Database backup completed successfully!');
        console.log(`📊 Summary:`);
        console.log(`   - Users: ${backup.summary.totalUsers}`);
        console.log(`   - Notes: ${backup.summary.totalNotes}`);
        console.log(`   - Backup size: ${(backup.summary.backupSize / 1024).toFixed(2)} KB`);
        console.log(`📁 Backup saved to: ${backupFile}`);
        
        // Also create a latest.json file for easy access
        const latestFile = path.join(backupDir, 'latest.json');
        fs.writeFileSync(latestFile, JSON.stringify(backup, null, 2));
        console.log(`📁 Latest backup also saved to: ${latestFile}`);
        
    } catch (error) {
        console.error('❌ Backup failed:', error);
        process.exit(1);
    }
}

// Run backup
backupDatabase();
