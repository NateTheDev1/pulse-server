import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

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
}
