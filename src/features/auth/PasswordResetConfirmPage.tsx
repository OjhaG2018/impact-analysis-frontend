import React, { useState, useEffect, FormEvent } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { BarChart3, Lock, Eye, EyeOff, CheckCircle, AlertCircle, Loader2, XCircle, ArrowLeft } from 'lucide-react';
import { Card, Button } from '../../components/ui';
import api from '../../api';

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
}

const PasswordResetConfirmPage: React.FC = () => {
  const { uid, token } = useParams<{ uid: string; token: string }>();
  const navigate = useNavigate();

  const [validating, setValidating] = useState<boolean>(true);
  const [isValid, setIsValid] = useState<boolean>(false);
  const [userInfo, setUserInfo] = useState<{ email: string; username: string } | null>(null);

  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<boolean>(false);

  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      if (!uid || !token) {
        setIsValid(false);
        setValidating(false);
        return;
      }

      try {
        const response = await api.post<{ valid: boolean; email: string; username: string }>(
          '/core/password-reset/validate/',
          { uid, token }
        );
        setIsValid(response.valid);
        if (response.valid) {
          setUserInfo({ email: response.email, username: response.username });
        }
      } catch (err: any) {
        setIsValid(false);
      }
      setValidating(false);
    };

    validateToken();
  }, [uid, token]);

  // Password strength checker
  const getPasswordStrength = (pwd: string): PasswordStrength => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[^a-zA-Z0-9]/.test(pwd)) score++;

    if (score <= 1) return { score, label: 'Weak', color: 'bg-red-500' };
    if (score <= 2) return { score, label: 'Fair', color: 'bg-orange-500' };
    if (score <= 3) return { score, label: 'Good', color: 'bg-yellow-500' };
    if (score <= 4) return { score, label: 'Strong', color: 'bg-emerald-500' };
    return { score, label: 'Very Strong', color: 'bg-emerald-600' };
  };

  const passwordStrength = getPasswordStrength(password);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validations
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      await api.post('/core/password-reset/confirm/', {
        uid,
        token,
        new_password: password,
        confirm_password: confirmPassword,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to reset password');
    }
    setLoading(false);
  };

  // Loading State
  if (validating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-gray-600">Validating reset link...</p>
        </Card>
      </div>
    );
  }

  // Invalid Token State
  if (!isValid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Reset Link</h1>
          <p className="text-gray-600 mb-6">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
          <div className="space-y-3">
            <Link to="/forgot-password">
              <Button className="w-full justify-center">
                Request New Reset Link
              </Button>
            </Link>
            <Link
              to="/login"
              className="block text-center text-gray-600 hover:text-emerald-600 font-medium"
            >
              ← Back to Sign In
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // Success State
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Password Reset Successful!</h1>
          <p className="text-gray-600 mb-6">
            Your password has been successfully reset. You can now sign in with your new password.
          </p>
          <Button
            onClick={() => navigate('/login')}
            className="w-full justify-center"
          >
            Sign In Now
          </Button>
        </Card>
      </div>
    );
  }

  // Reset Form
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <BarChart3 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create New Password</h1>
          {userInfo && (
            <p className="text-gray-500 mt-2">
              For account: <span className="font-medium text-gray-700">{userInfo.email}</span>
            </p>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* New Password */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              New Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder="Enter new password"
                className="w-full pl-10 pr-12 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                required
                autoComplete="new-password"
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            {/* Password Strength Indicator */}
            {password && (
              <div className="mt-2">
                <div className="flex gap-1 mb-1">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div
                      key={level}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        level <= passwordStrength.score ? passwordStrength.color : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <p className={`text-xs ${
                  passwordStrength.score <= 2 ? 'text-red-600' : 
                  passwordStrength.score <= 3 ? 'text-yellow-600' : 'text-emerald-600'
                }`}>
                  Password strength: {passwordStrength.label}
                </p>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Confirm New Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError('');
                }}
                placeholder="Confirm new password"
                className={`
                  w-full pl-10 pr-12 py-3 rounded-lg border transition-colors
                  focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent
                  ${confirmPassword && password !== confirmPassword ? 'border-red-300' : 'border-gray-300'}
                `}
                required
                autoComplete="new-password"
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-red-600 mt-1">Passwords do not match</p>
            )}
            {confirmPassword && password === confirmPassword && confirmPassword.length >= 8 && (
              <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Passwords match
              </p>
            )}
          </div>

          {/* Password Requirements */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Password Requirements:</p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li className={`flex items-center gap-2 ${password.length >= 8 ? 'text-emerald-600' : ''}`}>
                {password.length >= 8 ? <CheckCircle className="w-4 h-4" /> : <span className="w-4 h-4 rounded-full border border-gray-300" />}
                At least 8 characters
              </li>
              <li className={`flex items-center gap-2 ${/[A-Z]/.test(password) && /[a-z]/.test(password) ? 'text-emerald-600' : ''}`}>
                {/[A-Z]/.test(password) && /[a-z]/.test(password) ? <CheckCircle className="w-4 h-4" /> : <span className="w-4 h-4 rounded-full border border-gray-300" />}
                Upper and lowercase letters
              </li>
              <li className={`flex items-center gap-2 ${/\d/.test(password) ? 'text-emerald-600' : ''}`}>
                {/\d/.test(password) ? <CheckCircle className="w-4 h-4" /> : <span className="w-4 h-4 rounded-full border border-gray-300" />}
                At least one number
              </li>
              <li className={`flex items-center gap-2 ${/[^a-zA-Z0-9]/.test(password) ? 'text-emerald-600' : ''}`}>
                {/[^a-zA-Z0-9]/.test(password) ? <CheckCircle className="w-4 h-4" /> : <span className="w-4 h-4 rounded-full border border-gray-300" />}
                Special character (optional)
              </li>
            </ul>
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
            disabled={loading || password.length < 8 || password !== confirmPassword}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Resetting Password...
              </>
            ) : (
              <>
                <Lock className="w-5 h-5 mr-2" />
                Reset Password
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
      </Card>
    </div>
  );
};

export default PasswordResetConfirmPage;