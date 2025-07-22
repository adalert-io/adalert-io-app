// Payment service for handling Stripe operations
export interface PaymentMethodData {
  nameOnCard: string;
  streetAddress: string;
  city: string;
  state: string;
  country: string;
  zip: string;
}

export interface PaymentMethodResponse {
  success: boolean;
  paymentMethodId?: string;
  error?: string;
}

export const paymentService = {
  // Create a payment method using Stripe
  async createPaymentMethod(
    paymentMethodId: string,
    billingDetails: PaymentMethodData
  ): Promise<PaymentMethodResponse> {
    try {
      const response = await fetch('/api/payment-methods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentMethodId,
          billingDetails,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create payment method');
      }

      return {
        success: true,
        paymentMethodId: data.paymentMethodId,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'An error occurred while creating payment method',
      };
    }
  },

  // Update payment method
  async updatePaymentMethod(
    paymentMethodId: string,
    billingDetails: PaymentMethodData
  ): Promise<PaymentMethodResponse> {
    try {
      const response = await fetch(`/api/payment-methods/${paymentMethodId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          billingDetails,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update payment method');
      }

      return {
        success: true,
        paymentMethodId: data.paymentMethodId,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'An error occurred while updating payment method',
      };
    }
  },
}; 