import { signIn } from "@/lib/auth";

// Google's own "neutral" identity-branding button: white surface, #747775
// hairline border, the four-color "G" mark, #1f1f1f label in a
// system/Roboto-family stack - kept exactly to spec (not re-skinned in the
// app's ink/rose palette) since off-brand styling can block OAuth
// verification. See https://developers.google.com/identity/branding-guidelines
function GoogleSignInButton() {
  return (
    <button type="submit" className="google-signin-btn">
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.9c1.7-1.57 2.68-3.87 2.68-6.61z" />
        <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z" />
        <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33z" />
        <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97L3.95 7.3C4.66 5.17 6.65 3.58 9 3.58z" />
      </svg>
      Sign in with Google
    </button>
  );
}

export default function LoginPage() {
  return (
    <div className="page">
      <span className="page__eyebrow">Sign in</span>
      <h1>A quiet moment before you buy</h1>
      <p className="page__lede">
        See what you already own, what this month has cost so far, and whether the thing you&apos;re
        considering is really something new.
      </p>

      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: "/dashboard" });
        }}
        className="section"
      >
        <GoogleSignInButton />
      </form>
    </div>
  );
}
