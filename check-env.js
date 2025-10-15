// Simple script to check if environment variables are set correctly
require('dotenv').config();

console.log('\n🔍 Checking Environment Variables...\n');

const checks = [
  { name: 'DODO_API_KEY', value: process.env.DODO_API_KEY },
  { name: 'DODO_SECRET_KEY', value: process.env.DODO_SECRET_KEY },
  { name: 'DODO_BASE_URL', value: process.env.DODO_BASE_URL },
  { name: 'DODO_MONTHLY_PRODUCT_ID', value: process.env.DODO_MONTHLY_PRODUCT_ID },
  { name: 'DODO_YEARLY_PRODUCT_ID', value: process.env.DODO_YEARLY_PRODUCT_ID },
  { name: 'FRONTEND_URL', value: process.env.FRONTEND_URL },
  { name: 'BACKEND_URL', value: process.env.BACKEND_URL },
];

let allGood = true;

checks.forEach(check => {
  if (check.value) {
    // Show first 30 characters for security
    const displayValue = check.value.length > 30 
      ? check.value.substring(0, 30) + '...' 
      : check.value;
    console.log(`✅ ${check.name}: ${displayValue}`);
  } else {
    console.log(`❌ ${check.name}: NOT SET`);
    allGood = false;
  }
});

console.log('\n' + '='.repeat(60));

if (allGood) {
  console.log('✅ All environment variables are set!');
  console.log('\nNext steps:');
  console.log('1. Restart your backend server');
  console.log('2. Try subscribing again');
  console.log('3. Check backend console for Dodo API response');
} else {
  console.log('❌ Some environment variables are missing!');
  console.log('\nAction required:');
  console.log('1. Open backend/.env file');
  console.log('2. Add the missing variables');
  console.log('3. Save the file');
  console.log('4. Restart backend server');
  console.log('\nSee CHECK_ENV.md for detailed instructions.');
}

console.log('='.repeat(60) + '\n');
