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
      return redirect(`/login?error=${encodeURIComponent(authError.type)}`);
    }
    throw authError; // Rethrow other errors (like NEXT_REDIRECT)
  }
}
