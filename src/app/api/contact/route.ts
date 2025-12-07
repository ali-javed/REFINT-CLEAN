import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { name, email, message } = await request.json();

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Log the contact form submission
    console.log('[contact] New submission:');
    console.log(`From: ${name} (${email})`);
    console.log(`Message: ${message}`);

    // Try Resend API if configured
    const resendKey = process.env.RESEND_API_KEY;
    
    if (resendKey) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'ReferenceAudit <onboarding@resend.dev>',
            to: ['alijaved@live.com'],
            reply_to: email,
            subject: `Contact Form: ${name}`,
            html: `
              <h2>New Contact Form Submission</h2>
              <p><strong>From:</strong> ${name} (${email})</p>
              <p><strong>Message:</strong></p>
              <p>${message.replace(/\n/g, '<br>')}</p>
            `,
          }),
        });

        if (response.ok) {
          console.log('[contact] Email sent via Resend');
          return NextResponse.json({ success: true });
        } else {
          const errorData = await response.json();
          console.error('[contact] Resend API error:', errorData);
        }
      } catch (err) {
        console.error('[contact] Resend error:', err);
      }
    }

    // Fallback: Just log the message (email will appear in server logs)
    console.log('[contact] Message logged (email service not configured)');
    return NextResponse.json({ 
      success: true,
      message: 'Thank you for your message. We have received it and will respond via email soon.' 
    });

  } catch (err) {
    console.error('[contact] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
