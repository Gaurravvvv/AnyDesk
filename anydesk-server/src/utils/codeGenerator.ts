import { customAlphabet } from 'nanoid';
import { config } from '../config';

// Uppercase alphanumeric — easy to read and type aloud
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed I, O, 0, 1 to avoid confusion

const generate = customAlphabet(ALPHABET, config.room.codeLength);

/**
 * Generates a room code like "A7K3M2".
 * Uses a reduced alphabet that excludes visually ambiguous characters.
 */
export function generateRoomCode(): string {
  return generate();
}
