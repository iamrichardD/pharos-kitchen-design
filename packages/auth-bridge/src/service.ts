/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Auth-Bridge / Passkey Service
 * File: src/service.ts
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Encapsulates WebAuthn ceremony logic using @simplewebauthn/server.
 * Traceability: ADR 0050, Issue #206
 * Last Updated: 2025-03-07
 * ======================================================================== */

import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type { 
    GenerateRegistrationOptionsOpts, 
    VerifyRegistrationResponseOpts,
    GenerateAuthenticationOptionsOpts,
    VerifyAuthenticationResponseOpts
} from '@simplewebauthn/server';
import { IAuthRepository } from './db';

export class PasskeyService {
  constructor(
    private repo: IAuthRepository,
    private rpID: string,
    private origin: string
  ) {}

  async generateRegistrationOptions(userId: string, username: string) {
    return await generateRegistrationOptions({
      rpName: 'Pharos Kitchen Design',
      rpID: this.rpID,
      userID: new TextEncoder().encode(userId),
      userName: username,
      attestationType: 'none',
      authenticatorSelection: { 
        residentKey: 'preferred', 
        userVerification: 'preferred' 
      }
    });
  }

  async verifyRegistration(userId: string, response: any, expectedChallenge: string) {
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: this.origin,
      expectedRPID: this.rpID,
    });

    if (verification.verified && verification.registrationInfo) {
      const { 
        credentialPublicKey, 
        credentialID, 
        counter, 
        credentialDeviceType, 
        credentialBackedUp 
      } = verification.registrationInfo;
      
      const transports = response.response.transports ? response.response.transports.join(',') : '';

      // Use Buffer for base64 conversion (Cloudflare Worker env)
      const b64PublicKey = Buffer.from(credentialPublicKey).toString('base64');
      const b64CredID = Buffer.from(credentialID).toString('base64');

      await this.repo.addCredential({
        id: b64CredID,
        user_id: userId,
        public_key: b64PublicKey,
        counter,
        device_type: credentialDeviceType,
        backed_up: credentialBackedUp,
        transports,
        created_at: Date.now()
      });

      return { verified: true };
    }

    return { verified: false };
  }

  async generateAuthenticationOptions(userId: string) {
    const credentials = await this.repo.getCredentials(userId);
    
    return await generateAuthenticationOptions({
      rpID: this.rpID,
      allowCredentials: credentials.map(c => ({
        id: Buffer.from(c.id, 'base64').toString('base64url'),
        type: 'public-key',
        transports: c.transports ? c.transports.split(',') as any : undefined,
      })),
      userVerification: 'preferred',
    });
  }

  async verifyAuthentication(userId: string, response: any, expectedChallenge: string) {
    const b64CredID = response.id;
    const credential = await this.repo.getCredential(b64CredID);
    
    if (!credential) {
        throw new Error('Credential not found');
    }

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: this.origin,
      expectedRPID: this.rpID,
      authenticator: {
        credentialID: new Uint8Array(Buffer.from(credential.id, 'base64')),
        credentialPublicKey: new Uint8Array(Buffer.from(credential.public_key, 'base64')),
        counter: credential.counter,
      }
    });

    if (verification.verified) {
      await this.repo.updateCredentialCounter(credential.id, verification.authenticationInfo.newCounter);
      return { verified: true };
    }

    return { verified: false };
  }
}
