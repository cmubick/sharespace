#!/usr/bin/env python3
"""
Update CloudFront distribution with ACM certificate and custom domain aliases.
"""

import json
import subprocess
import sys
import os

# Configuration
CERT_ARN = os.environ.get('ACM_CERTIFICATE_ARN')
DISTRIBUTION_COMMENT = 'sharespace frontend distribution'
DOMAIN_NAMES = ['itsonlycastlesburning.com', '*.itsonlycastlesburning.com']

if not CERT_ARN:
    print("❌ Error: ACM_CERTIFICATE_ARN environment variable not set")
    sys.exit(1)

print(f"🔧 Updating CloudFront distribution with certificate...")
print(f"   Certificate ARN: {CERT_ARN}")
print(f"   Domain names: {', '.join(DOMAIN_NAMES)}")

# Get distribution ID
try:
    result = subprocess.run(
        ['aws', 'cloudfront', 'list-distributions', '--output', 'json'],
        capture_output=True,
        text=True,
        check=True
    )
    distributions = json.loads(result.stdout)
    
    dist_id = None
    for dist in distributions['DistributionList']['Items']:
        if dist['Comment'] == DISTRIBUTION_COMMENT:
            dist_id = dist['Id']
            break
    
    if not dist_id:
        print(f"❌ Error: Could not find distribution with comment '{DISTRIBUTION_COMMENT}'")
        sys.exit(1)
    
    print(f"✅ Found distribution ID: {dist_id}")
except Exception as e:
    print(f"❌ Error listing distributions: {e}")
    sys.exit(1)

# Get current distribution config
try:
    result = subprocess.run(
        ['aws', 'cloudfront', 'get-distribution-config', '--id', dist_id, '--output', 'json'],
        capture_output=True,
        text=True,
        check=True
    )
    dist_response = json.loads(result.stdout)
    config = dist_response['DistributionConfig']
    etag = dist_response['ETag']
    
    print(f"✅ Retrieved current distribution config (ETag: {etag})")
except Exception as e:
    print(f"❌ Error getting distribution config: {e}")
    sys.exit(1)

# Update ViewerCertificate
config['ViewerCertificate'] = {
    'ACMCertificateArn': CERT_ARN,
    'SSLSupportMethod': 'sni-only',
    'MinimumProtocolVersion': 'TLSv1.2_2021',
    'CertificateSource': 'acm'
}

# Update Aliases
config['Aliases'] = {
    'Quantity': len(DOMAIN_NAMES),
    'Items': DOMAIN_NAMES
}

print("✅ Updated configuration:")
print(f"   ViewerCertificate: ACM with SNI-only")
print(f"   Aliases: {DOMAIN_NAMES}")

# Write updated config to temp file
with open('/tmp/dist-config-updated.json', 'w') as f:
    json.dump(config, f)

# Update distribution
try:
    print("\n🚀 Updating CloudFront distribution...")
    result = subprocess.run(
        ['aws', 'cloudfront', 'update-distribution',
         '--id', dist_id,
         '--distribution-config', 'file:///tmp/dist-config-updated.json',
         '--if-match', etag,
         '--output', 'json'],
        capture_output=True,
        text=True,
        check=True
    )
    updated = json.loads(result.stdout)
    
    print("✅ Distribution updated successfully!")
    print(f"\n📊 Distribution details:")
    print(f"   ID: {updated['Distribution']['Id']}")
    print(f"   Domain: {updated['Distribution']['DomainName']}")
    print(f"   Aliases: {updated['Distribution']['DistributionConfig']['Aliases']['Items']}")
    print(f"   Certificate: {updated['Distribution']['DistributionConfig']['ViewerCertificate']['ACMCertificateArn'].split('/')[-1]}")
    print(f"\n⏳ Status: {updated['Distribution']['Status']}")
    print("\n📝 Next steps:")
    print(f"   1. Add CNAME records in your DNS provider:")
    for domain in DOMAIN_NAMES:
        print(f"      {domain} → {updated['Distribution']['DomainName']}")
    print(f"   2. Wait for DNS propagation (5-15 minutes)")
    print(f"   3. Distribution will complete deployment (may take 10-15 minutes)")
    
except subprocess.CalledProcessError as e:
    print(f"❌ Error updating distribution: {e.stderr}")
    sys.exit(1)
except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)
