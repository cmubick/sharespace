import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/UploadPage.css'

interface UploadFormData {
  file: File | null
  uploaderName: string
  caption: string
  year: number | ''
}

interface PresignedUrlResponse {
  mediaId: string
  s3Key: string
  presignedUrl: string
  expiresIn: number
  uploadSizeLimit: number
}

const UploadPage = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState<UploadFormData>({
    file: null,
    uploaderName: '',
    caption: '',
    year: '',
  })
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')

  const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'application/pdf']

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleFileSelect = (file: File) => {
    setError('')

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError(`Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}`)
      return
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError(`File too large. Maximum: ${MAX_FILE_SIZE / 1024 / 1024}MB`)
      return
    }

    setFormData(prev => ({ ...prev, file }))
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'year' ? (value ? parseInt(value) : '') : value,
    }))
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const requestPresignedUrl = async (): Promise<PresignedUrlResponse> => {
    const response = await fetch('/api/media/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filename: formData.file!.name,
        fileType: formData.file!.type,
        uploaderName: formData.uploaderName,
        ...(formData.caption && { caption: formData.caption }),
        ...(formData.year && { year: formData.year }),
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to get presigned URL')
    }

    return response.json()
  }

  const uploadToS3 = async (presignedUrl: string, file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()

      xhr.upload.addEventListener('progress', (e: ProgressEvent) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100
          setProgress(percentComplete)
        }
      })

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve()
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`))
        }
      })

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'))
      })

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload cancelled'))
      })

      xhr.open('PUT', presignedUrl, true)
      xhr.setRequestHeader('Content-Type', formData.file!.type)
      xhr.send(file)
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setProgress(0)

    // Validation
    if (!formData.file) {
      setError('Please select a file')
      return
    }

    if (!formData.uploaderName.trim()) {
      setError('Please enter your name')
      return
    }

    if (formData.year && (formData.year < 1900 || formData.year > 2100)) {
      setError('Year must be between 1900 and 2100')
      return
    }

    setUploading(true)

    try {
      // Step 1: Request presigned URL
      console.log('Requesting presigned URL...')
      const urlResponse = await requestPresignedUrl()

      // Step 2: Upload to S3
      console.log('Uploading to S3...')
      await uploadToS3(urlResponse.presignedUrl, formData.file)

      console.log('Upload complete, redirecting...')
      // Step 3: Redirect to gallery
      setTimeout(() => {
        navigate('/gallery', { state: { uploadedMediaId: urlResponse.mediaId } })
      }, 500)
    } catch (err) {
      console.error('Upload error:', err)
      setError(err instanceof Error ? err.message : 'Upload failed')
      setUploading(false)
      setProgress(0)
    }
  }

  return (
    <div className="upload-page">
      <div className="upload-container">
        <h1>Upload Media</h1>

        {/* Error Message */}
        {error && (
          <div className="error-message active">
            {error}
          </div>
        )}

        {/* Drop Zone */}
        <div
          className={`drop-zone ${isDragging ? 'dragging' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="drop-zone-content">
            <div className="drop-icon">
              {formData.file ? '✓' : '↑'}
            </div>
            <div className="drop-text">
              {formData.file ? (
                <>
                  <strong>{formData.file.name}</strong>
                  <div className="file-size">
                    {(formData.file.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                </>
              ) : (
                <>
                  <strong>Drop your file here</strong> or click to browse
                </>
              )}
            </div>
            {!formData.file && (
              <div className="drop-hint">JPG, PNG, GIF, WebP, MP4, PDF up to 25MB</div>
            )}
          </div>
          <input
            type="file"
            className="file-input"
            onChange={handleFileInputChange}
            accept={ALLOWED_TYPES.join(',')}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          />
        </div>

        {/* File Buttons */}
        {formData.file && (
          <div className="file-buttons">
            <label className="btn btn-secondary">
              Change file
              <input
                type="file"
                className="file-input"
                onChange={handleFileInputChange}
                accept={ALLOWED_TYPES.join(',')}
              />
            </label>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className={`upload-form ${uploading ? 'uploading' : ''}`}>
          <div className="form-group">
            <label htmlFor="uploaderName">
              Your Name <span className="required">*</span>
            </label>
            <input
              id="uploaderName"
              type="text"
              name="uploaderName"
              value={formData.uploaderName}
              onChange={handleInputChange}
              placeholder="Your name"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="caption">Caption</label>
            <textarea
              id="caption"
              name="caption"
              value={formData.caption}
              onChange={handleInputChange}
              placeholder="Add a caption (optional)"
            />
            <div className="form-hint">Optional - describe your media</div>
          </div>

          <div className="form-group">
            <label htmlFor="year">Year</label>
            <input
              id="year"
              type="number"
              name="year"
              value={formData.year}
              onChange={handleInputChange}
              placeholder="2024"
              min="1900"
              max="2100"
            />
            <div className="form-hint year-range">Between 1900 and 2100</div>
          </div>

          {/* Progress Bar */}
          <div className={`progress-container ${uploading && progress > 0 ? 'active' : ''}`}>
            <div className="progress-label">
              <span>Uploading</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="progress-bar-wrapper">
              <div className="progress-bar" style={{ width: `${progress}%` }}></div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn-primary"
            disabled={!formData.file || !formData.uploaderName.trim() || uploading}
          >
            {uploading ? `Uploading... ${Math.round(progress)}%` : 'Upload Media'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default UploadPage
