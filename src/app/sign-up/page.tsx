import { isAutoRegisterEnabled } from '@/lib/cloudflare';
import SignUpForm from './SignUpForm';
import RegistrationClosed from './RegistrationClosed';

const APEX_DOMAIN = process.env.APEX_DOMAIN || 'example.com';

/**
 * Sign Up Page - Server Component
 * Checks registration status at build/request time to avoid client-side flash
 */
export default function SignUpPage() {
  const registrationEnabled = isAutoRegisterEnabled();

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{APEX_DOMAIN}</h1>
          <p className="text-gray-600">
            {registrationEnabled ? 'Create your email account' : 'Registration Status'}
          </p>
        </div>

        {/* Conditionally render based on server-side check */}
        {registrationEnabled ? <SignUpForm /> : <RegistrationClosed />}
      </div>
    </div>
  );
}