const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const productRoutes = require('./products');
const saleRoutes = require('./sales');
const staffRoutes = require('./staff');
const monitorRoutes = require('./monitor');

// Mount routes
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/sales', saleRoutes);
router.use('/staff', staffRoutes);
router.use('/monitor', monitorRoutes);

module.exports = router;
