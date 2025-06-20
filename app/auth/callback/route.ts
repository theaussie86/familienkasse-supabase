import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

interface GitHubUser {
  email: string | null;
  login: string;
}

const ALLOWED_EMAILS = process.env.ALLOWED_EMAILS?.split("|") || [];

// Funktion zur Überprüfung der Berechtigung
async function isAuthorizedUser(session?: {
  provider_token: string | null | undefined;
}) {
  try {
    const response = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${session?.provider_token}`,
      },
    });
    const userData: GitHubUser = await response.json();

    // Prüfe, ob die E-Mail-Adresse in der Liste der erlaubten Adressen ist
    if (!userData.email || !ALLOWED_EMAILS.includes(userData.email)) {
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error checking user authorization:", error);
    return false;
  }
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // if "next" is in param, use it as the redirect URL
  let next = searchParams.get("next") ?? "/";
  if (!next.startsWith("/")) {
    // if "next" is not a relative URL, use the default
    next = "/";
  }

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data?.session) {
      // Prüfe, ob der Benutzer berechtigt ist
      const isAuthorized = await isAuthorizedUser({
        provider_token: data.session.provider_token,
      });

      if (!isAuthorized) {
        // Wenn nicht berechtigt, lösche die Session und leite zur Fehlerseite weiter
        await supabase.auth.signOut();
        // Lösche außerdem den angelegen User in der Datenbank mit Service Role
        const serviceRoleClient = createServiceRoleClient();
        await serviceRoleClient.auth.admin.deleteUser(data.session.user.id);
        return NextResponse.redirect(
          `${origin}/auth/error?message=unauthorized`
        );
      }

      const forwardedHost = request.headers.get("x-forwarded-host"); // original origin before load balancer
      const isLocalEnv = process.env.NODE_ENV === "development";
      if (isLocalEnv) {
        // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
