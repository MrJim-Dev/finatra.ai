import { NextResponse } from "next/server";

type ScopeErrorKind = "unauthenticated" | "no_portfolio";

export class ScopeError extends Error {
  readonly kind: ScopeErrorKind;

  private constructor(kind: ScopeErrorKind, message: string) {
    super(message);
    this.kind = kind;
    this.name = "ScopeError";
  }

  static unauthenticated(): ScopeError {
    return new ScopeError("unauthenticated", "Not signed in");
  }

  static noPortfolio(): ScopeError {
    return new ScopeError(
      "no_portfolio",
      "No portfolio. Create one to continue."
    );
  }

  static isScopeError(err: unknown): err is ScopeError {
    return err instanceof ScopeError;
  }
}

export function httpFromScopeError(err: ScopeError): NextResponse {
  if (err.kind === "unauthenticated") {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
  return NextResponse.json(
    { error: err.message, code: "no_portfolio" },
    { status: 409 }
  );
}
