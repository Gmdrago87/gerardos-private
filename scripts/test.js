import { execSync } from 'child_process';

console.log('🧪 Running test suite...');

try {
  console.log('1️⃣ Running JavaScript & CSS build validation...');
  execSync('npm run build:all', { stdio: 'inherit' });

  console.log('2️⃣ Running Linters...');
  execSync('npm run lint', { stdio: 'inherit' });

  console.log('✅ All tests passed successfully!');
} catch (error) {
  console.error('❌ Tests failed:', error.message);
  process.exit(1);
}
