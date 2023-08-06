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
