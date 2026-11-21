// SPDX-License-Identifier: Apache-2.0
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { EmailOtpType } from "@supabase/supabase-js";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { safeInternalPath } from "@/lib/navigation";
import { getErrorMessage } from "@/lib/errors";

const OTP_TYPES = new Set<EmailOtpType>([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

export default function AuthConfirm() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const confirm = async () => {
      try {
        const next = safeInternalPath(params.get("next"));
        const tokenHash = params.get("token_hash");
        const typeValue = params.get("type") as EmailOtpType | null;
        const code = params.get("code");

        if (tokenHash && typeValue && OTP_TYPES.has(typeValue)) {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: typeValue,
          });
          if (verifyError) throw verifyError;
        } else if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        } else {
          const { data, error: sessionError } = await supabase.auth.getSession();
          if (sessionError) throw sessionError;
          if (!data.session) throw new Error("The confirmation link is invalid or has expired.");
        }

        if (active) navigate(next, { replace: true });
      } catch (confirmationError) {
        if (active) setError(getErrorMessage(confirmationError, "Unable to confirm this link"));
      }
    };

    void confirm();
    return () => {
      active = false;
    };
  }, [navigate, params]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{error ? "Confirmation failed" : "Confirming your account"}</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : (
            <p className="text-sm text-gray-600">Please wait while the secure link is verified.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
