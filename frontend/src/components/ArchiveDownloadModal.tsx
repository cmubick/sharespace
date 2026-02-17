import { useEffect, useRef, useState } from 'react'
import { getApiUrl } from '../services/api'

interface ArchiveDownloadModalProps {
  isOpen: boolean
  onClose: () => void
}

const ArchiveDownloadModal = ({ isOpen, onClose }: ArchiveDownloadModalProps) => {
  const [status, setStatus] = useState<'idle' | 'building' | 'ready' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const pollingTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!isOpen) return

    setStatus('idle')
    setErrorMessage('')

    const startArchive = async () => {
      try {
        // Trigger archive creation
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

        if (data.status === 'ready' && data.url) {
          // Archive is ready immediately
          setStatus('ready')
          triggerDownload(data.url)
        } else if (data.status === 'building') {
          // Archive is building, start polling
          setStatus('building')
          startPolling()
        }
      } catch (err) {
        console.error('Archive request error:', err)
        setStatus('error')
        setErrorMessage('Unable to prepare the download right now. Please try again.')
      }
    }

    const checkStatus = async () => {
      try {
        const response = await fetch(getApiUrl('/media/archive/status'), {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error('Unable to check archive status')
        }

        const data = await response.json()

        if (data.status === 'ready' && data.url) {
          stopPolling()
          setStatus('ready')
          triggerDownload(data.url)
        }
      } catch (err) {
        console.error('Archive status check error:', err)
        // Don't stop polling on error, keep trying
      }
    }

    const startPolling = () => {
      if (pollingTimerRef.current) {
        window.clearInterval(pollingTimerRef.current)
      }
      pollingTimerRef.current = window.setInterval(checkStatus, 3000)
    }

    const stopPolling = () => {
      if (pollingTimerRef.current) {
        window.clearInterval(pollingTimerRef.current)
        pollingTimerRef.current = null
      }
    }

    const triggerDownload = (url: string) => {
      const link = document.createElement('a')
      link.href = url
      link.rel = 'noopener noreferrer'
      link.click()
    }

    startArchive()

    return () => {
      stopPolling()
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="archive-modal-overlay" onClick={onClose}>
      <div className="archive-modal" onClick={(e) => e.stopPropagation()}>
        <h2>
          {status === 'building' && 'Building archive...'}
          {status === 'ready' && 'Download ready!'}
          {status === 'error' && 'Error'}
          {status === 'idle' && 'Preparing...'}
        </h2>
        {status === 'building' && (
          <p>Creating archive of all photos. This may take up to 60 seconds.</p>
        )}
        {status === 'ready' && (
          <p>Your download should start automatically.</p>
        )}
        {status === 'error' && (
          <div className="archive-error">{errorMessage}</div>
        )}
        {status === 'building' && (
          <div className="archive-progress">
            <div className="archive-progress-bar archive-progress-bar-indeterminate" />
          </div>
        )}
        <button className="archive-close" type="button" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  )
}

export default ArchiveDownloadModal
