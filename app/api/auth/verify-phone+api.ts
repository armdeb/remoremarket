import { ExpoRequest, ExpoResponse } from 'expo-router/server';

// This should match the storage used in send-sms-verification
const verificationCodes = new Map<string, { code: string; expires: number }>();

export async function POST(request: ExpoRequest): Promise<ExpoResponse> {
  try {
    const { phoneNumber, code } = await request.json();

    if (!phoneNumber || !code) {
      return new Response(JSON.stringify({ error: 'Phone number and code are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const storedData = verificationCodes.get(phoneNumber);

    if (!storedData) {
      return new Response(JSON.stringify({ error: 'No verification code found for this phone number' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (Date.now() > storedData.expires) {
      verificationCodes.delete(phoneNumber);
      return new Response(JSON.stringify({ error: 'Verification code has expired' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (storedData.code !== code) {
      return new Response(JSON.stringify({ error: 'Invalid verification code' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Code is valid, remove it from storage
    verificationCodes.delete(phoneNumber);

    return new Response(JSON.stringify({ 
      verified: true,
      message: 'Phone number verified successfully',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Phone verification error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to verify phone number',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}