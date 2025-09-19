import midtransClient from 'midtrans-client';

// Midtrans configuration
export class MidtransService {
  private coreApi: any;
  private snap: any;

  constructor() {
    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    const clientKey = process.env.MIDTRANS_CLIENT_KEY;
    const isProduction = process.env.NODE_ENV === 'production';

    if (!serverKey) {
      throw new Error('MIDTRANS_SERVER_KEY environment variable is required');
    }

    if (!clientKey) {
      throw new Error('MIDTRANS_CLIENT_KEY environment variable is required');
    }

    // Initialize Core API for backend operations
    this.coreApi = new midtransClient.CoreApi({
      isProduction,
      serverKey,
      clientKey
    });

    // Initialize Snap for payment page
    this.snap = new midtransClient.Snap({
      isProduction,
      serverKey,
      clientKey
    });
  }

  // Create QRIS payment transaction
  async createQRISPayment(params: {
    orderId: string;
    grossAmount: number;
    customerDetails: {
      name: string;
      phone?: string;
    };
    itemDetails: Array<{
      id: string;
      name: string;
      price: number;
      quantity: number;
    }>;
  }) {
    const transaction = {
      transaction_details: {
        order_id: params.orderId,
        gross_amount: params.grossAmount
      },
      payment_type: 'qris',
      qris: {
        acquirer: 'gopay' // Use GoPay as QRIS acquirer
      },
      customer_details: {
        first_name: params.customerDetails.name,
        phone: params.customerDetails.phone || ''
      },
      item_details: params.itemDetails,
      custom_expiry: {
        expiry_duration: 15,
        unit: 'minute'
      }
    };

    try {
      const chargeResponse = await this.coreApi.charge(transaction);
      return {
        success: true,
        orderId: params.orderId,
        transactionId: chargeResponse.transaction_id,
        transactionStatus: chargeResponse.transaction_status,
        qrisUrl: chargeResponse.actions?.find((action: any) => action.name === 'generate-qr-code')?.url,
        expiryTime: chargeResponse.expiry_time,
        grossAmount: chargeResponse.gross_amount
      };
    } catch (error) {
      console.error('Midtrans QRIS payment error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Check transaction status
  async getTransactionStatus(transactionId: string) {
    try {
      const statusResponse = await this.coreApi.transaction.status(transactionId);
      return {
        success: true,
        transactionId: statusResponse.transaction_id,
        orderId: statusResponse.order_id,
        transactionStatus: statusResponse.transaction_status,
        fraudStatus: statusResponse.fraud_status,
        grossAmount: statusResponse.gross_amount,
        paymentType: statusResponse.payment_type,
        transactionTime: statusResponse.transaction_time,
        settlementTime: statusResponse.settlement_time
      };
    } catch (error) {
      console.error('Midtrans status check error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Verify webhook notification
  verifySignatureKey(orderId: string, statusCode: string, grossAmount: string, serverKey: string): string {
    const crypto = require('crypto');
    const hash = crypto
      .createHash('sha512')
      .update(orderId + statusCode + grossAmount + serverKey)
      .digest('hex');
    return hash;
  }

  // Process webhook notification
  processWebhookNotification(notification: any) {
    const {
      order_id,
      transaction_status,
      fraud_status,
      signature_key,
      status_code,
      gross_amount
    } = notification;

    // Verify signature
    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    if (!serverKey) {
      throw new Error('Server key not configured');
    }

    const expectedSignature = this.verifySignatureKey(
      order_id,
      status_code,
      gross_amount,
      serverKey
    );

    if (signature_key !== expectedSignature) {
      throw new Error('Invalid signature key');
    }

    // Determine payment status
    let paymentStatus = 'pending';
    if (transaction_status === 'settlement' || transaction_status === 'capture') {
      paymentStatus = 'paid';
    } else if (transaction_status === 'deny' || transaction_status === 'cancel' || transaction_status === 'failure') {
      paymentStatus = 'failed';
    } else if (transaction_status === 'expire') {
      paymentStatus = 'expired';
    }

    return {
      orderId: order_id,
      transactionStatus: transaction_status,
      fraudStatus: fraud_status,
      paymentStatus,
      grossAmount: gross_amount,
      statusCode: status_code
    };
  }

  // Get client configuration for frontend
  getClientConfig() {
    return {
      clientKey: process.env.MIDTRANS_CLIENT_KEY,
      isProduction: process.env.NODE_ENV === 'production'
    };
  }
}