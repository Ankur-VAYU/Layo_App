'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './checkout.module.css';
import Logo from '@/components/Logo';
import { supabase } from '@/lib/supabase';

export default function Checkout() {
  const router = useRouter();
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [orderData, setOrderData] = useState<any>(null);

  useEffect(() => {
    const savedData = localStorage.getItem('layo_pending_shipment');
    if (savedData) {
      setOrderData(JSON.parse(savedData));
    } else {
      // Fallback/Mock
      setOrderData({
        weight: "2.75",
        cost: "8,250",
        items: [],
        address: "123 Maple Street, Toronto, ON M5V 2L7",
        mode: "Selection"
      });
    }
  }, []);

  const handlePayment = async () => {
    setIsProcessing(true);
    
    // 1. Simulate Payment (2 seconds)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 2. Save to Supabase (if keys exist)
    try {
      const { data, error } = await supabase
        .from('shipments')
        .insert([
          {
            mode: orderData.mode,
            destination_city: orderData.destinationCity || 'Unknown',
            destination_address: orderData.destinationAddress || orderData.address,
            total_weight: parseFloat(orderData.totalWeight || orderData.weight),
            total_cost: parseInt((orderData.totalCost || orderData.cost).replace(/,/g, '')),
            items: orderData.items,
            status: 'paid',
            payment_method: paymentMethod
          }
        ]);
      
      if (error) throw error;
    } catch (err) {
      console.warn("Supabase insert failed (likely due to missing keys/table):", err);
      // We continue to success screen for demo purposes even if DB fails
    }

    setIsProcessing(false);
    setIsSuccess(true);
    localStorage.removeItem('layo_pending_shipment');
  };

  if (isSuccess) {
    return (
      <main className={styles.container}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center' }}>
          <div style={{ width: '100px', height: '100px', background: '#10b981', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem', fontSize: '3rem', animation: 'scaleUp 0.5s ease' }}>
            ✓
          </div>
          <h1 className="gradient-text">Payment Successful!</h1>
          <p className={styles.subtitle}>Your shipment order has been placed successfully.</p>
          <div className={styles.section} style={{ maxWidth: '500px', width: '100%' }}>
            <p style={{ marginBottom: '1rem' }}><strong>Order ID:</strong> LAYO-774581632</p>
            <p style={{ color: 'var(--text-muted)' }}>We have notified our India hub. You will receive a tracking link via WhatsApp shortly.</p>
          </div>
          <button className={styles.payBtn} onClick={() => router.push('/dashboard')}>
            Back to Dashboard
          </button>
        </div>
        <style jsx>{`
          @keyframes scaleUp {
            from { transform: scale(0); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
        `}</style>
      </main>
    );
  }

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <a href="/" style={{ textDecoration: 'none' }}>
          <Logo showTagline={false} />
        </a>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Secure Checkout System
        </div>
      </header>

      <div className={styles.content}>
        <div className={styles.mainArea}>
          <h1 className="gradient-text">Complete Shipment</h1>
          <p className={styles.subtitle}>Review your details and choose a payment method.</p>

          <div className={styles.section}>
            <h2><span>📍</span> Delivery Details</h2>
            <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}><strong>{orderData?.address}</strong></p>
            <p style={{ color: 'var(--text-muted)' }}>Estimated Delivery: 5-7 Business Days</p>
          </div>

          <div className={styles.section}>
            <h2><span>💳</span> Payment Method</h2>
            <div className={styles.paymentGrid}>
              <div 
                className={`${styles.paymentMethod} ${paymentMethod === 'card' ? styles.paymentMethodActive : ''}`}
                onClick={() => setPaymentMethod('card')}
              >
                <span className={styles.methodIcon}>💳</span>
                <span>Credit/Debit</span>
              </div>
              <div 
                className={`${styles.paymentMethod} ${paymentMethod === 'upi' ? styles.paymentMethodActive : ''}`}
                onClick={() => setPaymentMethod('upi')}
              >
                <span className={styles.methodIcon}>📱</span>
                <span>UPI / QR</span>
              </div>
              <div 
                className={`${styles.paymentMethod} ${paymentMethod === 'paypal' ? styles.paymentMethodActive : ''}`}
                onClick={() => setPaymentMethod('paypal')}
              >
                <span className={styles.methodIcon}>🅿️</span>
                <span>PayPal</span>
              </div>
            </div>

            {paymentMethod === 'card' && (
              <div className={styles.cardForm}>
                <div className={styles.inputGroup}>
                  <label>Cardholder Name</label>
                  <input type="text" placeholder="John Doe" className="glass" />
                </div>
                <div className={styles.inputGroup}>
                  <label>Card Number</label>
                  <input type="text" placeholder="**** **** **** ****" className="glass" />
                </div>
                <div className={styles.inputRow}>
                  <div className={styles.inputGroup}>
                    <label>Expiry Date</label>
                    <input type="text" placeholder="MM/YY" className="glass" />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>CVV</label>
                    <input type="password" placeholder="***" className="glass" />
                  </div>
                </div>
              </div>
            )}

            {paymentMethod === 'upi' && (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div style={{ width: '200px', height: '200px', background: '#fff', margin: '0 auto 1rem', padding: '1rem', borderRadius: '12px' }}>
                  {/* Placeholder for QR Code */}
                  <div style={{ width: '100%', height: '100%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000' }}>
                    QR CODE
                  </div>
                </div>
                <p>Scan the QR code with any UPI app to pay</p>
              </div>
            )}
          </div>
        </div>

        <aside className={styles.sidebar}>
          <div className={styles.orderSummary}>
            <h2>Order Summary</h2>
            <div className={styles.summaryItem}>
              <span>Shipment Mode</span>
              <span>{orderData?.mode}</span>
            </div>
            <div className={styles.summaryItem}>
              <span>Total Weight</span>
              <span>{orderData?.weight} kg</span>
            </div>
            <div className={styles.summaryItem}>
              <span>Service Fee</span>
              <span>₹1,500</span>
            </div>
            <div className={styles.summaryItem}>
              <span>Shipping Charge</span>
              <span>₹{orderData?.cost}</span>
            </div>
            
            <div className={styles.divider}></div>
            
            <div className={styles.total}>
              <h3>Total Amount</h3>
              <h3>₹{orderData?.cost}</h3>
            </div>

            <button 
              className={styles.payBtn} 
              onClick={handlePayment}
              disabled={isProcessing}
            >
              {isProcessing ? 'Verifying Payment...' : `Pay ₹${orderData?.cost}`}
            </button>

            <div className={styles.safetyInfo}>
              <span>🔒 256-bit SSL Secure Payment</span>
              <div className={styles.trustBadges}>
                <span>VISA</span>
                <span>MC</span>
                <span>RAZORPAY</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
