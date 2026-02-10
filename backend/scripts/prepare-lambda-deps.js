#!/usr/bin/env node

const { execSync } = require('child_process')

const target = process.env.LAMBDA_PLATFORM
if (target !== 'linux') {
  console.log('ℹ️  LAMBDA_PLATFORM not set to linux, skipping sharp rebuild')
  process.exit(0)
}

console.log('🔧 Rebuilding sharp for AWS Lambda Linux (glibc, x64)')

try {
  execSync('npm rebuild sharp --platform=linux --arch=x64 --libc=glibc', {
    stdio: 'inherit',
  })
  console.log('✅ sharp rebuild complete')
} catch (error) {
  console.error('❌ sharp rebuild failed:', error.message)
  process.exit(1)
}
