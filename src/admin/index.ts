import { PulseServer } from '../server';
import fs from 'fs';
import path from 'path';

export const adminRouter = (server: PulseServer) => {
  server.get('/pulse', (req, res) => {
    const html = fs.readFileSync(path.join(__dirname, 'dashboard/index.html'), 'utf8');

    res.end(html);
  });
};
