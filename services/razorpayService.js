const Razorpay = require('razorpay');

let instance;

// Lazily constructed so the app can still boot (e.g. for local UI-only demos)
// even if Razorpay keys have not been configured yet.
const getRazorpayInstance = () => {
  if (instance) return instance;

  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay keys are not configured in the environment');
  }

  instance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

  return instance;
};

module.exports = { getRazorpayInstance };
