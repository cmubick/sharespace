#!/usr/bin/env node

/**
 * Bundle a single Lambda function into a deployment package
 * Usage: node scripts/bundle-lambda.js <service-name>
 * Example: node scripts/bundle-lambda.js health
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const service = process.argv[2]

if (!service) {
  console.error('❌ Error: Service name required')
  console.log('Usage: node scripts/bundle-lambda.js <service-name>')
  console.log('Examples: health, auth, media, user')
  process.exit(1)
}

const lambdaDir = path.join(__dirname, '..', 'lambdas', service)
const distDir = path.join(__dirname, '..', 'dist', 'lambdas', service)
const bundleDir = path.join(__dirname, '..', 'bundles', service)

// Verify service exists
if (!fs.existsSync(lambdaDir)) {
  console.error(`❌ Error: Lambda service '${service}' not found at ${lambdaDir}`)
  process.exit(1)
}

// Create bundle directory
if (!fs.existsSync(bundleDir)) {
  fs.mkdirSync(bundleDir, { recursive: true })
}

// Get all handler files (e.g., index.ts, login.ts, upload.ts)
const tsFiles = fs
  .readdirSync(lambdaDir)
  .filter((file) => file.endsWith('.ts') && !file.endsWith('.test.ts'))

console.log(`📦 Bundling ${service} Lambda functions...`)
console.log(`   Found handlers: ${tsFiles.map((f) => f.replace('.ts', '')).join(', ')}`)

tsFiles.forEach((file) => {
  const handlerName = file.replace('.ts', '')
  const jsFile = file.replace('.ts', '.js')
  const srcJs = path.join(distDir, jsFile)
  const bundleFile = path.join(bundleDir, `${handlerName}-lambda.js`)

  if (!fs.existsSync(srcJs)) {
    console.warn(`   ⚠️  ${handlerName}: No compiled file found, skipping`)
    return
  }

  // Copy compiled handler to bundle
  fs.copyFileSync(srcJs, bundleFile)
  const size = (fs.statSync(bundleFile).size / 1024).toFixed(2)
  console.log(`   ✓ ${handlerName}: ${bundleFile} (${size} KB)`)
})

console.log(`\n✅ Bundled ${service} Lambda functions`)
console.log(`   Output: ${bundleDir}`)
console.log(`   Ready for: AWS CloudFormation, SAM, or CDK deployment`)
