import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authEnabled, GROK_PROVIDERS, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export function CompetitionSignIn() {
  const { user, isPending } = useCurrentUserState();
  const [error, setError] = useState<string | null>(null);
  if (!authEnabled || isPending || user) return null;
  return (
    <section className="rounded-xl border border-rust/50 bg-raised p-3">
      <p className="text-xs uppercase tracking-widest text-rust">Put your yard on the line</p>
      <p className="mt-1 text-sm text-paper">Sign in to post on the year and daily Circuit boards.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {GROK_PROVIDERS.map((provider) => (
          <Button
            key={provider.providerId}
            size="sm"
            variant="outline"
            onClick={() => {
              setError(null);
              void signIn(provider.providerId, { callbackURL: "/" }).catch((reason: unknown) => {
                setError(reason instanceof Error ? reason.message : "Could not start sign-in.");
              });
            }}
          >
            Continue with {provider.label}
          </Button>
        ))}
      </div>
      {error ? <p className="mt-2 text-xs text-rust">{error}</p> : null}
    </section>
  );
}
