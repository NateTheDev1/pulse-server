/**
 * Copyright 2023 Nathaniel Richards
 * This document is licensed under the terms of the MIT License.
 */

import { PulseServer } from '../server';
import fs from 'fs';
import path from 'path';

export const adminRouter = (server: PulseServer) => {
  server.get('/pulse', (req, res) => {
    const html = fs.readFileSync(path.join(__dirname, 'dashboard/index.html'), 'utf8');

    res.end(html);
  });

  server.get('/pulse/stats', (req, res) => {
    res.json({
      ...server.performance.getStats(),
      config: server.getConfig(),
      configMethod: server.getConfigMethod(),
    });
  });
};
