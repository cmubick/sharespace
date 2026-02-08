#!/usr/bin/env node

/**
 * Bundle all Lambda functions into deployment packages
 * Creates bundles/ directory with individual Lambda function packages
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const lambdasDir = path.join(__dirname, '..', 'lambdas')
const bundlesDir = path.join(__dirname, '..', 'bundles')

// Get all Lambda services
const services = fs
  .readdirSync(lambdasDir)
  .filter(
    (file) =>
      fs.statSync(path.join(lambdasDir, file)).isDirectory() &&
      !file.startsWith('.')
  )

if (services.length === 0) {
  console.error('❌ Error: No Lambda services found')
  process.exit(1)
}

console.log('📦 Bundling all Lambda functions...')
console.log(`   Services: ${services.join(', ')}`)

services.forEach((service) => {
  try {
    execSync(`node ${path.join(__dirname, 'bundle-lambda.js')} ${service}`, {
      stdio: 'inherit',
    })
  } catch (error) {
    console.error(`❌ Failed to bundle ${service}:`, error.message)
    process.exit(1)
  }
})

console.log('\n✅ All Lambda functions bundled successfully')
console.log(`   Output directory: ${bundlesDir}`)
console.log('\n📋 Deployment options:')
console.log('   1. AWS Lambda Console: Upload ZIP files from bundles/')
console.log('   2. AWS CLI: aws lambda update-function-code --zip-file ...')
console.log('   3. CDK: Configure CDK to use bundled Lambda code')
console.log('   4. SAM: Package with sam package and deploy')
