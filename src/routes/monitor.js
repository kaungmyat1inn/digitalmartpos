const express = require('express');
const router = express.Router();
const eventBus = require('../utils/eventBus');
const AuditLog = require('../models/AuditLog');
const { authenticate, requireShopAdminOrHigher, asyncHandler } = require('../middleware');

router.get('/stream', authenticate, requireShopAdminOrHigher, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  const send = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };
  const onProcess = (data) => {
    send('process', data);
  };
  const onLog = (data) => {
    send('error', data);
  };
  eventBus.on('process', onProcess);
  eventBus.on('log', onLog);
  req.on('close', () => {
    eventBus.off('process', onProcess);
    eventBus.off('log', onLog);
  });
  send('connected', { ok: true, timestamp: new Date().toISOString() });
});

router.get('/errors', authenticate, requireShopAdminOrHigher, asyncHandler(async (req, res) => {
  const { since, limit } = req.query;
  const query = { action: 'SYSTEM_ERROR' };
  if (since) {
    query.createdAt = { $gte: new Date(since) };
  }
  const l = Math.min(parseInt(limit, 10) || 50, 200);
  const logs = await AuditLog.find(query).sort({ createdAt: -1 }).limit(l).lean();
  res.json({ success: true, data: logs });
}));

module.exports = router;
