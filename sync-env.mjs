import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const masterEnvPath = path.join(__dirname, '.env.master');

if (!fs.existsSync(masterEnvPath)) {
  console.error('❌ .env.master not found. Please create it first.');
  process.exit(1);
}

const masterEnvContent = fs.readFileSync(masterEnvPath, 'utf8');

const plans = [
  'beginner-plan',
  'basic-plan',
  'intermediate-plan',
  'professional-plan',
  'enterprise-plan'
];

console.log('🔄 Syncing .env.master to all plans...');

plans.forEach(plan => {
  const planDir = path.join(__dirname, plan);
  if (fs.existsSync(planDir)) {
    const envLocalPath = path.join(planDir, '.env.local');
    fs.writeFileSync(envLocalPath, masterEnvContent);
    console.log(`✅ Synced to ${plan}/.env.local`);
  } else {
    console.log(`⚠️ Skipped ${plan} (Directory not found)`);
  }
});

console.log('🎉 Sync complete!');
