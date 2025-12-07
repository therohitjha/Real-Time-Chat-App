/**
 * Profile Modal Component
 * User profile settings and management
 */

"use client";

import { useState, useCallback, ChangeEvent, FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  validateDisplayName,
  validatePassword,
} from "@/lib/security/input-validation";
import type { ProfileModalProps } from "@/types";

interface Passwords {
  current: string;
  new: string;
  confirm: string;
}

export default function ProfileModal({ onClose }: ProfileModalProps) {
  const { user, updateProfile, changePassword, logout, error, clearError } =
    useAuth();
  const [activeTab, setActiveTab] = useState<
    "profile" | "security" | "privacy"
  >("profile");
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [displayName, setDisplayName] = useState<string>(
    user?.displayName || ""
  );
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [passwords, setPasswords] = useState<Passwords>({
    current: "",
    new: "",
    confirm: "",
  });
  const [passwordStrength, setPasswordStrength] = useState<string | null>(null);

  const handleProfileSave = useCallback(async () => {
    setFormError(null);

    const validation = validateDisplayName(displayName);
    if (!validation.valid) {
      setFormError(validation.error || "Invalid display name");
      return;
    }

    setIsSaving(true);

    try {
      await updateProfile({ displayName: displayName.trim() });
      setIsEditing(false);
      setSuccessMessage("Profile updated successfully");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setIsSaving(false);
    }
  }, [displayName, updateProfile]);

  const handlePasswordChange = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setFormError(null);

      const validation = validatePassword(passwords.new);
      if (!validation.valid) {
        setFormError(validation.error || "Invalid password");
        return;
      }

      if (passwords.new !== passwords.confirm) {
        setFormError("Passwords do not match");
        return;
      }

      setIsSaving(true);

      try {
        await changePassword(passwords.current, passwords.new);
        setPasswords({ current: "", new: "", confirm: "" });
        setPasswordStrength(null);
        setSuccessMessage("Password changed successfully");
        setTimeout(() => setSuccessMessage(null), 3000);
      } catch (err) {
        setFormError(
          err instanceof Error ? err.message : "Password change failed"
        );
      } finally {
        setIsSaving(false);
      }
    },
    [passwords, changePassword]
  );

  const handlePasswordInputChange = useCallback(
    (field: keyof Passwords, value: string) => {
      setPasswords((prev) => ({ ...prev, [field]: value }));

      if (field === "new") {
        const validation = validatePassword(value);
        setPasswordStrength(validation.strength || null);
      }
    },
    []
  );

  const getInitials = (name: string | undefined): string => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const handleTabChange = useCallback(
    (tab: "profile" | "security" | "privacy") => {
      setActiveTab(tab);
      clearError();
      setFormError(null);
    },
    [clearError]
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "500px" }}
      >
        <div className="modal-header">
          <h3 className="modal-title">Settings</h3>
          <button className="modal-close icon-btn" onClick={onClose}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid var(--border-primary)",
            padding: "0 var(--spacing-lg)",
          }}
        >
          {(["profile", "security", "privacy"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              style={{
                padding: "var(--spacing-md)",
                color:
                  activeTab === tab
                    ? "var(--accent-primary)"
                    : "var(--text-secondary)",
                borderBottom:
                  activeTab === tab
                    ? "2px solid var(--accent-primary)"
                    : "none",
                marginBottom: "-1px",
                textTransform: "capitalize",
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="modal-body">
          {/* Success Message */}
          {successMessage && (
            <div
              className="animate-fadeIn"
              style={{
                padding: "var(--spacing-md)",
                background: "rgba(37, 211, 102, 0.1)",
                borderRadius: "var(--radius-md)",
                marginBottom: "var(--spacing-md)",
                color: "var(--text-success)",
                fontSize: "0.875rem",
                display: "flex",
                alignItems: "center",
                gap: "var(--spacing-sm)",
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              {successMessage}
            </div>
          )}

          {/* Error Message */}
          {(formError || error) && (
            <div
              className="animate-fadeIn"
              style={{
                padding: "var(--spacing-md)",
                background: "rgba(241, 92, 109, 0.1)",
                borderRadius: "var(--radius-md)",
                marginBottom: "var(--spacing-md)",
                color: "var(--text-error)",
                fontSize: "0.875rem",
              }}
            >
              {formError || error}
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === "profile" && (
            <div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  marginBottom: "var(--spacing-xl)",
                }}
              >
                <div
                  className="avatar"
                  style={{
                    width: "100px",
                    height: "100px",
                    fontSize: "2.5rem",
                    marginBottom: "var(--spacing-md)",
                  }}
                >
                  {getInitials(user?.displayName)}
                </div>
                <button
                  className="btn btn-secondary"
                  style={{ fontSize: "0.875rem" }}
                >
                  Change Avatar
                </button>
              </div>

              <div className="form-group">
                <label className="form-label">Display Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    className="form-input"
                    value={displayName}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setDisplayName(e.target.value)
                    }
                    autoFocus
                  />
                ) : (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "var(--spacing-md)",
                      background: "var(--bg-input)",
                      borderRadius: "var(--radius-md)",
                    }}
                  >
                    <span>{user?.displayName}</span>
                    <button
                      className="icon-btn"
                      onClick={() => setIsEditing(true)}
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              {isEditing && (
                <div
                  style={{
                    display: "flex",
                    gap: "var(--spacing-sm)",
                    marginTop: "var(--spacing-md)",
                  }}
                >
                  <button
                    className="btn btn-primary"
                    onClick={handleProfileSave}
                    disabled={isSaving}
                  >
                    {isSaving ? "Saving..." : "Save"}
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setIsEditing(false);
                      setDisplayName(user?.displayName || "");
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}

              <div
                className="form-group"
                style={{ marginTop: "var(--spacing-lg)" }}
              >
                <label className="form-label">Email</label>
                <div
                  style={{
                    padding: "var(--spacing-md)",
                    background: "var(--bg-input)",
                    borderRadius: "var(--radius-md)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {user?.email}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Username</label>
                <div
                  style={{
                    padding: "var(--spacing-md)",
                    background: "var(--bg-input)",
                    borderRadius: "var(--radius-md)",
                    color: "var(--text-secondary)",
                  }}
                >
                  @{user?.username}
                </div>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === "security" && (
            <div>
              <h4 style={{ marginBottom: "var(--spacing-md)" }}>
                Change Password
              </h4>
              <p
                style={{
                  color: "var(--text-secondary)",
                  fontSize: "0.875rem",
                  marginBottom: "var(--spacing-lg)",
                }}
              >
                Your password encrypts your messages locally. Choose a strong,
                unique password.
              </p>

              <form onSubmit={handlePasswordChange}>
                <div className="form-group">
                  <label className="form-label">Current Password</label>
                  <input
                    type="password"
                    className="form-input"
                    value={passwords.current}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      handlePasswordInputChange("current", e.target.value)
                    }
                    autoComplete="current-password"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <input
                    type="password"
                    className="form-input"
                    value={passwords.new}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      handlePasswordInputChange("new", e.target.value)
                    }
                    autoComplete="new-password"
                  />
                  {passwords.new && (
                    <div
                      className="password-strength"
                      style={{ marginTop: "var(--spacing-sm)" }}
                    >
                      <div
                        className={`strength-bar ${passwordStrength || "weak"}`}
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
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Confirm New Password</label>
                  <input
                    type="password"
                    className="form-input"
                    value={passwords.confirm}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      handlePasswordInputChange("confirm", e.target.value)
                    }
                    autoComplete="new-password"
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={
                    isSaving ||
                    !passwords.current ||
                    !passwords.new ||
                    !passwords.confirm
                  }
                >
                  {isSaving ? "Changing..." : "Change Password"}
                </button>
              </form>

              <div
                style={{
                  marginTop: "var(--spacing-xl)",
                  paddingTop: "var(--spacing-xl)",
                  borderTop: "1px solid var(--border-primary)",
                }}
              >
                <h4
                  style={{
                    marginBottom: "var(--spacing-md)",
                    color: "var(--text-error)",
                  }}
                >
                  Danger Zone
                </h4>
                <button
                  className="btn"
                  onClick={logout}
                  style={{ background: "var(--text-error)", color: "white" }}
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}

          {/* Privacy Tab */}
          {activeTab === "privacy" && (
            <div>
              <div
                style={{
                  padding: "var(--spacing-lg)",
                  background: "rgba(0, 168, 132, 0.1)",
                  borderRadius: "var(--radius-md)",
                  marginBottom: "var(--spacing-lg)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--spacing-md)",
                    marginBottom: "var(--spacing-md)",
                  }}
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--accent-primary)"
                    strokeWidth="2"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <strong>End-to-End Encryption</strong>
                </div>
                <p
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: "0.875rem",
                  }}
                >
                  All your messages are encrypted using AES-256-GCM encryption
                  with ECDH key exchange. Only you and your recipients can read
                  your messages.
                </p>
              </div>

              <h4 style={{ marginBottom: "var(--spacing-md)" }}>
                Privacy Features
              </h4>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--spacing-md)",
                }}
              >
                {[
                  {
                    name: "Read Receipts",
                    desc: "Let others know when you've read their messages",
                  },
                  { name: "Online Status", desc: "Show when you're online" },
                  { name: "Typing Indicator", desc: "Show when you're typing" },
                ].map((setting) => (
                  <div
                    key={setting.name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "var(--spacing-md)",
                      background: "var(--bg-input)",
                      borderRadius: "var(--radius-md)",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 500 }}>{setting.name}</div>
                      <div
                        style={{
                          fontSize: "0.875rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {setting.desc}
                      </div>
                    </div>
                    <label className="toggle">
                      <input type="checkbox" defaultChecked />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .toggle {
          position: relative;
          display: inline-block;
          width: 48px;
          height: 26px;
        }
        .toggle input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        .toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: var(--bg-tertiary);
          transition: 0.3s;
          border-radius: 26px;
        }
        .toggle-slider:before {
          position: absolute;
          content: "";
          height: 20px;
          width: 20px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: 0.3s;
          border-radius: 50%;
        }
        .toggle input:checked + .toggle-slider {
          background-color: var(--accent-primary);
        }
        .toggle input:checked + .toggle-slider:before {
          transform: translateX(22px);
        }
      `}</style>
    </div>
  );
}
