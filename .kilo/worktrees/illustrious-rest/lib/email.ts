import { Resend } from 'resend'

let resendClient: Resend | null = null

function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    return null
  }
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY)
  }
  return resendClient
}

export async function sendOrderConfirmationEmail(data: {
  order_number: string
  customer_name: string
  customer_email: string
  customer_phone: string
  total_amount: number
}): Promise<{ success: boolean; error?: string }> {
  const resend = getResendClient()
  if (!resend) {
    console.warn('RESEND_API_KEY not configured, skipping email')
    return { success: false, error: 'Email service not configured' }
  }

  try {
    const { error } = await resend.emails.send({
      from: 'Eskort Orders <orders@eskort.co.za>',
      to: ['orders@eskort.co.za'],
      subject: `New Eskort Order - ${data.order_number}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #d52027;">New Order Received</h2>
          <hr style="border: 1px solid #e0e0e0;">
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px; font-weight: bold;">Order Number:</td>
              <td style="padding: 10px;">${data.order_number}</td>
            </tr>
            <tr style="background: #f5f5f5;">
              <td style="padding: 10px; font-weight: bold;">Customer Name:</td>
              <td style="padding: 10px;">${data.customer_name}</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-weight: bold;">Customer Email:</td>
              <td style="padding: 10px;">${data.customer_email}</td>
            </tr>
            <tr style="background: #f5f5f5;">
              <td style="padding: 10px; font-weight: bold;">Customer Phone:</td>
              <td style="padding: 10px;">${data.customer_phone}</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-weight: bold;">Order Value:</td>
              <td style="padding: 10px; color: #d52027; font-weight: bold;">R${data.total_amount.toFixed(2)}</td>
            </tr>
          </table>
          
          <hr style="border: 1px solid #e0e0e0; margin-top: 20px;">
          <p style="color: #666; font-size: 14px;">This is an automated notification from the Eskort Online Store.</p>
        </div>
      `,
    })

    if (error) {
      console.error('Email send error:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Email exception:', error)
    return { success: false, error: 'Failed to send email' }
  }
}