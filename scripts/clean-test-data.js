'use strict';
const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGO_URI).then(async () => {
  const { DispatchOrder, DeliveryAgent, DispatchRoute } = require('../src/modules/dispatch/dispatch.model');
  const r1 = await DispatchOrder.deleteMany({ orderId: { $regex: /^FULLTEST/ } });
  const r2 = await DeliveryAgent.deleteMany({ name: { $regex: /^Dispatch Agent/ } });
  const r3 = await DispatchRoute.deleteMany({ dispatchBatchId: 'FULLTEST-BATCH' });
  console.log(`Cleaned: ${r1.deletedCount} orders, ${r2.deletedCount} agents, ${r3.deletedCount} routes`);
  await mongoose.disconnect();
});
