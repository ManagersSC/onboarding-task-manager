import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { unsealData } from 'iron-session'

// POST - Send email via Make.com webhook
export async function POST(request) {
  try {
    // Verify admin authentication
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("session")?.value
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let session
    try {
      session = await unsealData(sessionCookie, {
        password: process.env.SESSION_SECRET,
        ttl: 60 * 60 * 8,
      })
    } catch {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }

    if (session.userRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { recipients, email } = await request.json()

    // Validation
    if (!recipients?.length || !email?.subject || !email?.body) {
      return NextResponse.json(
        { error: 'Recipients, subject, and body are required' },
        { status: 400 }
      )
    }

    // Validate email addresses
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const invalidEmails = recipients.filter(recipient => !emailRegex.test(recipient.email))
    
    if (invalidEmails.length > 0) {
      return NextResponse.json(
        { 
          error: 'Invalid email addresses',
          invalidEmails: invalidEmails.map(r => r.email)
        },
        { status: 400 }
      )
    }

    // Prepare webhook payload
    const webhookPayload = {
      recipients,
      email: {
        subject: email.subject,
        body: email.body,
        bodyPlain: email.body.replace(/<[^>]*>/g, '') // Strip HTML for plain text
      }
    }

    // Call Make.com webhook
    const response = await fetch(process.env.MAKE_WEBHOOK_URL_CUSTOM_EMAIL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload),
      timeout: 30000 // 30 second timeout
    })

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status}`)
    }

    // Handle both JSON and text responses from Make.com
    let result
    const contentType = response.headers.get('content-type')
    
    try {
      if (contentType && contentType.includes('application/json')) {
        result = await response.json()
      } else {
        // Handle text response (like "Accepted")
        const textResponse = await response.text()
        result = { 
          message: textResponse, 
          success: textResponse.toLowerCase().includes('accept') || textResponse.toLowerCase().includes('success') 
        }
      }
    } catch (parseError) {
      // If JSON parsing fails, treat as text response
      const textResponse = await response.text()
      result = { 
        message: textResponse, 
        success: textResponse.toLowerCase().includes('accept') || textResponse.toLowerCase().includes('success') 
      }
    }

    console.log('Make.com webhook response:', result)

    // Handle webhook response
    if (result.success || result.message?.toLowerCase().includes('accept')) {
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        message: 'Email sent successfully',
        webhookResponse: result
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || result.message || 'Failed to send email',
        webhookResponse: result
      }, { status: 400 })
    }

  } catch (error) {
    console.error('Error sending email:', error)
    
    if (error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Email service timeout' },
        { status: 408 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    )
  }
} 