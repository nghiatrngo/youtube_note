const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env file');
    console.error('Please check your SUPABASE_URL and SUPABASE_ANON_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function restoreDatabase() {
    try {
        console.log('🗄️ Starting database restore...');
        
        // Read the latest backup file
        const backupDir = '/Users/nghiango-mbp/projects/backup';
        const backupFile = path.join(backupDir, 'latest.json');
        
        if (!fs.existsSync(backupFile)) {
            console.error('❌ Backup file not found:', backupFile);
            console.error('Please run the backup script first');
            return;
        }
        
        console.log('📁 Reading backup file:', backupFile);
        const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
        
        console.log('📊 Backup data summary:');
        console.log(`   - Users: ${backupData.tables.users.length}`);
        console.log(`   - Notes: ${backupData.tables.notes.length}`);
        console.log(`   - Database: ${backupData.database}`);
        
        // Ask for confirmation
        console.log('\n⚠️  WARNING: This will overwrite existing data in your online database!');
        console.log('   Make sure you want to proceed before continuing.');
        
        // For safety, we'll just show what would be restored
        console.log('\n📋 Data that would be restored:');
        
        console.log('\n👥 Users:');
        backupData.tables.users.forEach(user => {
            console.log(`   - ${user.username} (${user.email})`);
        });
        
        console.log('\n📝 Notes:');
        backupData.tables.notes.forEach(note => {
            console.log(`   - "${note.text.substring(0, 50)}${note.text.length > 50 ? '...' : ''}" (Video: ${note.video_id || note.videoId})`);
        });
        
        console.log('\n💡 To actually restore the data, you can:');
        console.log('   1. Use the Supabase dashboard to manually import the JSON');
        console.log('   2. Or modify this script to remove the safety checks and run it');
        console.log('   3. Or use Supabase CLI if you have it installed');
        
        console.log('\n📁 Your backup file is ready at:', backupFile);
        console.log('✅ Restore preview completed!');
        
    } catch (error) {
        console.error('❌ Error during restore preview:', error.message);
    }
}

restoreDatabase();
