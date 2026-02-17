import { useEffect, useRef, useState } from 'react'
import { getApiUrl } from '../services/api'

interface ArchiveDownloadModalProps {
  isOpen: boolean
  onClose: () => void
}

const ArchiveDownloadModal = ({ isOpen, onClose }: ArchiveDownloadModalProps) => {
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const progressTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!isOpen) return

    setProgress(0)
    setStatus('loading')
    setErrorMessage('')

    if (progressTimerRef.current) {
      window.clearInterval(progressTimerRef.current)
    }

    progressTimerRef.current = window.setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev
        const increment = Math.floor(Math.random() * 6) + 2
        return Math.min(prev + increment, 90)
      })
    }, 600)

    const fetchArchive = async () => {
      try {
        const response = await fetch(getApiUrl('/media/archive'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error('Unable to prepare archive')
        }

        const data = await response.json()
        const downloadUrl: string | undefined = data.downloadUrl

        if (!downloadUrl) {
          throw new Error('Download link unavailable')
        }

        setProgress(100)
        setStatus('ready')

        const link = document.createElement('a')
        link.href = downloadUrl
        link.rel = 'noopener noreferrer'
        link.click()
      } catch (err) {
        console.error('Archive download error:', err)
        setStatus('error')
        setErrorMessage('Unable to prepare the download right now. Please try again.')
      } finally {
        if (progressTimerRef.current) {
          window.clearInterval(progressTimerRef.current)
        }
      }
    }

    fetchArchive()

    return () => {
      if (progressTimerRef.current) {
        window.clearInterval(progressTimerRef.current)
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="archive-modal-overlay" onClick={onClose}>
      <div className="archive-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Preparing download...</h2>
        <p>This may take up to 30 seconds.</p>
        <div className="archive-progress">
          <div className="archive-progress-bar" style={{ width: `${progress}%` }} />
        </div>
        {status === 'error' && (
          <div className="archive-error">{errorMessage}</div>
        )}
        {status === 'ready' && (
          <div className="archive-success">Your download is ready.</div>
        )}
        <button className="archive-close" type="button" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  )
}

export default ArchiveDownloadModal
