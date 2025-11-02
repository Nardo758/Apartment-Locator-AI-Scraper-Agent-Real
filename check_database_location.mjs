import dotenv from 'dotenv';
dotenv.config();

console.log('\n📍 Current Database Configuration\n');
console.log('='.repeat(70));

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log(`\nSUPABASE_URL: ${url}`);
console.log(`Key length: ${key?.length || 0} characters`);
console.log(`Key prefix: ${key?.substring(0, 20)}...`);

console.log('\n📊 Database Type:\n');

if (url.includes('127.0.0.1') || url.includes('localhost')) {
    console.log('   🏠 LOCAL DEVELOPMENT DATABASE');
    console.log('   Location: Running on your machine');
    console.log('   Studio URL: http://127.0.0.1:54381');
    console.log('   API URL: http://127.0.0.1:54380');
    console.log('\n   ⚠️  Data will be LOST if you stop the local Supabase instance!');
    console.log('   ⚠️  Data is NOT accessible from other machines or production!');
} else if (url.includes('supabase.co')) {
    console.log('   ☁️  PRODUCTION CLOUD DATABASE');
    console.log('   Location: Supabase Cloud');
    console.log('   Accessible: From anywhere');
    console.log('   Persistent: Data is permanently stored');
} else {
    console.log('   ❓ UNKNOWN DATABASE TYPE');
    console.log(`   URL: ${url}`);
}

console.log('\n💡 To switch to production Supabase:\n');
console.log('   1. Get your production Supabase URL and service role key');
console.log('   2. Update .env.production.real with production credentials');
console.log('   3. Make sure production database has the same schema/tables');

console.log('\n' + '='.repeat(70));
console.log('');
