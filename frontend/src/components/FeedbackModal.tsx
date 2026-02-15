import { useState } from 'react'
import { getApiUrl } from '../services/api'
import '../styles/FeedbackModal.css'

interface FeedbackModalProps {
  isOpen: boolean
  onClose: () => void
}

const FeedbackModal = ({ isOpen, onClose }: FeedbackModalProps) => {
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!message.trim()) {
      setErrorMessage('Please enter a message')
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const response = await fetch(getApiUrl('/feedback'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message.trim(),
          email: email.trim() || undefined,
          pageUrl: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit feedback')
      }

      setSubmitStatus('success')
      setMessage('')
      setEmail('')

      setTimeout(() => {
        onClose()
        setSubmitStatus('idle')
      }, 2000)
    } catch (err) {
      console.error('Feedback submission error:', err)
      setSubmitStatus('error')
      setErrorMessage('Failed to submit feedback. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="feedback-modal-overlay" onClick={onClose}>
      <div className="feedback-modal" onClick={(e) => e.stopPropagation()}>
        <div className="feedback-modal-header">
          <h2>Send Feedback</h2>
          <button
            className="feedback-modal-close"
            onClick={onClose}
            aria-label="Close feedback modal"
          >
            ✕
          </button>
        </div>

        {submitStatus === 'success' ? (
          <div className="feedback-success">
            <p>Thank you! Your feedback has been sent.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="feedback-form">
            <div className="form-group">
              <label htmlFor="feedback-message">Message *</label>
              <textarea
                id="feedback-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Please share your feedback, bug report, or feature request..."
                rows={6}
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="feedback-email">Email (optional)</label>
              <input
                id="feedback-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                disabled={isSubmitting}
              />
            </div>

            {errorMessage && (
              <div className="feedback-error">
                <p>{errorMessage}</p>
              </div>
            )}

            <div className="feedback-actions">
              <button
                type="submit"
                className="feedback-submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Sending...' : 'Send Feedback'}
              </button>
              <button
                type="button"
                className="feedback-cancel"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default FeedbackModal
