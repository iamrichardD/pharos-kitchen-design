/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Auth-Bridge / Database
 * File: src/db.ts
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: DynamoDB Client & CRUD operations for the RFC 8628 bridge.
 * Traceability: ADR 0019
 * ======================================================================== */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { 
  DynamoDBDocumentClient, 
  PutCommand, 
  GetCommand, 
  UpdateCommand 
} from "@aws-sdk/lib-dynamodb";

const endpoint = process.env.DYNAMODB_ENDPOINT || "http://localhost:8000";
const region = process.env.AWS_REGION || "us-east-1";

const client = new DynamoDBClient({
  endpoint,
  region,
  credentials: {
    accessKeyId: "mock",
    secretAccessKey: "mock"
  }
});

export const db = DynamoDBDocumentClient.from(client);

export const TABLE_NAME = "pharos-auth-codes";

export interface AuthCode {
  device_code: string;
  user_code: string;
  status: 'PENDING' | 'APPROVED' | 'EXPIRED' | 'USED';
  sub?: string;
  ttl: number;
}

/**
 * Creates a new pending auth session in DynamoDB.
 */
export async function createAuthSession(device_code: string, user_code: string): Promise<void> {
  const ttl = Math.floor(Date.now() / 1000) + 600; // 10 minute TTL
  await db.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      device_code,
      user_code,
      status: 'PENDING',
      ttl
    }
  }));
}

/**
 * Retrieves an auth session by device_code for polling.
 */
export async function getAuthSession(device_code: string): Promise<AuthCode | null> {
  const result = await db.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { device_code }
  }));
  return (result.Item as AuthCode) || null;
}

/**
 * Updates an auth session status (Web Handshake).
 */
export async function approveAuthSession(user_code: string, sub: string): Promise<void> {
  // Note: In a real implementation, we would use a GSI to find the record by user_code.
  // For the initial "Crucible Slice," we assume approval happens via the device_code for simplicity
  // or a direct PK lookup if we change the schema.
  // TODO: Add GSI support for user_code lookups.
}
