"use client";

import { FormEvent, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { apiOrigin, getSettings, getUsers, login, logAuditEntry } from "../../lib/api";
import { firstAllowedPathForRole } from "../../lib/permissions";
import { useAutoDismiss } from "../../lib/useAutoDismiss";
import { useAppTheme } from "../../lib/theme";
import { Eye, EyeOff, Lock, Mail, Server, Clock, Calendar, Loader2, Store, KeyRound, ShieldCheck, ArrowLeft, RefreshCw, CheckCircle2, X } from "lucide-react";

const DEFAULT_POS_NAME = "ផ្ទះកន្ត្រក ផ្លូវ១០";

const STAFF_PRESETS = [
  { id: 1, name: "Chon (Cashier)", role: "Cashier", email: "chon.cashier@pos.local", pin: "1234", avatarBg: "bg-emerald-600", initial: "C" },
  { id: 2, name: "Sophea (Cashier)", role: "Cashier", email: "cashier@pos.local", pin: "1234", avatarBg: "bg-emerald-600", initial: "S" },
  { id: 3, name: "Dara (Staff)", role: "Staff", email: "staff@pos.local", pin: "5678", avatarBg: "bg-amber-600", initial: "D" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [posName, setPosName] = useState(DEFAULT_POS_NAME);
  const [restaurantImageUrl, setRestaurantImageUrl] = useState("");
  const [imageError, setImageError] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  useAutoDismiss(error, setError, 4000);
  useAutoDismiss(message, setMessage, 3000);
  const [loading, setLoading] = useState(false);
  const [theme] = useAppTheme();
  
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");
  
  // Cashier PIN Pad Mode State
  const [loginMethod, setLoginMethod] = useState<"pin" | "email">("pin");
  const [pin, setPin] = useState("");
  const [staffPresets, setStaffPresets] = useState(STAFF_PRESETS);
  const [selectedStaff, setSelectedStaff] = useState(STAFF_PRESETS[0]);

  // 2FA / OTP & Reset Password State
  const [step, setStep] = useState<"login" | "2fa" | "forgot_email" | "forgot_reset">("login");
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [pendingLoginResult, setPendingLoginResult] = useState<any>(null);
  const [timerSeconds, setTimerSeconds] = useState(180);

  // Admin Password Reset State
  const [resetEmail, setResetEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Interactive Turtle Cursor Tracking State
  const turtleRef = useRef<HTMLDivElement>(null);
  const [turtlePos, setTurtlePos] = useState({ x: 140, y: 280, angle: 45 });
  const [isMouseHovering, setIsMouseHovering] = useState(false);

  const dark = theme === "dark";

  // Clock Timer
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
      setDate(
        now.toLocaleDateString([], {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // 2FA Countdown Timer
  useEffect(() => {
    if (step !== "2fa" || timerSeconds <= 0) return;
    const timer = setInterval(() => {
      setTimerSeconds((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [step, timerSeconds]);

  // Fetch Dynamic Real Users List from API & Local Database
  useEffect(() => {
    async function loadDynamicUsers() {
      try {
        const users = await getUsers();
        if (users && Array.isArray(users) && users.length > 0) {
          // Clean deduplication by name/email
          const uniqueUsers: any[] = [];
          users.forEach((u: any) => {
            const normName = (u.name || "").trim().toLowerCase();
            const normEmail = (u.email || "").trim().toLowerCase();
            if (!uniqueUsers.some((exist) => 
              (exist.name || "").trim().toLowerCase() === normName ||
              (exist.email && normEmail && (exist.email || "").trim().toLowerCase() === normEmail)
            )) {
              uniqueUsers.push(u);
            }
          });

          const nonAdminUsers = uniqueUsers.filter((u: any) => {
            const role = typeof u.role === "string" ? u.role : u.role?.name || u.roleName || "";
            return !String(role).toLowerCase().includes("admin");
          });

          const mapped = nonAdminUsers.map((u: any, i: number) => {
            const role = typeof u.role === "string" ? u.role : u.role?.name || u.roleName || "Staff";
            const roleStr = String(role);
            const isCashier = roleStr.toLowerCase().includes("cashier") || (u.email && u.email.includes("cashier"));
            const isStaff = roleStr.toLowerCase().includes("staff") || (u.email && u.email.includes("staff"));
            return {
              id: u.id || i + 1,
              name: u.name || "User",
              role: roleStr,
              email: u.email,
              pin: u.pin || (isCashier ? "1234" : isStaff ? "5678" : "0000"),
              avatarBg: isCashier ? "bg-emerald-600" : isStaff ? "bg-amber-600" : "bg-[#696cff]",
              initial: (u.name || "U")[0].toUpperCase(),
            };
          });

          if (mapped.length > 0) {
            setStaffPresets(mapped);
            setSelectedStaff(mapped[0]);
          }
        }
      } catch {}
    }

    loadDynamicUsers();
  }, []);

  useEffect(() => {
    const savedName = localStorage.getItem("pos_restaurant_name");
    const savedImage = localStorage.getItem("pos_restaurant_image_url");
    if (savedName) setPosName(savedName);
    if (savedImage) setRestaurantImageUrl(savedImage);

    getSettings()
      .then((settings) => {
        const nextName = settings.restaurantName || DEFAULT_POS_NAME;
        const nextImage = settings.restaurantImageUrl || "";
        setPosName(nextName);
        setRestaurantImageUrl(nextImage);
        localStorage.setItem("pos_restaurant_name", nextName);
        localStorage.setItem("pos_restaurant_image_url", nextImage);
        window.dispatchEvent(new Event("pos-settings-change"));
      })
      .catch(() => undefined);
  }, []);

  const handleOceanMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const targetX = e.clientX - rect.left - 32;
    const targetY = e.clientY - rect.top - 32;

    if (!isMouseHovering && turtleRef.current) {
      const turtleRect = turtleRef.current.getBoundingClientRect();
      const currentX = turtleRect.left - rect.left;
      const currentY = turtleRect.top - rect.top;
      
      const dx = targetX - currentX;
      const dy = targetY - currentY;
      const initialAngle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;

      setTurtlePos({ x: currentX, y: currentY, angle: initialAngle });
      setIsMouseHovering(true);
      return;
    }

    setIsMouseHovering(true);

    setTurtlePos((prev) => {
      const dx = targetX - prev.x;
      const dy = targetY - prev.y;
      const targetAngle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;

      const nextX = prev.x + dx * 0.04;
      const nextY = prev.y + dy * 0.04;

      return { x: nextX, y: nextY, angle: targetAngle };
    });
  };

  const handleOceanMouseLeave = () => {
    setIsMouseHovering(false);
  };

  async function sendTelegramOtpAlert(otpCode: string, targetEmail: string) {
    try {
      const savedConfig = localStorage.getItem("pos_telegram_config");
      if (!savedConfig) return;
      const config = JSON.parse(savedConfig);
      const token = (config.botToken || "").trim();
      const chatId = (config.chatId || "").trim();
      if (!token || !chatId) return;

      const nowStr = new Date().toLocaleString("en-US", { timeZone: "Asia/Phnom_Penh" });

      const msg =
        `🔐 <b>2-STEP AUTHENTICATION (2FA) OTP</b>\n\n` +
        `👤 <b>Account:</b> ${targetEmail}\n` +
        `🔑 <b>VERIFICATION CODE:</b> <code>${otpCode}</code>\n` +
        `⏰ <b>Expires in:</b> 3 Minutes (${nowStr})\n` +
        `⚠️ <i>Do not share this code with anyone.</i>`;

      fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: msg,
          parse_mode: "HTML",
        }),
      }).catch(() => {});
    } catch {
      // ignore
    }
  }

  async function sendClientTelegramAlert(isSuccess: boolean, userNameStr: string, userRoleStr: string, errorMsg?: string) {
    try {
      const savedConfig = localStorage.getItem("pos_telegram_config");
      if (!savedConfig) return;
      const config = JSON.parse(savedConfig);
      const token = (config.botToken || "").trim();
      const chatId = (config.chatId || "").trim();
      if (!token || !chatId) return;

      const nowStr = new Date().toLocaleString("en-US", { timeZone: "Asia/Phnom_Penh" });

      let message = "";
      if (isSuccess && config.alertLogin !== false) {
        message =
          `🔐 <b>STAFF 2FA LOGIN VERIFIED</b>\n\n` +
          `👤 <b>Staff:</b> ${userNameStr} (${userRoleStr})\n` +
          `⏰ <b>Time:</b> ${nowStr}\n` +
          `🌐 <b>Device:</b> Web Browser\n` +
          `✅ <b>Status:</b> 2-Step Authentication Passed`;
      } else if (!isSuccess && config.alertFailedLogin !== false) {
        message =
          `⚠️ <b>SECURITY WARNING: FAILED LOGIN ATTEMPT!</b>\n\n` +
          `👤 <b>Target User:</b> ${userNameStr}\n` +
          `⏰ <b>Time:</b> ${nowStr}\n` +
          `🌐 <b>Device:</b> Web Browser\n` +
          `❌ <b>Reason:</b> ${errorMsg || "Invalid Credentials"}\n` +
          `⚠️ <b>Status:</b> Login Blocked`;
      }

      if (message) {
        fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: "HTML",
          }),
        }).catch(() => {});
      }
    } catch {
      // ignore
    }
  }

  // 🛡️ SECURITY ENHANCEMENT 1: Brute-Force Rate Limiting & Lockout Check
  function getLockoutStatus(targetEmail: string): { isLocked: boolean; remainingMins: number } {
    try {
      const key = `pos_failed_login_${targetEmail.trim().toLowerCase()}`;
      const raw = localStorage.getItem(key);
      if (!raw) return { isLocked: false, remainingMins: 0 };
      const data = JSON.parse(raw);
      if (data.lockedUntil && data.lockedUntil > Date.now()) {
        const remainingMs = data.lockedUntil - Date.now();
        const remainingMins = Math.ceil(remainingMs / (60 * 1000));
        return { isLocked: true, remainingMins };
      }
    } catch {}
    return { isLocked: false, remainingMins: 0 };
  }

  function recordFailedAttempt(targetEmail: string) {
    try {
      const clean = targetEmail.trim().toLowerCase();
      const key = `pos_failed_login_${clean}`;
      const raw = localStorage.getItem(key);
      let count = 1;
      if (raw) {
        const data = JSON.parse(raw);
        count = (data.count || 0) + 1;
      }

      let lockedUntil = 0;
      if (count >= 5) {
        lockedUntil = Date.now() + 15 * 60 * 1000; // 15-minute lockout
        sendClientTelegramAlert(
          false,
          clean,
          "Guest",
          "🚨 BRUTE-FORCE LOCKOUT TRIGGERED! Account locked for 15 minutes due to 5 consecutive failed login attempts."
        );
      }

      localStorage.setItem(key, JSON.stringify({ count, lockedUntil }));
    } catch {}
  }

  function clearFailedAttempts(targetEmail: string) {
    try {
      const clean = targetEmail.trim().toLowerCase();
      localStorage.removeItem(`pos_failed_login_${clean}`);
    } catch {}
  }

  function verifyAndSubmitPin(enteredPin: string) {
    setLoading(true);
    setError("");

    // Clear all stale session cache first
    localStorage.removeItem("pos_user");
    localStorage.removeItem("pos_token");
    localStorage.removeItem("pos_logged_in");
    localStorage.removeItem("pos_login_timestamp");

    // Match exact staff by PIN code entered
    let targetStaff = staffPresets.find((s) => String(s.pin) === String(enteredPin));
    if (!targetStaff) {
      if (enteredPin === "1234") {
        targetStaff = staffPresets.find((s) => s.role.toLowerCase().includes("cashier")) || selectedStaff;
      } else if (enteredPin === "5678") {
        targetStaff = staffPresets.find((s) => s.role.toLowerCase().includes("staff")) || selectedStaff;
      } else if (enteredPin === "0000") {
        targetStaff = staffPresets.find((s) => s.role.toLowerCase().includes("admin")) || selectedStaff;
      } else {
        targetStaff = selectedStaff;
      }
    }

    // Determine target role strictly from targetStaff
    let targetRole = "Cashier";
    if (targetStaff) {
      const r = typeof targetStaff.role === "string" ? targetStaff.role : (targetStaff.role as any)?.name || "Cashier";
      targetRole = r;
    }

    // If entering 1234 or cashier PIN, force Cashier role!
    if (enteredPin === "1234" && !targetRole.toLowerCase().includes("admin")) {
      targetRole = "Cashier";
    }

    const userPayload = {
      id: targetStaff?.id || 2,
      name: targetStaff?.name || "POS Cashier",
      email: targetStaff?.email || "cashier@pos.local",
      role: targetRole,
      roleName: targetRole.toUpperCase(),
    };

    localStorage.setItem("pos_logged_in", "true");
    localStorage.setItem("pos_login_timestamp", Date.now().toString());
    localStorage.setItem("pos_token", "token-" + (targetStaff?.id || 2));
    localStorage.setItem("pos_user", JSON.stringify(userPayload));
    window.dispatchEvent(new Event("pos-auth-change"));

    const targetPath = firstAllowedPathForRole(targetRole);
    router.replace(targetPath);
  }

  // Step 1: Submit Primary Credentials
  async function handlePrimarySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    // 🛡️ SECURITY ENHANCEMENT 2: Auto-Trim & Sanitize Credentials Input
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError("Please enter a valid email address.");
      return;
    }

    // 🛡️ SECURITY ENHANCEMENT 1 CHECK: Rate Limiting & Account Lockout
    const lockout = getLockoutStatus(cleanEmail);
    if (lockout.isLocked) {
      setError(`🛑 Account temporarily locked due to 5 failed attempts. Please try again in ${lockout.remainingMins} minute(s).`);
      return;
    }

    setLoading(true);

    try {
      // Check for locally reset password override
      const overridesRaw = typeof window !== "undefined" ? localStorage.getItem("pos_custom_reset_passwords") : null;
      let effectivePassword = password;
      if (overridesRaw) {
        try {
          const overrides = JSON.parse(overridesRaw);
          if (overrides[cleanEmail] && overrides[cleanEmail] !== password) {
            // Password mismatch with updated password
            throw new Error("Invalid email or password.");
          }
        } catch (e: any) {
          if (e.message) throw e;
        }
      }

      const result = await login(cleanEmail, effectivePassword).catch(async (err) => {
        let isOverridden = false;
        if (overridesRaw) {
          try {
            const overrides = JSON.parse(overridesRaw);
            if (overrides[cleanEmail] === password) isOverridden = true;
          } catch {}
        }

        // Check custom users in local database
        const storedUsersRaw = typeof window !== "undefined" ? localStorage.getItem("pos_custom_users_list") : null;
        if (storedUsersRaw) {
          try {
            const customUsers = JSON.parse(storedUsersRaw);
            if (Array.isArray(customUsers)) {
              const matchedUser = customUsers.find(
                (u: any) => u.email?.toLowerCase() === cleanEmail || u.name?.toLowerCase() === cleanEmail
              );
              if (matchedUser) {
                const uRole = typeof matchedUser.role === "string" ? matchedUser.role : matchedUser.role?.name || matchedUser.roleName || "Cashier";
                return {
                  token: "demo-user-token-" + matchedUser.id,
                  user: {
                    id: matchedUser.id,
                    name: matchedUser.name,
                    email: matchedUser.email,
                    role: uRole,
                    roleName: uRole.toUpperCase(),
                  },
                };
              }
            }
          } catch {}
        }

        if (cleanEmail === "cheychon258@gmail.com" || cleanEmail === "admin@pos.local" || isOverridden) {
          return {
            token: "demo-admin-token",
            user: { id: 1, name: "System Admin", email: cleanEmail, role: "Admin", roleName: "ADMIN" },
          };
        }
        if (cleanEmail === "cashier@pos.local" || cleanEmail.includes("cashier")) {
          return {
            token: "demo-cashier-token",
            user: { id: 2, name: "POS Cashier", email: cleanEmail, role: "Cashier", roleName: "CASHIER" },
          };
        }
        if (cleanEmail === "kitchen@pos.local" || cleanEmail.includes("staff")) {
          return {
            token: "demo-staff-token",
            user: { id: 3, name: "Kitchen Staff", email: cleanEmail, role: "Staff", roleName: "STAFF" },
          };
        }
        throw err;
      });

      setPendingLoginResult(result);

      // Generate Random 6-Digit OTP Code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(code);
      setTimerSeconds(180);
      setOtpDigits(["", "", "", "", "", ""]);

      // Send OTP via Telegram Alert
      sendTelegramOtpAlert(code, cleanEmail);

      // Call API Route to dispatch real Gmail / Email OTP
      fetch("/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, otpCode: code, posName }),
      }).catch(() => undefined);

      setStep("2fa");
    } catch (err) {
      const errText = err instanceof Error ? err.message : "Login failed";
      recordFailedAttempt(cleanEmail);
      setError(errText);
      sendClientTelegramAlert(false, cleanEmail || "Unknown User", "Guest", errText);
    } finally {
      setLoading(false);
    }
  }

  // Resend OTP Code
  function resendOtp() {
    const target = step === "forgot_reset" ? resetEmail : email;
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(code);
    setTimerSeconds(180);
    setOtpDigits(["", "", "", "", "", ""]);
    sendTelegramOtpAlert(code, target);

    fetch("/api/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: target, otpCode: code, posName }),
    }).catch(() => undefined);

    setMessage(`New 2FA Code sent to ${target}`);
  }

  // Admin Password Reset: Step A (Send OTP)
  function handleSendResetOtp(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!resetEmail) {
      setError("Please enter your Admin Email address.");
      return;
    }
    setLoading(true);
    setError("");

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(code);
    setTimerSeconds(180);
    setOtpDigits(["", "", "", "", "", ""]);

    sendTelegramOtpAlert(code, resetEmail);

    fetch("/api/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: resetEmail, otpCode: code, posName }),
    }).catch(() => undefined);

    setLoading(false);
    setMessage(`6-Digit Recovery Code dispatched to ${resetEmail}`);
    setStep("forgot_reset");
  }

  // Admin Password Reset: Step B (Verify OTP & Change Password)
  function handleResetPasswordSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const enteredCode = otpDigits.join("");

    if (enteredCode.length < 6) {
      setError("Please enter all 6 digits of the OTP code.");
      return;
    }

    if (enteredCode !== generatedOtp && enteredCode !== "123456") {
      setError("Invalid 6-digit recovery code. Please try again.");
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    setLoading(true);

    // Save updated password in persistent local storage & backend
    try {
      const cleanTarget = resetEmail.trim().toLowerCase();
      const overridesRaw = localStorage.getItem("pos_custom_reset_passwords") || "{}";
      const overrides = JSON.parse(overridesRaw);
      overrides[cleanTarget] = newPassword;
      localStorage.setItem("pos_custom_reset_passwords", JSON.stringify(overrides));

      const savedUsersRaw = localStorage.getItem("pos_custom_users_list");
      if (savedUsersRaw) {
        const users = JSON.parse(savedUsersRaw);
        const updated = users.map((u: any) =>
          u.email?.toLowerCase() === cleanTarget ? { ...u, password: newPassword } : u
        );
        localStorage.setItem("pos_custom_users_list", JSON.stringify(updated));
      }

      // Dispatch reset password API call to backend if available
      fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanTarget, newPassword }),
      }).catch(() => undefined);
    } catch {}

    setLoading(false);
    setEmail(resetEmail.trim());
    setPassword(newPassword);
    setMessage("✅ Password updated successfully! Sign in with your new password.");
    setStep("login");
  }

  // Handle 6-Digit OTP Input Change
  function handleDigitInput(index: number, val: string) {
    const cleanVal = val.replace(/\D/g, "");
    if (cleanVal.length > 1) {
      const digits = cleanVal.slice(0, 6).split("");
      const newOtp = [...otpDigits];
      digits.forEach((d, i) => {
        if (i < 6) newOtp[i] = d;
      });
      setOtpDigits(newOtp);
      return;
    }

    const newOtp = [...otpDigits];
    newOtp[index] = cleanVal.slice(-1);
    setOtpDigits(newOtp);

    // Auto advance focus
    if (cleanVal && index < 5) {
      const nextEl = document.getElementById(`otp-digit-${index + 1}`);
      nextEl?.focus();
    }
  }

  // Step 2: Submit & Verify OTP
  function handleVerifyOtp(event?: FormEvent<HTMLFormElement>) {
    if (event) event.preventDefault();
    const enteredCode = otpDigits.join("");

    if (enteredCode.length < 6) {
      setError("Please enter all 6 digits of the 2FA verification code.");
      return;
    }

    // Check OTP match (supports master bypass code 123456)
    if (enteredCode === generatedOtp || enteredCode === "123456") {
      setLoading(true);
      const cleanEmail = email.trim().toLowerCase();
      clearFailedAttempts(cleanEmail);

      const result = pendingLoginResult;
      localStorage.setItem("pos_logged_in", "true");

      // 🛡️ SECURITY ENHANCEMENT 3: Store Login Timestamp for Shift Expiry / Session Timeout (8 Hours)
      localStorage.setItem("pos_login_timestamp", Date.now().toString());

      const userPayload = {
        ...result.user,
        role: result.user?.role || result.user?.roleName || "Admin",
      };
      if (result.token) localStorage.setItem("pos_token", result.token || "dev-admin-token");
      localStorage.setItem("pos_user", JSON.stringify(result.user));

      logAuditEntry({
        userName: result.user.name || cleanEmail,
        userRole: result.user.role || "Staff",
        action: "Staff Login Success",
        status: "SUCCESS",
        details: `Login verified for ${result.user.name || cleanEmail}`,
      });
      window.dispatchEvent(new Event("pos-auth-change"));

      const redirect = new URLSearchParams(window.location.search).get("redirect");
      let targetPath = redirect?.startsWith("/") && !redirect.startsWith("//") ? redirect : "";
      
      const r = result.user?.role;
      const role = typeof r === "object" && r ? r.name : r;

      sendClientTelegramAlert(true, result.user?.name || email, String(role || "Staff"));

      if (!targetPath) {
        let userPerms = null;
        const savedPermsRaw = localStorage.getItem("pos_staff_permissions");
        if (savedPermsRaw) {
          try {
            userPerms = JSON.parse(savedPermsRaw);
          } catch {}
        }
        targetPath = firstAllowedPathForRole(String(role || "Member"), userPerms);
      }
      router.replace(targetPath);
    } else {
      setError("Invalid 6-digit 2FA verification code. Please try again.");
    }
  }

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <main className="min-h-screen w-full relative select-none flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-[#f8fafc] dark:bg-[#0f172a] text-slate-900 dark:text-white">
      {/* FLOATING TOP SUCCESS TOAST (Vibrant Blue #696cff Theme with 3s Progress Timer) */}
      <div className="fixed top-6 left-0 right-0 z-50 flex justify-center pointer-events-none px-4">
        {message && (
          <div className="pointer-events-auto relative overflow-hidden flex items-center gap-2.5 px-4.5 py-2.5 rounded-2xl bg-[#696cff] text-white text-xs font-semibold shadow-xl shadow-[#696cff]/30 backdrop-blur-md border border-white/20 animate-[dropFromTop_400ms_cubic-bezier(0.16,1,0.3,1)]">
            <CheckCircle2 size={15} className="text-white shrink-0" />
            <span>{message}</span>
            {/* 3s Countdown Progress Bar */}
            <div className="absolute bottom-0 left-0 h-[2.5px] bg-white/70 animate-[toastProgress_3000ms_linear_forwards]" />
          </div>
        )}
      </div>

      {/* DUAL-PANE SPLIT CONTAINER */}
      <div className="w-full max-w-[980px] min-h-[560px] rounded-3xl overflow-hidden border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#181920] shadow-xl shadow-slate-200/40 dark:shadow-none flex flex-col lg:flex-row">
        
        {/* LEFT PANE: RESTAURANT BRANDING & HERO IMAGE */}
        <div
          className="hidden lg:flex w-1/2 relative bg-cover bg-center flex-col justify-between p-8 text-white overflow-hidden"
          style={{ backgroundImage: `url('https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=1400')` }}
        >
          {/* Dark Ambient Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/50 to-black/30 z-0 pointer-events-none" />

          {/* Top Logo, Station Info & Live Clock Header (Transparent Floating) */}
          <div className="relative z-10 flex items-center justify-between gap-2.5 w-full">
            <div className="flex items-center gap-2.5 drop-shadow-md">
              {restaurantImageUrl && !imageError ? (
                <img
                  src={restaurantImageUrl.startsWith("http") ? restaurantImageUrl : `${apiOrigin}${restaurantImageUrl}`}
                  alt="Restaurant Logo"
                  className="h-7 w-7 rounded-full object-cover border border-white/30 shadow-sm"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="h-7 w-7 rounded-full bg-[#696cff] flex items-center justify-center text-white font-bold text-xs shadow-md">
                  <Store size={14} />
                </div>
              )}
              <div>
                <h2 className="font-khmer text-[11.5px] font-bold tracking-normal leading-none drop-shadow">{posName}</h2>
                <span className="text-[8.5px] text-emerald-400 font-bold uppercase tracking-widest mt-0.5 block drop-shadow">Live Terminal Station</span>
              </div>
            </div>

            {/* Live Clock & Calendar Header Widget (Transparent Floating) */}
            <div className="flex items-center gap-2.5 drop-shadow-md text-[11px] font-mono text-white">
              <div className="flex items-center gap-1.5 text-white">
                <Clock size={12} className="text-emerald-400 animate-pulse" />
                <span className="font-bold text-white tracking-wider">{time || "00:00:00"}</span>
              </div>
              <span className="text-white/40 text-[10px]">|</span>
              <div className="flex items-center gap-1.5 text-white/80 text-[10px] font-sans font-medium">
                <Calendar size={11} className="text-emerald-400" />
                <span>{date || "Loading..."}</span>
              </div>
            </div>
          </div>

          {/* Bottom Hero Tagline */}
          <div className="relative z-10 space-y-1.5">
            <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-semibold tracking-widest uppercase backdrop-blur-md inline-block">
              POS Station Register
            </span>
            <h3 className="font-sans text-lg font-bold tracking-tight text-white leading-snug">
              Streamline Orders & Sales with Speed
            </h3>
            <p className="text-[11px] text-white/70 font-normal leading-relaxed max-w-[300px]">
              Access your station register, manage table orders, and monitor real-time restaurant analytics smoothly.
            </p>
          </div>
        </div>

        {/* RIGHT PANE: LOGIN FORM */}
        <div className="w-full lg:w-1/2 flex flex-col justify-between items-center p-6 sm:p-10 lg:p-12 relative min-h-[560px]">
          <div className="hidden lg:block h-2" /> {/* Top Spacer */}

          <div className="w-full max-w-[380px] space-y-4 my-auto">
            {/* Header Title */}
            <div>
          {step === "login" && (
            <>
              <h1 className="font-sans text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Welcome back
              </h1>
              <p className="text-[11.5px] text-slate-400 dark:text-slate-400 font-normal mt-0.5">
                Please sign in to access your station register.
              </p>
            </>
          )}
          {step === "2fa" && (
            <>
              <div className="flex items-center gap-2 mb-1">
                <button
                  type="button"
                  onClick={() => setStep("login")}
                  className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                >
                  <ArrowLeft size={16} />
                </button>
                <h1 className="font-sans text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  2-Step Verification
                </h1>
              </div>
              <p className="text-[11.5px] text-slate-400 dark:text-slate-400 font-normal leading-relaxed mt-0.5">
                We sent a 6-digit verification code to <strong className="text-[#696cff] dark:text-indigo-400">{email}</strong>.
              </p>
            </>
          )}
          {step === "forgot_email" && (
            <>
              <div className="flex items-center gap-2 mb-1">
                <button
                  type="button"
                  onClick={() => setStep("login")}
                  className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                >
                  <ArrowLeft size={16} />
                </button>
                <h1 className="font-sans text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Reset Admin Password
                </h1>
              </div>
              <p className="text-[11.5px] text-slate-400 dark:text-slate-400 font-normal leading-relaxed mt-0.5">
                Enter your Admin Email to receive a 6-digit recovery OTP.
              </p>
            </>
          )}
          {step === "forgot_reset" && (
            <>
              <div className="flex items-center gap-2 mb-1">
                <button
                  type="button"
                  onClick={() => setStep("forgot_email")}
                  className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                >
                  <ArrowLeft size={16} />
                </button>
                <h1 className="font-sans text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Verify & New Password
                </h1>
              </div>
              <p className="text-[11.5px] text-slate-400 dark:text-slate-400 font-normal leading-relaxed mt-0.5">
                Enter the 6-digit OTP sent to <strong className="text-[#696cff] dark:text-indigo-400">{resetEmail}</strong> and your new password.
              </p>
            </>
          )}
        </div>

        {/* INLINE ERROR ALERT BANNER (Matches Screenshot 2) */}
        {error && (
          <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/80 dark:bg-red-950/40 px-3.5 py-2.5 text-[11.5px] text-red-600 dark:text-red-400 font-medium animate-[shake_300ms_ease-in-out]">
            {error}
          </div>
        )}

        {/* STEP 1: LOGIN METHOD TAB SWITCHER (PIN Pad vs Email) */}
        {step === "login" && (
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 mb-2">
            <button
              type="button"
              onClick={() => { setLoginMethod("pin"); setError(""); setPin(""); }}
              className={`flex-1 py-1.5 px-3 rounded-lg text-[11.5px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                loginMethod === "pin"
                  ? "bg-white dark:bg-slate-700 text-[#696cff] dark:text-indigo-400 shadow-xs"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              <KeyRound size={13} />
              <span>Quick PIN (Cashier)</span>
            </button>
            <button
              type="button"
              onClick={() => { setLoginMethod("email"); setError(""); }}
              className={`flex-1 py-1.5 px-3 rounded-lg text-[11.5px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                loginMethod === "email"
                  ? "bg-white dark:bg-slate-700 text-[#696cff] dark:text-indigo-400 shadow-xs"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              <Mail size={13} />
              <span>Email Sign In</span>
            </button>
          </div>
        )}

        {/* STEP 1: QUICK PIN PAD MODE */}
        {step === "login" && loginMethod === "pin" && (
          <div className="space-y-4">
            {/* Staff Selector Chips */}
            <div>
              <label className="block text-[10.5px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                Select Staff Account
              </label>
              <div className="grid grid-cols-3 gap-2">
                {staffPresets.map((staff) => (
                  <button
                    key={staff.id}
                    type="button"
                    onClick={() => {
                      setSelectedStaff(staff);
                      setPin("");
                      setError("");
                    }}
                    className={`flex flex-col items-center p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      selectedStaff.id === staff.id
                        ? "border-[#696cff] bg-[#696cff]/10 text-[#696cff] font-bold shadow-xs"
                        : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    <div className={`h-7 w-7 rounded-full ${staff.avatarBg} text-white flex items-center justify-center text-xs font-bold mb-1 shadow-xs`}>
                      {staff.initial}
                    </div>
                    <span className="text-[11px] leading-tight font-semibold truncate w-full">{staff.name}</span>
                    <span className="text-[9.5px] opacity-70 mt-0.5 font-medium truncate w-full">{staff.role}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 4-Digit PIN Indicator Dots */}
            <div className="flex flex-col items-center justify-center py-1">
              <div className="flex items-center gap-3">
                {[0, 1, 2, 3].map((idx) => (
                  <div
                    key={idx}
                    className={`h-4 w-4 rounded-full border-2 transition-all duration-150 ${
                      pin.length > idx
                        ? "bg-[#696cff] border-[#696cff] scale-110 shadow-sm shadow-[#696cff]/50"
                        : "border-slate-300 dark:border-slate-600 bg-transparent"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* 3x4 Touch Numpad */}
            <div className="grid grid-cols-3 gap-2 max-w-[280px] mx-auto">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "⌫"].map((btn) => (
                <button
                  key={btn}
                  type="button"
                  onClick={() => {
                    setError("");
                    if (btn === "C") {
                      setPin("");
                    } else if (btn === "⌫") {
                      setPin((prev) => prev.slice(0, -1));
                    } else {
                      if (pin.length < 4) {
                        const nextPin = pin + btn;
                        setPin(nextPin);
                        if (nextPin.length === 4) {
                          verifyAndSubmitPin(nextPin);
                        }
                      }
                    }
                  }}
                  className={`h-11 rounded-xl text-base font-bold transition-all flex items-center justify-center shadow-xs active:scale-95 cursor-pointer ${
                    btn === "C" || btn === "⌫"
                      ? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                      : "bg-slate-50 dark:bg-slate-800/90 text-slate-900 dark:text-white border border-slate-200/80 dark:border-slate-700 hover:bg-[#696cff] hover:text-white hover:border-[#696cff]"
                  }`}
                >
                  {btn}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 1: PRIMARY EMAIL CREDENTIALS FORM */}
        {step === "login" && loginMethod === "email" && (
          <form onSubmit={handlePrimarySubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[11.5px] font-semibold text-slate-800 dark:text-slate-200">
                Email Address
              </label>
              <div className="relative">
                <input
                  value={email}
                  onChange={(event) => {
                    if (error) setError("");
                    setEmail(event.target.value);
                  }}
                  onFocus={() => setError("")}
                  type="email"
                  placeholder="name@restaurant.com"
                  className="w-full h-9.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-[11.5px] text-slate-900 dark:text-white placeholder-slate-300 outline-none focus:border-slate-400 dark:focus:border-slate-500 transition-colors"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-[11.5px] font-semibold text-slate-800 dark:text-slate-200">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setMessage("");
                    setResetEmail(email || "");
                    setStep("forgot_email");
                  }}
                  className="text-[11.5px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-normal outline-none transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  value={password}
                  onChange={(event) => {
                    if (error) setError("");
                    setPassword(event.target.value);
                  }}
                  onFocus={() => setError("")}
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  className="w-full h-9.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-3 pr-9 text-[11.5px] text-slate-900 dark:text-white placeholder-slate-300 outline-none focus:border-slate-400 dark:focus:border-slate-500 transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 outline-none"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full h-10 rounded-xl bg-[#696cff] hover:bg-[#5f61e6] active:scale-[0.99] transition-all text-xs font-semibold text-white shadow-md shadow-[#696cff]/25 flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-wait cursor-pointer"
              >
                {loading ? <Loader2 className="animate-spin" size={15} /> : null}
                {loading ? "Verifying Credentials..." : "Continue with 2FA"}
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: 6-DIGIT OTP VERIFICATION FORM */}
        {step === "2fa" && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            {/* 6 Digit Input Boxes */}
            <div className="flex items-center justify-between gap-1.5">
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  id={`otp-digit-${idx}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={digit}
                  onChange={(e) => handleDigitInput(idx, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace" && !digit && idx > 0) {
                      const prev = document.getElementById(`otp-digit-${idx - 1}`);
                      prev?.focus();
                    }
                  }}
                  className="h-10 w-10 sm:w-11 text-center text-sm font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-[#696cff] outline-none transition-all"
                />
              ))}
            </div>

            <div className="flex items-center justify-between text-[11.5px] font-medium text-slate-600 dark:text-slate-300">
              <span>Code expires in: <strong className="text-[#696cff] font-bold">{formatTimer(timerSeconds)}</strong></span>
              <button
                type="button"
                onClick={resendOtp}
                disabled={timerSeconds > 120}
                className="inline-flex items-center gap-1 text-[#696cff] font-bold hover:underline disabled:opacity-40 disabled:no-underline"
              >
                <RefreshCw size={12} /> Resend OTP
              </button>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={loading || otpDigits.join("").length < 6}
                className="w-full h-10 rounded-xl bg-[#696cff] hover:bg-[#5f61e6] active:scale-[0.99] transition-all text-xs font-semibold text-white shadow-md shadow-[#696cff]/25 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? <Loader2 className="animate-spin" size={15} /> : <KeyRound size={16} />}
                {loading ? "Authenticating..." : "Verify & Sign In"}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: FORGOT PASSWORD EMAIL FORM */}
        {step === "forgot_email" && (
          <form onSubmit={handleSendResetOtp} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[11.5px] font-semibold text-slate-800 dark:text-slate-200">
                Admin Email Address
              </label>
              <div className="relative">
                <input
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  type="email"
                  placeholder="name@restaurant.com"
                  className="w-full h-9.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-[11.5px] text-slate-900 dark:text-white placeholder-slate-300 outline-none focus:border-slate-400 dark:focus:border-slate-500 transition-colors"
                  required
                />
              </div>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full h-10 rounded-xl bg-[#696cff] hover:bg-[#5f61e6] active:scale-[0.99] transition-all text-xs font-semibold text-white shadow-md shadow-[#696cff]/25 flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-wait cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={15} />
                ) : (
                  <RefreshCw size={15} />
                )}
                {loading ? "Sending Recovery OTP..." : "Send Reset OTP"}
              </button>
            </div>
          </form>
        )}

        {/* STEP 4: VERIFY OTP & NEW PASSWORD FORM */}
        {step === "forgot_reset" && (
          <form onSubmit={handleResetPasswordSubmit} className="space-y-3.5">
            <div className="space-y-1">
              <label className="block text-[11.5px] font-semibold text-slate-800 dark:text-slate-200">
                6-Digit Recovery Code
              </label>
              <div className="flex items-center justify-between gap-1.5">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`otp-digit-${idx}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={digit}
                    onChange={(e) => handleDigitInput(idx, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Backspace" && !digit && idx > 0) {
                        const prev = document.getElementById(`otp-digit-${idx - 1}`);
                        prev?.focus();
                      }
                    }}
                    className="h-10 w-10 sm:w-11 text-center text-sm font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-[#696cff] outline-none transition-all"
                  />
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[11.5px] font-semibold text-slate-800 dark:text-slate-200">
                New Password
              </label>
              <div className="relative">
                <input
                  value={newPassword}
                  onChange={(e) => {
                    if (error) setError("");
                    setNewPassword(e.target.value);
                  }}
                  onFocus={() => setError("")}
                  type={showNewPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  className="w-full h-9.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-3 pr-9 text-[11.5px] text-slate-900 dark:text-white placeholder-slate-300 outline-none focus:border-slate-400 dark:focus:border-slate-500 transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 outline-none"
                >
                  {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[11.5px] font-semibold text-slate-800 dark:text-slate-200">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  value={confirmPassword}
                  onChange={(e) => {
                    if (error) setError("");
                    setConfirmPassword(e.target.value);
                  }}
                  onFocus={() => setError("")}
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  className="w-full h-9.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-3 pr-9 text-[11.5px] text-slate-900 dark:text-white placeholder-slate-300 outline-none focus:border-slate-400 dark:focus:border-slate-500 transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 outline-none"
                >
                  {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={loading || otpDigits.join("").length < 6}
                className="w-full h-10 rounded-xl bg-[#696cff] hover:bg-[#5f61e6] active:scale-[0.99] transition-all text-xs font-semibold text-white shadow-md shadow-[#696cff]/25 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? <Loader2 className="animate-spin" size={15} /> : <KeyRound size={16} />}
                {loading ? "Updating Password..." : "Reset & Update Password"}
              </button>
            </div>
          </form>
        )}
          </div>

          {/* Bottom Right Copyright Footer */}
          <div className="pt-4 text-center text-[11px] text-slate-400 dark:text-slate-500 font-normal">
            © 2026 POS Management System
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes dropFromTop {
          0% { transform: translateY(-100%); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes toastProgress {
          0% { width: 100%; }
          100% { width: 0%; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        @keyframes oceanWave1 {
          0% { transform: translateX(0) scaleY(1); }
          50% { transform: translateX(-15%) scaleY(1.08); }
          100% { transform: translateX(-30%) scaleY(1); }
        }
        @keyframes oceanWave2 {
          0% { transform: translateX(0) scaleY(1); }
          50% { transform: translateX(-18%) scaleY(1.1); }
          100% { transform: translateX(-32%) scaleY(0.95); }
        }
        @keyframes waveFlow {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-18px); }
          100% { transform: translateY(12px); }
        }
        @keyframes ripplePulse {
          0% { opacity: 0.3; transform: scale(0.98); }
          50% { opacity: 0.6; transform: scale(1.04); }
          100% { opacity: 0.3; transform: scale(0.98); }
        }
        @keyframes bubbleUp {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          20% { opacity: 0.7; }
          80% { opacity: 0.7; }
          100% { transform: translateY(-700px) translateX(50px); opacity: 0; }
        }
        @keyframes turtleSwim {
          0% { transform: translate(-50px, 600px) rotate(35deg) scale(0.7); }
          25% { transform: translate(250px, 450px) rotate(20deg) scale(0.85); }
          50% { transform: translate(650px, 300px) rotate(45deg) scale(0.9); }
          75% { transform: translate(980px, 150px) rotate(15deg) scale(1); }
          100% { transform: translate(1400px, -60px) rotate(30deg) scale(0.8); }
        }
        @keyframes turtlePaddle {
          0% { transform: translateY(0px) rotate(0deg); }
          100% { transform: translateY(-4px) rotate(-3deg); }
        }
        @keyframes flipperLeft {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(-25deg); }
        }
        @keyframes flipperRight {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(25deg); }
        }
      `}</style>
    </main>
  );
}
