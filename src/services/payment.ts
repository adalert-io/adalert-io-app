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

  async savePaymentMethodDetails({
    userRef,
    paymentMethod,
    billingDetails,
  }: {
    userRef: string;
    paymentMethod: any;
    billingDetails: PaymentMethodData;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const card = paymentMethod.card || {};
      const response = await fetch('/api/payment-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userRef,
          paymentMethodType: 'Credit Card',
          stripeCardBrand: card.brand || '',
          stripeCity: billingDetails.city,
          stripeCountry: billingDetails.country,
          stripeExpiredMonth: card.exp_month ? String(card.exp_month) : '',
          stripeExpiredYear: card.exp_year ? String(card.exp_year) : '',
          stripeLast4Digits: card.last4 || '',
          stripeName: billingDetails.nameOnCard,
          stripePaymentMethod: paymentMethod.id,
          stripeState: billingDetails.state,
          stripeAddress: billingDetails.streetAddress,
          zip: billingDetails.zip,
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save payment method details');
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to save payment method details' };
    }
  },
}; 