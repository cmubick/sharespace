import { useRef, useState } from 'react'
import { getApiUrl } from '../services/api'
import { getUserId } from '../services/auth'
import '../styles/UploadPage.css'

interface UploadFormData {
  uploaderName: string
  caption: string
  year: number | ''
}

interface UploadItem {
  id: string
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'done' | 'error'
  error?: string
}

interface PresignedUrlResponse {
  mediaId: string
  s3Key: string
  presignedUrl: string
  expiresIn: number
  uploadSizeLimit: number
}

const UploadPage = () => {
  const [formData, setFormData] = useState<UploadFormData>({
    uploaderName: '',
    caption: '',
    year: '',
  })
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [lastUploadCount, setLastUploadCount] = useState(0)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const successTimeoutRef = useRef<number | null>(null)

  const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB
  const ALLOWED_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'audio/mpeg',
    'audio/mp4',
    'audio/wav',
  ]

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
      handleFilesSelect(Array.from(files))
    }
  }

  const buildItemId = (file: File) => `${file.name}-${file.size}-${file.lastModified}`

  const handleFilesSelect = (files: File[]) => {
    setError('')
    setSuccessMessage('')
    setLastUploadCount(0)

    const nextItems: UploadItem[] = []
    const errors: string[] = []

    files.forEach((file) => {
      const itemId = buildItemId(file)

      if (!ALLOWED_TYPES.includes(file.type)) {
        errors.push(`${file.name}: invalid file type`)
        return
      }

      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: file too large`)
        return
      }

      nextItems.push({
        id: itemId,
        file,
        progress: 0,
        status: 'pending',
      })
    })

    if (errors.length > 0) {
      setError(`Some files were skipped: ${errors.join(', ')}`)
    }

    if (nextItems.length === 0) return

    setUploadItems((prev) => {
      const existingIds = new Set(prev.map((item) => item.id))
      const uniqueItems = nextItems.filter((item) => !existingIds.has(item.id))
      return [...prev, ...uniqueItems]
    })
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'year' ? (value ? parseInt(value) : '') : value,
    }))
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFilesSelect(Array.from(files))
    }
    e.target.value = ''
  }

  const handleDropZoneClick = () => {
    fileInputRef.current?.click()
  }

  const requestPresignedUrl = async (file: File): Promise<PresignedUrlResponse> => {
    const response = await fetch(getApiUrl('/media'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filename: file.name,
        fileType: file.type,
        fileSize: file.size,
        uploaderName: formData.uploaderName,
        userId: getUserId(),
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

  const uploadToS3 = async (
    presignedUrl: string,
    file: File,
    onProgress: (progressValue: number) => void
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()

      xhr.upload.addEventListener('progress', (e: ProgressEvent) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100
          onProgress(percentComplete)
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
      xhr.setRequestHeader('Content-Type', file.type)
      xhr.send(file)
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')
    setLastUploadCount(0)

    // Validation
    if (uploadItems.length === 0) {
      setError('Please select at least one file')
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

    let completedCount = 0
    let errorCount = 0

    for (const item of uploadItems) {
      if (item.status === 'done') continue

      setUploadItems((prev) =>
        prev.map((current) =>
          current.id === item.id
            ? { ...current, status: 'uploading', progress: 0, error: undefined }
            : current
        )
      )

      try {
        const urlResponse = await requestPresignedUrl(item.file)
        await uploadToS3(urlResponse.presignedUrl, item.file, (progressValue) => {
          setUploadItems((prev) =>
            prev.map((current) =>
              current.id === item.id
                ? { ...current, progress: progressValue }
                : current
            )
          )
        })
        completedCount += 1
        setUploadItems((prev) =>
          prev.map((current) =>
            current.id === item.id
              ? { ...current, status: 'done', progress: 100 }
              : current
          )
        )
      } catch (err) {
        errorCount += 1
        const message = err instanceof Error ? err.message : 'Upload failed'
        setUploadItems((prev) =>
          prev.map((current) =>
            current.id === item.id
              ? { ...current, status: 'error', error: message }
              : current
          )
        )
      }
    }

    setUploading(false)

    if (completedCount > 0 && errorCount === 0) {
      setLastUploadCount(completedCount)
      setSuccessMessage(`Uploaded ${completedCount} file${completedCount === 1 ? '' : 's'} successfully.`)
      setUploadItems([])
      setFormData((prev) => ({
        ...prev,
        caption: '',
        year: '',
      }))
      if (successTimeoutRef.current) {
        window.clearTimeout(successTimeoutRef.current)
      }
      successTimeoutRef.current = window.setTimeout(() => {
        setSuccessMessage('')
      }, 3000)
    } else if (completedCount > 0 && errorCount > 0) {
      setSuccessMessage(`Uploaded ${completedCount} file${completedCount === 1 ? '' : 's'} with ${errorCount} error${errorCount === 1 ? '' : 's'}.`)
    } else if (errorCount > 0) {
      setError('Some uploads failed. Please review and try again.')
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

        {successMessage && (
          <div className="success-message active">
            {successMessage}
          </div>
        )}

        {/* Drop Zone */}
        <div
          className={`drop-zone ${isDragging ? 'dragging' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleDropZoneClick}
        >
          <div className="drop-zone-content">
            <div className="drop-icon">
              {uploadItems.length > 0 ? '✓' : '↑'}
            </div>
            <div className="drop-text">
              {uploadItems.length > 0 ? (
                <>
                  <strong>{uploadItems.length} file{uploadItems.length === 1 ? '' : 's'} selected</strong>
                  <div className="file-size">
                    Total size: {(uploadItems.reduce((sum, item) => sum + item.file.size, 0) / 1024 / 1024).toFixed(2)} MB
                  </div>
                </>
              ) : (
                <>
                  <strong>Drop your files here</strong> or click to browse
                </>
              )}
            </div>
            {uploadItems.length === 0 && (
              <div className="drop-hint">JPG, PNG, GIF, WebP, MP4, MP3, M4A, WAV up to 25MB</div>
            )}
          </div>
          <input
            type="file"
            className="file-input"
            onChange={handleFileInputChange}
            accept={ALLOWED_TYPES.join(',')}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            multiple
            ref={fileInputRef}
          />
        </div>

        {/* File Buttons */}
        {uploadItems.length > 0 && (
          <div className="file-buttons">
            <label className="btn btn-secondary">
              Add more files
              <input
                type="file"
                className="file-input"
                onChange={handleFileInputChange}
                accept={ALLOWED_TYPES.join(',')}
                multiple
              />
            </label>
          </div>
        )}

        {uploadItems.length > 0 && (
          <div className="upload-list">
            {uploadItems.map((item) => (
              <div key={item.id} className={`upload-item ${item.status}`}>
                <div className="upload-item-header">
                  <span className="upload-item-name">{item.file.name}</span>
                  <span className="upload-item-status">
                    {item.status === 'uploading' && `${Math.round(item.progress)}%`}
                    {item.status === 'done' && 'Done'}
                    {item.status === 'error' && 'Error'}
                    {item.status === 'pending' && 'Queued'}
                  </span>
                </div>
                <div className="progress-bar-wrapper">
                  <div className="progress-bar" style={{ width: `${item.progress}%` }}></div>
                </div>
                {item.error && <div className="upload-item-error">{item.error}</div>}
              </div>
            ))}
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
          <div className={`progress-container ${uploading ? 'active' : ''}`}>
            <div className="progress-label">
              <span>Uploading</span>
              <span>{uploadItems.filter((item) => item.status === 'done').length}/{uploadItems.length}</span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn-primary"
            disabled={uploadItems.length === 0 || !formData.uploaderName.trim() || uploading}
          >
            {uploading ? 'Uploading...' : 'Upload Media'}
          </button>
        </form>

        {lastUploadCount > 0 && !uploading && uploadItems.length === 0 && (
          <button
            type="button"
            className="btn-primary upload-more"
            onClick={() => fileInputRef.current?.click()}
          >
            Upload More Photos
          </button>
        )}
      </div>
    </div>
  )
}

export default UploadPage
