"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";

export async function loginAction(formData: FormData) {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/",
    });
  } catch (authError) {
    if (authError instanceof AuthError) {
      // Check if it's our CustomAuthError or if the message/code has "Account locked"
      const errCause = (authError.cause as any)?.err;
      const message = errCause?.code || errCause?.message || authError.type;
      
      if (message && message.includes("Account locked")) {
        return redirect(`/login?error=${encodeURIComponent(message)}`);
      }
      return redirect(`/login?error=${encodeURIComponent(authError.type)}`);
    }
    throw authError; // Rethrow other errors (like NEXT_REDIRECT)
  }
}

