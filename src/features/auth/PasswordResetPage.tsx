import React, { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Mail, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Card, Button, Input } from '../../components/ui';
import api from '../../api';

const PasswordResetPage: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<boolean>(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!email) {
      setError('Please enter your email address');
      setLoading(false);
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    try {
      await api.post('/core/password-reset/request/', { email });
      setSuccess(true);
    } catch (err: any) {
      // Even on error, show success message to prevent email enumeration
      setSuccess(true);
    }
    setLoading(false);
  };

  // Success State
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8">
          <div className="text-center">
            {/* Success Icon */}
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">Check Your Email</h1>
            <p className="text-gray-600 mb-6">
              If an account exists with <span className="font-medium text-gray-900">{email}</span>, 
              you will receive a password reset link shortly.
            </p>

            {/* Instructions */}
            <div className="bg-blue-50 rounded-lg p-4 mb-6 text-left">
              <h3 className="font-medium text-blue-900 mb-2">Next Steps:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Check your inbox (and spam folder)</li>
                <li>• Click the reset link in the email</li>
                <li>• Create a new password</li>
              </ul>
            </div>

            {/* Note */}
            <p className="text-sm text-gray-500 mb-6">
              Didn't receive the email? Check your spam folder or try again with a different email.
            </p>

            {/* Actions */}
            <div className="space-y-3">
              <Button
                onClick={() => {
                  setSuccess(false);
                  setEmail('');
                }}
                variant="outline"
                className="w-full justify-center"
              >
                Try Different Email
              </Button>
              <Link
                to="/login"
                className="block w-full text-center py-2 px-4 text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
              >
                ← Back to Sign In
              </Link>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Request Form
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <BarChart3 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Reset Password</h1>
          <p className="text-gray-500 mt-2">
            Enter your email and we'll send you a reset link
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email Input */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                placeholder="Enter your registered email"
                className={`
                  w-full pl-10 pr-4 py-3 rounded-lg border transition-colors
                  focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent
                  ${error ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white'}
                `}
                required
                autoComplete="email"
                autoFocus
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full justify-center py-3"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Sending Reset Link...
              </>
            ) : (
              <>
                <Mail className="w-5 h-5 mr-2" />
                Send Reset Link
              </>
            )}
          </Button>
        </form>

        {/* Back to Login */}
        <div className="mt-6 pt-6 border-t">
          <Link
            to="/login"
            className="flex items-center justify-center gap-2 text-gray-600 hover:text-emerald-600 transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Link>
        </div>

        {/* Help Text */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Need help?</span> Contact your administrator if you're having trouble accessing your account.
          </p>
        </div>
      </Card>
    </div>
  );
};

export default PasswordResetPage;