const reportService = require('../services/reportService');

async function dailySales(req, res) {
  const data = await reportService.getDailySales(req.query.date);
  res.json({ success: true, message: 'Daily sales fetched', data });
}

async function monthlySales(req, res) {
  const data = await reportService.getMonthlySales(req.query.date);
  res.json({ success: true, message: 'Monthly sales fetched', data });
}

async function topProducts(req, res) {
  const data = await reportService.getTopProducts(req.query.limit || 10, req.query.date, req.query.period);
  res.json({ success: true, message: 'Top products fetched', data });
}

async function exportCsv(req, res) {
  const csv = await reportService.exportCsv(req.query.date, req.query.period);
  res.header('Content-Type', 'text/csv');
  res.attachment(`orders-report-${req.query.period || 'month'}-${req.query.date || 'all'}.csv`);
  res.send(csv);
}

module.exports = { dailySales, monthlySales, topProducts, exportCsv };
