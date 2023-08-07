/**
 * Copyright 2023 Nathaniel Richards
 * This document is licensed under the terms of the MIT License.
 */

import nedb from 'nedb';

export const deviceDatastore = new nedb({
  filename: 'pulsedb/devices.db',
  autoload: true,
});

export const rateLimitingDatastore = new nedb({
  filename: 'pulsedb/rate-limiting.db',
  autoload: true,
});

export const PulseDB = {
  deviceDatastore,
  rateLimitingDatastore,
};
