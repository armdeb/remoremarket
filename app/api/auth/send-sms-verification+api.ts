import { ExpoRequest, ExpoResponse } from 'expo-router/server';
import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Store verification codes temporarily (in production, use Redis or database)
const verificationCodes = new Map<string, { code: string; expires: number }>();

export async function POST(request: ExpoRequest): Promise<ExpoResponse> {
  try {
    const { phoneNumber } = await request.json();

    if (!phoneNumber) {
      return new Response(JSON.stringify({ error: 'Phone number is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store code with 10-minute expiration
    verificationCodes.set(phoneNumber, {
      code: verificationCode,
      expires: Date.now() + 10 * 60 * 1000, // 10 minutes
    });

    // Send SMS via Twilio
    await client.messages.create({
      body: `Your Remore verification code is: ${verificationCode}. This code expires in 10 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    });

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Verification code sent successfully',
      // Don't return the actual code in production
      verificationCode: process.env.NODE_ENV === 'development' ? verificationCode : undefined,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('SMS verification error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to send verification SMS',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}