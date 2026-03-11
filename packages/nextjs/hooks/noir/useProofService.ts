"use client";

import { useState } from "react";
import type { NoirInputMap, ProofRequest, ProofResponse } from "~~/lib/noir/types";

export const useProofService = () => {
  const [isLoading, setIsLoading] = useState(false);

  const prove = async <TInputs extends NoirInputMap>(request: ProofRequest<TInputs>): Promise<ProofResponse> => {
    setIsLoading(true);

    try {
      if (request.mode === "server") {
        const response = await fetch("/api/noir/prove", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.error || "Server-side proof generation failed");
        }

        return (await response.json()) as ProofResponse;
      }

      const { proveInBrowser } = await import("~~/lib/noir/proving");
      return proveInBrowser(request);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    prove,
  };
};
