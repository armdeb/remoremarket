import { supabase } from './supabase';
import QRCode from 'qrcode';
import nodemailer from 'nodemailer';
import moment from 'moment';

export interface DeliverySchedule {
  orderId: string;
  pickupTimeSlot: string;
  deliveryTimeSlot: string;
  pickupAddress: string;
  deliveryAddress: string;
  specialInstructions?: string;
}

export interface DeliveryQRData {
  orderId: string;
  type: 'pickup' | 'delivery';
  timestamp: string;
  userId: string;
  verificationCode: string;
}

export class DeliveryService {
  private static emailTransporter = nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  // Generate QR code for delivery/pickup
  static async generateDeliveryQR(data: DeliveryQRData): Promise<string> {
    try {
      const qrData = JSON.stringify(data);
      const qrCodeDataURL = await QRCode.toDataURL(qrData, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#8B5A3C',
          light: '#FFFFFF',
        },
        width: 256,
      });

      return qrCodeDataURL;
    } catch (error) {
      console.error('QR code generation error:', error);
      throw error;
    }
  }

  // Send delivery scheduling email to buyer and seller
  static async sendDeliverySchedulingEmail(orderId: string) {
    try {
      // Get order details
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          buyer:profiles!orders_buyer_id_fkey(*),
          seller:profiles!orders_seller_id_fkey(*),
          item:items(*)
        `)
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;

      // Generate verification codes
      const pickupVerificationCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const deliveryVerificationCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      // Generate QR codes
      const pickupQRData: DeliveryQRData = {
        orderId,
        type: 'pickup',
        timestamp: new Date().toISOString(),
        userId: order.seller.id,
        verificationCode: pickupVerificationCode,
      };

      const deliveryQRData: DeliveryQRData = {
        orderId,
        type: 'delivery',
        timestamp: new Date().toISOString(),
        userId: order.buyer.id,
        verificationCode: deliveryVerificationCode,
      };

      const pickupQR = await this.generateDeliveryQR(pickupQRData);
      const deliveryQR = await this.generateDeliveryQR(deliveryQRData);

      // Store QR codes and verification codes in database
      await supabase
        .from('delivery_qr_codes')
        .insert([
          {
            order_id: orderId,
            type: 'pickup',
            qr_code: pickupQR,
            verification_code: pickupVerificationCode,
            user_id: order.seller.id,
            created_at: new Date().toISOString(),
          },
          {
            order_id: orderId,
            type: 'delivery',
            qr_code: deliveryQR,
            verification_code: deliveryVerificationCode,
            user_id: order.buyer.id,
            created_at: new Date().toISOString(),
          },
        ]);

      // Generate available time slots (next 7 days, 9 AM to 6 PM)
      const timeSlots = this.generateTimeSlots();

      // Send email to seller (for pickup)
      await this.sendPickupEmail(order, pickupQR, pickupVerificationCode, timeSlots);

      // Send email to buyer (for delivery)
      await this.sendDeliveryEmail(order, deliveryQR, deliveryVerificationCode, timeSlots);

      return {
        pickupQR,
        deliveryQR,
        pickupVerificationCode,
        deliveryVerificationCode,
      };
    } catch (error) {
      console.error('Delivery scheduling error:', error);
      throw error;
    }
  }

  // Generate available time slots
  static generateTimeSlots(): string[] {
    const slots: string[] = [];
    const startDate = moment().add(1, 'day'); // Start from tomorrow

    for (let day = 0; day < 7; day++) {
      const currentDate = startDate.clone().add(day, 'days');
      
      // Skip weekends for now (can be configured)
      if (currentDate.day() === 0 || currentDate.day() === 6) continue;

      for (let hour = 9; hour <= 17; hour++) {
        const timeSlot = currentDate.clone().hour(hour).minute(0);
        slots.push(timeSlot.format('YYYY-MM-DD HH:mm'));
      }
    }

    return slots;
  }

  // Send pickup email to seller
  static async sendPickupEmail(order: any, qrCode: string, verificationCode: string, timeSlots: string[]) {
    const timeSlotOptions = timeSlots
      .map(slot => `<option value="${slot}">${moment(slot).format('dddd, MMMM Do YYYY, h:mm A')}</option>`)
      .join('');

    const emailHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Remore - Pickup Scheduled</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #8B5A3C; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .qr-section { text-align: center; margin: 20px 0; }
          .qr-code { max-width: 200px; height: auto; }
          .verification-code { font-size: 24px; font-weight: bold; color: #A3E635; }
          .button { background: #A3E635; color: #8B5A3C; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0; }
          .time-selector { margin: 20px 0; }
          select { padding: 10px; font-size: 16px; width: 100%; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚚 Pickup Scheduled - Remore</h1>
          </div>
          <div class="content">
            <h2>Hello ${order.seller.first_name || order.seller.nickname}!</h2>
            <p>Great news! Your item "<strong>${order.item.title}</strong>" has been sold and payment has been confirmed.</p>
            
            <h3>📦 Pickup Details:</h3>
            <ul>
              <li><strong>Order ID:</strong> #${order.id.substring(0, 8)}</li>
              <li><strong>Item:</strong> ${order.item.title}</li>
              <li><strong>Buyer:</strong> ${order.buyer.first_name || order.buyer.nickname}</li>
              <li><strong>Sale Price:</strong> $${order.total_amount}</li>
            </ul>

            <div class="qr-section">
              <h3>📱 Your Pickup QR Code</h3>
              <img src="${qrCode}" alt="Pickup QR Code" class="qr-code">
              <p>Verification Code: <span class="verification-code">${verificationCode}</span></p>
              <p><em>Show this QR code to our delivery partner during pickup</em></p>
            </div>

            <div class="time-selector">
              <h3>🕐 Choose Your Pickup Time</h3>
              <p>Please select your preferred pickup time slot:</p>
              <form action="${process.env.EXPO_PUBLIC_API_URL}/api/delivery/schedule-pickup" method="POST">
                <input type="hidden" name="orderId" value="${order.id}">
                <input type="hidden" name="userType" value="seller">
                <select name="timeSlot" required>
                  <option value="">Select a time slot...</option>
                  ${timeSlotOptions}
                </select>
                <br><br>
                <textarea name="specialInstructions" placeholder="Special pickup instructions (optional)" rows="3" style="width: 100%; padding: 10px;"></textarea>
                <br><br>
                <button type="submit" class="button">Confirm Pickup Time</button>
              </form>
            </div>

            <h3>📋 What to Expect:</h3>
            <ol>
              <li>Our delivery partner will contact you 30 minutes before pickup</li>
              <li>Have your item ready and packaged securely</li>
              <li>Show the QR code or provide the verification code</li>
              <li>You'll receive confirmation once pickup is complete</li>
            </ol>

            <p><strong>Questions?</strong> Reply to this email or contact our support team.</p>
            
            <p>Thank you for using Remore!</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.emailTransporter.sendMail({
      from: '"Remore Delivery" <delivery@remore.com>',
      to: order.seller.email,
      subject: `📦 Pickup Scheduled - Order #${order.id.substring(0, 8)}`,
      html: emailHTML,
    });
  }

  // Send delivery email to buyer
  static async sendDeliveryEmail(order: any, qrCode: string, verificationCode: string, timeSlots: string[]) {
    const timeSlotOptions = timeSlots
      .map(slot => `<option value="${slot}">${moment(slot).format('dddd, MMMM Do YYYY, h:mm A')}</option>`)
      .join('');

    const emailHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Remore - Delivery Scheduled</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #8B5A3C; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .qr-section { text-align: center; margin: 20px 0; }
          .qr-code { max-width: 200px; height: auto; }
          .verification-code { font-size: 24px; font-weight: bold; color: #A3E635; }
          .button { background: #A3E635; color: #8B5A3C; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0; }
          .time-selector { margin: 20px 0; }
          select { padding: 10px; font-size: 16px; width: 100%; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚚 Delivery Scheduled - Remore</h1>
          </div>
          <div class="content">
            <h2>Hello ${order.buyer.first_name || order.buyer.nickname}!</h2>
            <p>Exciting news! Your purchase is being prepared for delivery.</p>
            
            <h3>📦 Delivery Details:</h3>
            <ul>
              <li><strong>Order ID:</strong> #${order.id.substring(0, 8)}</li>
              <li><strong>Item:</strong> ${order.item.title}</li>
              <li><strong>Seller:</strong> ${order.seller.first_name || order.seller.nickname}</li>
              <li><strong>Total Paid:</strong> $${order.total_amount}</li>
            </ul>

            <div class="qr-section">
              <h3>📱 Your Delivery QR Code</h3>
              <img src="${qrCode}" alt="Delivery QR Code" class="qr-code">
              <p>Verification Code: <span class="verification-code">${verificationCode}</span></p>
              <p><em>Show this QR code to our delivery partner upon delivery</em></p>
            </div>

            <div class="time-selector">
              <h3>🕐 Choose Your Delivery Time</h3>
              <p>Please select your preferred delivery time slot:</p>
              <form action="${process.env.EXPO_PUBLIC_API_URL}/api/delivery/schedule-delivery" method="POST">
                <input type="hidden" name="orderId" value="${order.id}">
                <input type="hidden" name="userType" value="buyer">
                <select name="timeSlot" required>
                  <option value="">Select a time slot...</option>
                  ${timeSlotOptions}
                </select>
                <br><br>
                <textarea name="deliveryAddress" placeholder="Delivery address" rows="3" style="width: 100%; padding: 10px;" required></textarea>
                <br><br>
                <textarea name="specialInstructions" placeholder="Special delivery instructions (optional)" rows="3" style="width: 100%; padding: 10px;"></textarea>
                <br><br>
                <button type="submit" class="button">Confirm Delivery Time</button>
              </form>
            </div>

            <h3>📋 What to Expect:</h3>
            <ol>
              <li>We'll pick up your item from the seller first</li>
              <li>Our delivery partner will contact you 30 minutes before delivery</li>
              <li>Be available to receive your item</li>
              <li>Show the QR code or provide the verification code</li>
              <li>Inspect your item and confirm delivery</li>
            </ol>

            <p><strong>Questions?</strong> Reply to this email or contact our support team.</p>
            
            <p>Thank you for choosing Remore!</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.emailTransporter.sendMail({
      from: '"Remore Delivery" <delivery@remore.com>',
      to: order.buyer.email,
      subject: `🚚 Delivery Scheduled - Order #${order.id.substring(0, 8)}`,
      html: emailHTML,
    });
  }

  // Schedule pickup time
  static async schedulePickup(orderId: string, timeSlot: string, specialInstructions?: string) {
    try {
      const { error } = await supabase
        .from('delivery_schedules')
        .upsert({
          order_id: orderId,
          pickup_time_slot: timeSlot,
          pickup_instructions: specialInstructions,
          pickup_scheduled_at: new Date().toISOString(),
        });

      if (error) throw error;

      // Update order status
      await supabase
        .from('orders')
        .update({ 
          status: 'pickup_scheduled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      return true;
    } catch (error) {
      console.error('Schedule pickup error:', error);
      throw error;
    }
  }

  // Schedule delivery time
  static async scheduleDelivery(orderId: string, timeSlot: string, deliveryAddress: string, specialInstructions?: string) {
    try {
      const { error } = await supabase
        .from('delivery_schedules')
        .upsert({
          order_id: orderId,
          delivery_time_slot: timeSlot,
          delivery_address: deliveryAddress,
          delivery_instructions: specialInstructions,
          delivery_scheduled_at: new Date().toISOString(),
        });

      if (error) throw error;

      // Update order status
      await supabase
        .from('orders')
        .update({ 
          status: 'delivery_scheduled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      return true;
    } catch (error) {
      console.error('Schedule delivery error:', error);
      throw error;
    }
  }

  // Verify QR code during pickup/delivery
  static async verifyDeliveryQR(qrData: string, deliveryPersonId: string): Promise<boolean> {
    try {
      const parsedData: DeliveryQRData = JSON.parse(qrData);
      
      // Verify QR code exists and is valid
      const { data: qrRecord, error } = await supabase
        .from('delivery_qr_codes')
        .select('*')
        .eq('order_id', parsedData.orderId)
        .eq('type', parsedData.type)
        .eq('verification_code', parsedData.verificationCode)
        .single();

      if (error || !qrRecord) {
        throw new Error('Invalid QR code');
      }

      // Mark as scanned
      await supabase
        .from('delivery_qr_codes')
        .update({
          scanned_at: new Date().toISOString(),
          scanned_by: deliveryPersonId,
        })
        .eq('id', qrRecord.id);

      // Update order status
      const newStatus = parsedData.type === 'pickup' ? 'picked_up' : 'delivered';
      await supabase
        .from('orders')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', parsedData.orderId);

      return true;
    } catch (error) {
      console.error('QR verification error:', error);
      return false;
    }
  }

  // Get delivery status for order
  static async getDeliveryStatus(orderId: string) {
    try {
      const { data, error } = await supabase
        .from('delivery_schedules')
        .select(`
          *,
          order:orders(status),
          pickup_qr:delivery_qr_codes!delivery_qr_codes_order_id_fkey(scanned_at, scanned_by)
        `)
        .eq('order_id', orderId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Get delivery status error:', error);
      return null;
    }
  }
}