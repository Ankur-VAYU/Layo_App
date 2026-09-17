/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hlqeddasjkxweiqadege.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhscWVkZGFzamt4d2VpcWFkZWdlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Nzk1NzIxMSwiZXhwIjoyMDkzNTMzMjExfQ.tkISs8jGp7s-oy9xGKfgF8Z4FNYBwO7pBmlQxpJmFII';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export async function POST(request: NextRequest) {
  try {
    const { name, contact, message } = await request.json();

    if (!name || !contact) {
      return NextResponse.json({ error: 'Name and contact info are required' }, { status: 400 });
    }

    const trimmedName = String(name).trim();
    const trimmedContact = String(contact).trim();
    const trimmedMessage = message ? String(message).trim() : 'No message provided';

    // 1. Insert into contact_submissions in database
    const { data: insertedData, error: dbError } = await supabaseAdmin
      .from('contact_submissions')
      .insert([
        {
          name: trimmedName,
          contact: trimmedContact,
          message: trimmedMessage,
        }
      ])
      .select();

    if (dbError) {
      console.error('Database insert error in /api/contact:', dbError);
    }

    // 2. Send instant email alert to layohq@gmail.com via Resend
    const resendApiKey = process.env.RESEND_API_KEY;
    let emailSent = false;
    let emailError: string | null = null;

    if (resendApiKey) {
      try {
        const isEmail = trimmedContact.includes('@');
        const isPhone = !isEmail && /\d/.test(trimmedContact);
        const cleanPhone = isPhone ? trimmedContact.replace(/[^\d+]/g, '') : '';
        const nowFormatted = new Date().toLocaleString('en-US', {
          timeZone: 'America/Toronto',
          dateStyle: 'medium',
          timeStyle: 'short',
        });

        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New Layo Inquiry</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FAF8EE; color: #0E1F38;">
  <div style="max-width: 600px; margin: 30px auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2ded0; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
    
    <!-- Header -->
    <div style="background-color: #0E1F38; padding: 24px 32px; text-align: left;">
      <h1 style="color: #ffffff; font-size: 20px; margin: 0; font-weight: 800; letter-spacing: -0.5px;">
        LAYO <span style="color: #FF5A65;">•</span> New Customer Inquiry
      </h1>
      <p style="color: #a0aec0; font-size: 12px; margin: 4px 0 0 0;">
        Received from Website Contact Form • ${nowFormatted} EST
      </p>
    </div>

    <!-- Main Content -->
    <div style="padding: 32px;">
      
      <!-- Lead Summary Card -->
      <div style="background-color: #FAF8EE; border: 1px solid #e8e3d3; border-radius: 14px; padding: 20px; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; width: 120px; font-size: 11px; text-transform: uppercase; font-weight: bold; color: #718096;">Customer:</td>
            <td style="padding: 6px 0; font-size: 15px; font-weight: bold; color: #0E1F38;">${trimmedName}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-size: 11px; text-transform: uppercase; font-weight: bold; color: #718096;">Contact Info:</td>
            <td style="padding: 6px 0; font-size: 15px; font-weight: bold; color: #FF5A65;">
              ${isEmail ? `<a href="mailto:${trimmedContact}" style="color: #FF5A65; text-decoration: none;">${trimmedContact}</a>` : trimmedContact}
            </td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-size: 11px; text-transform: uppercase; font-weight: bold; color: #718096;">Channel:</td>
            <td style="padding: 6px 0; font-size: 12px; font-weight: 600; color: #4a5568;">
              Website "Get In Touch With Us Here" Form
            </td>
          </tr>
        </table>
      </div>

      <!-- Message Card -->
      <div style="margin-bottom: 28px;">
        <h3 style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: bold; color: #718096; margin-bottom: 8px;">
          Message Content:
        </h3>
        <div style="background-color: #f7fafc; border-left: 4px solid #FF5A65; padding: 16px; border-radius: 8px; font-size: 14px; line-height: 1.6; color: #2d3748; white-space: pre-wrap;">${trimmedMessage}</div>
      </div>

      <!-- Quick Action Buttons -->
      <div style="border-top: 1px solid #edf2f7; padding-top: 24px; text-align: center;">
        <p style="font-size: 11px; text-transform: uppercase; font-weight: bold; color: #a0aec0; margin-bottom: 12px;">
          Direct Actions
        </p>
        <div style="display: inline-block;">
          ${isEmail ? `
            <a href="mailto:${trimmedContact}?subject=Re: Your Inquiry with Layo" 
               style="display: inline-block; background-color: #FF5A65; color: #ffffff; padding: 10px 20px; border-radius: 10px; font-size: 12px; font-weight: bold; text-decoration: none; text-transform: uppercase; margin: 4px 6px;">
              ✉️ Reply via Email
            </a>
          ` : ''}
          ${cleanPhone ? `
            <a href="tel:${cleanPhone}" 
               style="display: inline-block; background-color: #0E1F38; color: #ffffff; padding: 10px 20px; border-radius: 10px; font-size: 12px; font-weight: bold; text-decoration: none; text-transform: uppercase; margin: 4px 6px;">
              📞 Call Customer
            </a>
            <a href="https://wa.me/${cleanPhone.replace('+', '')}?text=Hi%20${encodeURIComponent(trimmedName)},%20thank%20you%20for%20reaching%20out%20to%20Layo!" 
               style="display: inline-block; background-color: #25D366; color: #ffffff; padding: 10px 20px; border-radius: 10px; font-size: 12px; font-weight: bold; text-decoration: none; text-transform: uppercase; margin: 4px 6px;">
              💬 WhatsApp
            </a>
          ` : ''}
          <a href="https://www.getlayo.com/admin" 
             style="display: inline-block; background-color: #f7fafc; color: #0E1F38; border: 1px solid #cbd5e0; padding: 10px 20px; border-radius: 10px; font-size: 12px; font-weight: bold; text-decoration: none; text-transform: uppercase; margin: 4px 6px;">
            Open Admin Portal
          </a>
        </div>
      </div>

    </div>

    <!-- Footer -->
    <div style="background-color: #FAF8EE; padding: 16px 32px; border-top: 1px solid #e8e3d3; text-align: center;">
      <p style="margin: 0; font-size: 11px; color: #a0aec0;">
        Layo Delivery Technologies Inc. · Auto-Forwarded to <strong>layohq@gmail.com</strong>
      </p>
    </div>

  </div>
</body>
</html>
        `;

        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Layo Inquiries <notifications@getlayo.com>',
            to: ['layohq@gmail.com'],
            reply_to: isEmail ? trimmedContact : undefined,
            subject: `🔔 New Contact Inquiry: ${trimmedName} (${trimmedContact})`,
            html: emailHtml,
          }),
        });

        const resendJson = await resendResponse.json();
        if (!resendResponse.ok) {
          emailError = resendJson.message || 'Resend error';
          console.error('Failed to send inquiry email via Resend:', resendJson);
        } else {
          emailSent = true;
        }
      } catch (mailErr: any) {
        emailError = mailErr.message || String(mailErr);
        console.error('Exception sending inquiry email:', mailErr);
      }
    } else {
      console.warn('RESEND_API_KEY not configured. Email not sent.');
    }

    return NextResponse.json({
      success: true,
      data: insertedData ? insertedData[0] : null,
      emailSent,
      emailError,
    });
  } catch (err: any) {
    console.error('Error in /api/contact:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
