import { ExpoRequest, ExpoResponse } from 'expo-router/server';
import { DeliveryService } from '../../../lib/delivery';

export async function POST(request: ExpoRequest): Promise<ExpoResponse> {
  try {
    const formData = await request.formData();
    const orderId = formData.get('orderId') as string;
    const timeSlot = formData.get('timeSlot') as string;
    const specialInstructions = formData.get('specialInstructions') as string;

    if (!orderId || !timeSlot) {
      return new Response(JSON.stringify({ error: 'Order ID and time slot are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await DeliveryService.schedulePickup(orderId, timeSlot, specialInstructions);

    // Return HTML response for form submission
    const successHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Pickup Scheduled - Remore</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f9f9f9; }
          .success { background: #A3E635; color: #8B5A3C; padding: 20px; border-radius: 10px; max-width: 500px; margin: 0 auto; }
        </style>
      </head>
      <body>
        <div class="success">
          <h1>✅ Pickup Scheduled Successfully!</h1>
          <p>Your pickup has been scheduled. You'll receive a confirmation email shortly.</p>
          <p>Our delivery partner will contact you 30 minutes before the scheduled time.</p>
        </div>
      </body>
      </html>
    `;

    return new Response(successHTML, {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    });

  } catch (error) {
    console.error('Schedule pickup error:', error);
    
    const errorHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Error - Remore</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f9f9f9; }
          .error { background: #ff6b6b; color: white; padding: 20px; border-radius: 10px; max-width: 500px; margin: 0 auto; }
        </style>
      </head>
      <body>
        <div class="error">
          <h1>❌ Error Scheduling Pickup</h1>
          <p>There was an error scheduling your pickup. Please try again or contact support.</p>
        </div>
      </body>
      </html>
    `;

    return new Response(errorHTML, {
      status: 500,
      headers: { 'Content-Type': 'text/html' },
    });
  }
}