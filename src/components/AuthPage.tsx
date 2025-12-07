/**
 * Authentication Page Component
 * Handles login and registration
 */

"use client";

import { useState, useCallback, ChangeEvent, FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import { useChat } from "@/context/ChatContext";
import {
  validateEmail,
  validatePassword,
  validateUsername,
  validateDisplayName,
} from "@/lib/security/input-validation";
import type { AuthPageProps } from "@/types";

interface FormData {
  username: string;
  displayName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  username?: string;
  displayName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  submit?: string;
}

export default function AuthPage(_props: AuthPageProps) {
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [formData, setFormData] = useState<FormData>({
    username: "",
    displayName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [passwordStrength, setPasswordStrength] = useState<string | null>(null);

  const { login, register, error, clearError } = useAuth();
  const { login: chatLogin } = useChat();

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));

      // Clear field error on change
      setErrors((prev) => ({ ...prev, [name]: undefined }));
      clearError();

      // Update password strength
      if (name === "password" && !isLogin) {
        const validation = validatePassword(value);
        setPasswordStrength(validation.strength || null);
      }
    },
    [isLogin, clearError]
  );

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    // Email validation
    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.valid) {
      newErrors.email = emailValidation.error;
    }

    // Password validation
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.valid) {
      newErrors.password = passwordValidation.error;
    }

    // Registration-specific validations
    if (!isLogin) {
      const usernameValidation = validateUsername(formData.username);
      if (!usernameValidation.valid) {
        newErrors.username = usernameValidation.error;
      }

      const displayNameValidation = validateDisplayName(formData.displayName);
      if (!displayNameValidation.valid) {
        newErrors.displayName = displayNameValidation.error;
      }

      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, isLogin]);

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (!validateForm()) {
        return;
      }

      setIsSubmitting(true);

      try {
        if (isLogin) {
          const user = await login({
            email: formData.email,
            password: formData.password,
          });
          await chatLogin(user, formData.password);
        } else {
          const user = await register({
            username: formData.username,
            displayName: formData.displayName,
            email: formData.email,
            password: formData.password,
          });
          await chatLogin(user, formData.password);
        }
      } catch (err) {
        // Error is handled by AuthContext
        console.error("Auth error:", err);
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, isLogin, validateForm, login, register, chatLogin]
  );

  const toggleMode = useCallback(() => {
    setIsLogin(!isLogin);
    setErrors({});
    clearError();
    setPasswordStrength(null);
  }, [isLogin, clearError]);

  return (
    <div className="auth-container">
      <div className="auth-card animate-fadeIn">
        {/* Header */}
        <div className="auth-header">
          <div className="auth-icon">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h1 className="auth-title">SecureChat</h1>
          <p className="auth-subtitle">
            {isLogin
              ? "Sign in to continue to your messages"
              : "Create an account to start messaging securely"}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          {/* Registration Fields */}
          {!isLogin && (
            <>
              <div className="form-group">
                <label htmlFor="username" className="form-label">
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  className={`form-input ${errors.username ? "error" : ""}`}
                  placeholder="johndoe"
                  value={formData.username}
                  onChange={handleInputChange}
                  autoComplete="username"
                />
                {errors.username && (
                  <span className="form-error">{errors.username}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="displayName" className="form-label">
                  Display Name
                </label>
                <input
                  id="displayName"
                  name="displayName"
                  type="text"
                  className={`form-input ${errors.displayName ? "error" : ""}`}
                  placeholder="John Doe"
                  value={formData.displayName}
                  onChange={handleInputChange}
                  autoComplete="name"
                />
                {errors.displayName && (
                  <span className="form-error">{errors.displayName}</span>
                )}
              </div>
            </>
          )}

          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className={`form-input ${errors.email ? "error" : ""}`}
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleInputChange}
              autoComplete="email"
            />
            {errors.email && <span className="form-error">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className={`form-input ${errors.password ? "error" : ""}`}
              placeholder={
                isLogin ? "Enter your password" : "Min. 12 characters"
              }
              value={formData.password}
              onChange={handleInputChange}
              autoComplete={isLogin ? "current-password" : "new-password"}
            />
            {errors.password && (
              <span className="form-error">{errors.password}</span>
            )}

            {/* Password Strength Indicator */}
            {!isLogin && formData.password && (
              <div className="password-strength">
                <div
                  className={`strength-bar ${
                    passwordStrength === "weak" ||
                    passwordStrength === "medium" ||
                    passwordStrength === "strong"
                      ? passwordStrength
                      : ""
                  }`}
                >
                  <div className="strength-fill"></div>
                </div>
                <div
                  className={`strength-bar ${
                    passwordStrength === "medium" ||
                    passwordStrength === "strong"
                      ? passwordStrength
                      : ""
                  }`}
                >
                  <div className="strength-fill"></div>
                </div>
                <div
                  className={`strength-bar ${
                    passwordStrength === "strong" ? "strong" : ""
                  }`}
                >
                  <div className="strength-fill"></div>
                </div>
                <span className="strength-label">
                  {passwordStrength === "strong"
                    ? "Strong"
                    : passwordStrength === "medium"
                    ? "Medium"
                    : "Weak"}
                </span>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          {!isLogin && (
            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                className={`form-input ${
                  errors.confirmPassword ? "error" : ""
                }`}
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                autoComplete="new-password"
              />
              {errors.confirmPassword && (
                <span className="form-error">{errors.confirmPassword}</span>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="form-error-banner animate-fadeIn">{error}</div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="btn-loading">
                <span className="loader-small"></span>
                {isLogin ? "Signing In..." : "Creating Account..."}
              </span>
            ) : isLogin ? (
              "Sign In"
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="auth-toggle">
          {isLogin ? (
            <p>
              Don&apos;t have an account?{" "}
              <button type="button" onClick={toggleMode}>
                Create one
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{" "}
              <button type="button" onClick={toggleMode}>
                Sign in
              </button>
            </p>
          )}
        </div>

        {/* Encryption Badge */}
        <div className="encryption-badge">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span>AES-256 End-to-End Encrypted</span>
        </div>
      </div>
    </div>
  );
}
