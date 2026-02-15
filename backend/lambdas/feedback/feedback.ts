import {
  SESClient,
  SendEmailCommand,
  SendEmailCommandInput,
} from '@aws-sdk/client-ses'

const ses = new SESClient({ region: process.env.AWS_REGION || 'us-east-1' })

interface FeedbackPayload {
  message: string
  email?: string
  pageUrl?: string
  userAgent?: string
  timestamp?: string
}

export const handler = async (event: any) => {
  console.log('Feedback request received:', { body: event.body })

  try {
    if (!event.body) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Request body is required' }),
      }
    }

    const payload: FeedbackPayload = JSON.parse(event.body)

    // Validate required fields
    if (!payload.message || payload.message.trim().length === 0) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Message is required' }),
      }
    }

    const recipientEmail = process.env.FEEDBACK_EMAIL || 'chrisubick@gmail.com'
    const senderEmail = process.env.SES_SENDER_EMAIL || 'noreply@itsonlycastlesburning.com'

    // Format the email body
    const emailBody = formatEmailBody(payload)

    const params: SendEmailCommandInput = {
      Source: senderEmail,
      Destination: {
        ToAddresses: [recipientEmail],
      },
      Message: {
        Subject: {
          Data: 'New JDF Memorial Site Feedback',
          Charset: 'UTF-8',
        },
        Body: {
          Text: {
            Data: emailBody,
            Charset: 'UTF-8',
          },
        },
      },
    }

    await ses.send(new SendEmailCommand(params))

    console.log('Feedback email sent successfully')

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message: 'Feedback submitted successfully',
        timestamp: new Date().toISOString(),
      }),
    }
  } catch (err) {
    console.error('Error processing feedback:', err)

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Failed to submit feedback',
      }),
    }
  }
}

function formatEmailBody(payload: FeedbackPayload): string {
  const timestamp = payload.timestamp || new Date().toISOString()
  const userEmail = payload.email ? `From: ${payload.email}` : 'From: Anonymous'

  return `
JDF Memorial Site Feedback Submission

${userEmail}
Submitted: ${timestamp}

---

${payload.message}

---

User Agent: ${payload.userAgent || 'Unknown'}
Page URL: ${payload.pageUrl || 'Unknown'}
  `.trim()
}
