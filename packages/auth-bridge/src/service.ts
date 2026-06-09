/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Auth-Bridge / Passkey Service
 * File: src/service.ts
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Encapsulates WebAuthn ceremony logic using @simplewebauthn/server.
 * Traceability: ADR 0050, Issue #206
 * Last Updated: 2026-06-03
 * ======================================================================== */

import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type { 
    RegistrationResponseJSON,
    AuthenticationResponseJSON,
    PublicKeyCredentialCreationOptionsJSON,
    PublicKeyCredentialRequestOptionsJSON,
    AuthenticatorTransportFuture
} from '@simplewebauthn/server';
import { IAuthRepository } from './db';
import { toBase64Url, fromBase64Url } from './utils';

/**
 * Internal DTO for WebAuthn Registration Response to encapsulate @simplewebauthn.
 * This ensures the domain logic remains decoupled from the specific library version.
 */
export type WebAuthnRegistrationDTO = RegistrationResponseJSON;

/**
 * Internal DTO for WebAuthn Authentication Response to encapsulate @simplewebauthn.
 */
export type WebAuthnAuthenticationDTO = AuthenticationResponseJSON;

/**
 * Educational metadata for the UI to empower the user during the Passkey ceremony.
 * Rationale: Kathy Sierra's "Making the User Amazing" mandate.
 */
export interface PasskeyMetadata {
    title: string;
    hook: string;
}

export interface PasskeyRegistrationOptionsResponse {
    options: PublicKeyCredentialCreationOptionsJSON;
    pkd_metadata: PasskeyMetadata;
}

export interface PasskeyAuthenticationOptionsResponse {
    options: PublicKeyCredentialRequestOptionsJSON;
    pkd_metadata: PasskeyMetadata;
}

export class PasskeyService {
  constructor(
    private repo: IAuthRepository,
    private rpID: string,
    private origin: string
  ) {}

  /**
   * Generates options for a new Passkey registration.
   */
  async generateRegistrationOptions(userId: string, username: string): Promise<PasskeyRegistrationOptionsResponse> {
    const options = await generateRegistrationOptions({
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

    return {
      options,
      pkd_metadata: {
        title: "Activate Your Secure Designer Identity",
        hook: "You're upgrading to hardware-based security. By linking your biometrics or security key, you're ensuring your specifications and designs are protected by the same standards used by global banks. No passwords to remember, no passwords to steal."
      }
    };
  }

  /**
   * Verifies the client's registration response.
   */
  async verifyRegistration(userId: string, response: WebAuthnRegistrationDTO, expectedChallenge: string) {
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

      const b64UrlPublicKey = Buffer.from(credentialPublicKey).toString('base64url');
      const b64UrlCredID = Buffer.from(credentialID).toString('base64url');

      await this.repo.addCredential({
        id: b64UrlCredID,
        user_id: userId,
        public_key: b64UrlPublicKey,
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

  /**
   * Generates options for a Passkey login.
   */
  async generateAuthenticationOptions(userId: string): Promise<PasskeyAuthenticationOptionsResponse> {
    const credentials = await this.repo.getCredentials(userId);
    
    const options = await generateAuthenticationOptions({
      rpID: this.rpID,
      allowCredentials: credentials.map(c => ({
        id: c.id, // already stored as base64url
        type: 'public-key' as const,
        transports: c.transports ? c.transports.split(',') as AuthenticatorTransportFuture[] : undefined,
      })),
      userVerification: 'preferred',
    });

    return {
        options,
        pkd_metadata: {
            title: "Identity Verified via Hardware",
            hook: "Welcome back. Your secure hardware is confirming your identity. This 'Handshake' eliminates the risk of phishing and ensures that only you can authorize these commercial specifications."
        }
    };
  }

  /**
   * Verifies the client's authentication response.
   */
  async verifyAuthentication(userId: string, response: WebAuthnAuthenticationDTO, expectedChallenge: string) {
    const b64UrlCredID = response.id;
    const credential = await this.repo.getCredential(b64UrlCredID);
    
    if (!credential) {
        throw new Error('Credential not found');
    }

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: this.origin,
      expectedRPID: this.rpID,
      authenticator: {
        credentialID: fromBase64Url(credential.id),
        credentialPublicKey: fromBase64Url(credential.public_key),
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
