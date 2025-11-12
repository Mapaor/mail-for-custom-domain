import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';

/**
 * Verify organization passphrase
 * Used during sign-up to restrict access to authorized users only
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return NextResponse.json(
        { ok: false, error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const { passphrase } = body;

    // Check if passphrase protection is enabled
    const askPassphrase = process.env.ASK_PASSPHRASE === 'TRUE';
    if (!askPassphrase) {
      // If disabled, always return success
      return NextResponse.json({ ok: true });
    }

    const expectedPassphrase = process.env.PASSPHRASE || '';
    if (!expectedPassphrase) {
      console.error('PASSPHRASE env variable not set but ASK_PASSPHRASE is TRUE');
      return NextResponse.json(
        { ok: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Validate input
    if (!passphrase || typeof passphrase !== 'string') {
      return NextResponse.json(
        { ok: false, error: 'Passphrase is required' },
        { status: 400 }
      );
    }

    // Use constant-time comparison to prevent timing attacks
    const inputBuffer = Buffer.from(passphrase, 'utf-8');
    const expectedBuffer = Buffer.from(expectedPassphrase, 'utf-8');

    // If lengths differ, timingSafeEqual throws, so check first
    if (inputBuffer.length !== expectedBuffer.length) {
      return NextResponse.json(
        { ok: false, error: 'Invalid passphrase' },
        { status: 401 }
      );
    }

    const isValid = timingSafeEqual(inputBuffer, expectedBuffer);

    if (isValid) {
      return NextResponse.json({ ok: true });
    } else {
      return NextResponse.json(
        { ok: false, error: 'Invalid passphrase' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Error verifying passphrase:', error);
    return NextResponse.json(
      { ok: false, error: 'Server error' },
      { status: 500 }
    );
  }
}
