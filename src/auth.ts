import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PulseRequest } from './server';
import * as crypto from 'crypto';

export class PulseAuth {
  private jwtSecret: string;

  constructor(secret?: string) {
    this.jwtSecret = secret || 'pulse-jwt-secret';
  }

  public async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  public async comparePasswords(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  public generateToken(payload: object, expiresIn: string | number = '1h'): string {
    return jwt.sign(payload, this.jwtSecret, { expiresIn });
  }

  public verifyToken(token: string): any {
    return jwt.verify(token, this.jwtSecret);
  }

  public setSigningSecret(secret: string): void {
    this.jwtSecret = secret;
  }

  // Everything Below Pertains To Pulse Auth (Non-Traditional JWT Auth)

  /**
   * Generates a deviceID based on the user's IP, User Agent, Device RAM, Audio Identifier, and Device Cores.
   * @param req PulsRequest
   * @returns deviceID
   */
  public createUserDeviceID(req: PulseRequest) {
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const deviceRam = req.headers['device-ram'];
    const audioIdentifier = req.headers['audio-identifier'];
    const deviceCores = req.headers['device-cors'];

    if (!ip || !userAgent || !deviceRam || !audioIdentifier || !deviceCores) {
      throw new Error('Missing required headers');
    }

    const deviceData = [
      ip.toString(),
      userAgent,
      deviceRam.toString(),
      audioIdentifier.toString(),
      deviceCores.toString(),
    ];
    const deviceID = this.generateDeviceId(deviceData);

    return deviceID;
  }

  private generateDeviceId(data: string[]): string {
    const hash = crypto.createHash('sha256');
    hash.update(data.join('|')); // Joining data with a separator ensures more distinct values
    return hash.digest('hex');
  }
}
