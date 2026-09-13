const cron = require('node-cron');
const Inventory = require('../models/Inventory');
const sendEmail = require('../utils/sendEmail');

// Avoid spamming the admin inbox: only re-notify for the same item once this long has passed.
const RENOTIFY_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

const checkLowStock = async () => {
  try {
    const items = await Inventory.find({ $expr: { $lt: ['$quantity', '$threshold'] } });
    if (items.length === 0) return;

    const now = Date.now();
    const toNotify = items.filter(
      (item) => !item.lowStockNotifiedAt || now - new Date(item.lowStockNotifiedAt).getTime() > RENOTIFY_INTERVAL_MS
    );

    if (toNotify.length === 0) return;

    const rows = toNotify
      .map(
        (i) =>
          `<tr><td>${i.name}</td><td>${i.category}</td><td>${i.quantity}</td><td>${i.threshold}</td></tr>`
      )
      .join('');

    const html = `
      <h2>Low Stock Alert</h2>
      <table border="1" cellpadding="6" cellspacing="0">
        <tr><th>Item</th><th>Category</th><th>Current Quantity</th><th>Threshold</th></tr>
        ${rows}
      </table>
    `;

    await sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: `Low Stock Alert — ${toNotify.length} item(s) need restocking`,
      html,
    });

    await Inventory.updateMany(
      { _id: { $in: toNotify.map((i) => i._id) } },
      { $set: { lowStockNotifiedAt: new Date() } }
    );

    console.log(`[low-stock-cron] Notified admin about ${toNotify.length} low-stock item(s)`);
  } catch (err) {
    console.error('[low-stock-cron] Failed to run low stock check:', err.message);
  }
};

const startLowStockCron = () => {
  const schedule = process.env.LOW_STOCK_CRON || '*/10 * * * *';
  cron.schedule(schedule, checkLowStock);
  console.log(`[low-stock-cron] Scheduled with pattern "${schedule}"`);
};

module.exports = { startLowStockCron, checkLowStock };
