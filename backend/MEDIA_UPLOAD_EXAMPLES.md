// Example: How to use the Media Upload Lambda endpoint

// 1. Request a pre-signed URL from the Lambda endpoint
async function requestUploadUrl() {
  const response = await fetch('https://api.example.com/dev/media/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      filename: 'my-photo.jpg',
      fileType: 'image/jpeg',
      uploaderName: 'John Doe',
      caption: 'My vacation photo',
      year: 2024,
    }),
  })

  const data = await response.json()
  return data
}

// 2. Upload file directly to S3 using the presigned URL
async function uploadFileToS3(presignedUrl, file) {
  const response = await fetch(presignedUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type,
    },
    body: file,
  })

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`)
  }

  return response
}

// 3. Complete flow
async function uploadMedia(file, uploaderName, metadata = {}) {
  try {
    // Step 1: Get pre-signed URL
    console.log('Requesting upload URL...')
    const urlData = await requestUploadUrl()

    console.log('Upload URL obtained:', {
      mediaId: urlData.mediaId,
      expiresIn: urlData.expiresIn,
    })

    // Step 2: Upload file to S3
    console.log('Uploading file to S3...')
    await uploadFileToS3(urlData.presignedUrl, file)

    console.log('Upload successful:', {
      mediaId: urlData.mediaId,
      s3Key: urlData.s3Key,
    })

    return {
      success: true,
      mediaId: urlData.mediaId,
      s3Key: urlData.s3Key,
    }
  } catch (error) {
    console.error('Upload failed:', error)
    throw error
  }
}

// 4. React component example
function MediaUploadComponent() {
  const [uploading, setUploading] = (React as any).useState(false)
  const [error, setError] = (React as any).useState(null)

  const handleFileSelect = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    setUploading(true)
    setError(null)

    try {
      // Get presigned URL
      const response = await fetch('/api/media/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          fileType: file.type,
          uploaderName: 'Current User',
          caption: 'User uploaded file',
          year: new Date().getFullYear(),
        }),
      })

      const { presignedUrl, mediaId } = await response.json()

      // Upload to S3
      await fetch(presignedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      })

      console.log('File uploaded successfully, mediaId:', mediaId)
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <input
        type="file"
        onChange={handleFileSelect}
        disabled={uploading}
      />
      {uploading && <p>Uploading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  )
}

export { requestUploadUrl, uploadFileToS3, uploadMedia }
