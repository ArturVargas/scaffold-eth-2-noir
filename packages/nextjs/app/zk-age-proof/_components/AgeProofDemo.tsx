"use client";

import { useMemo, useState } from "react";
import { Address } from "@scaffold-ui/components";
import { useAccount } from "wagmi";
import { useProofService } from "~~/hooks/noir/useProofService";
import { useScaffoldReadContract, useScaffoldWriteContract, useTargetNetwork } from "~~/hooks/scaffold-eth";
import {
  DEFAULT_ISSUER_PRIVATE_KEY,
  DEFAULT_REQUIRED_BIRTH_YEAR,
  DEFAULT_SUBJECT_BIRTH_YEAR,
} from "~~/lib/noir/constants";
import { buildAgeProofInputs, signBirthYearClaim } from "~~/lib/noir/inputs";
import type { AgeProofForm, ProofMode, ProofResponse, SignedBirthClaim } from "~~/lib/noir/types";
import { notification } from "~~/utils/scaffold-eth";

const initialFormState: AgeProofForm = {
  requiredBirthYear: DEFAULT_REQUIRED_BIRTH_YEAR,
  birthYear: DEFAULT_SUBJECT_BIRTH_YEAR,
  issuerPrivateKey: DEFAULT_ISSUER_PRIVATE_KEY,
};

export const AgeProofDemo = () => {
  const { address } = useAccount();
  const { targetNetwork } = useTargetNetwork();
  const { isLoading, prove } = useProofService();
  const [form, setForm] = useState(initialFormState);
  const [signedClaim, setSignedClaim] = useState<SignedBirthClaim | null>(null);
  const [proofResult, setProofResult] = useState<ProofResponse | null>(null);
  const [mode, setMode] = useState<ProofMode>("browser");
  const { writeContractAsync, isMining } = useScaffoldWriteContract({ contractName: "BalloonVendor" });

  const { data: tokenBalance } = useScaffoldReadContract({
    contractName: "BalloonToken",
    functionName: "balanceOf",
    args: [address] as const,
    query: { enabled: Boolean(address) },
  });

  const { data: hasClaimed } = useScaffoldReadContract({
    contractName: "BalloonVendor",
    functionName: "hasClaimedFreeToken",
    args: [address] as const,
    query: { enabled: Boolean(address) },
  });

  const summary = useMemo(() => {
    if (!proofResult) {
      return null;
    }

    return {
      proofBytes: (proofResult.proof.length - 2) / 2,
      publicInputCount: proofResult.publicInputs.length,
    };
  }, [proofResult]);

  const signClaim = async () => {
    if (!address) {
      notification.error("Connect a wallet before signing a demo birth-year claim");
      return;
    }

    const notificationId = notification.loading("Signing age claim...");
    try {
      const connectedAddress = address as `0x${string}`;
      const nextSignedClaim = await signBirthYearClaim(connectedAddress, form.birthYear, form.issuerPrivateKey);
      setSignedClaim(nextSignedClaim);
      setProofResult(null);
      notification.success("Signed claim ready");
    } catch (error) {
      notification.error(error instanceof Error ? error.message : "Could not sign the age claim");
    } finally {
      notification.remove(notificationId);
    }
  };

  const generateProof = async () => {
    if (!address || !signedClaim) {
      notification.error("Sign the age claim before generating a proof");
      return;
    }

    const notificationId = notification.loading(`Generating ${mode} proof...`);
    try {
      const connectedAddress = address as `0x${string}`;
      const inputs = buildAgeProofInputs({
        ...form,
        account: connectedAddress,
        signedClaim,
      });

      const nextProof = await prove({
        circuitName: "LessThanSignedAge",
        inputs,
        mode,
      });

      setProofResult(nextProof);
      notification.success(`Proof generated and ${nextProof.verified ? "verified" : "not verified"} locally`);
    } catch (error) {
      notification.error(error instanceof Error ? error.message : "Proof generation failed");
    } finally {
      notification.remove(notificationId);
    }
  };

  const submitProof = async () => {
    if (!proofResult) {
      notification.error("Generate a proof before calling the contract");
      return;
    }

    const notificationId = notification.loading("Submitting proof to BalloonVendor...");
    try {
      await writeContractAsync({
        functionName: "getFreeToken",
        args: [proofResult.proof, proofResult.publicInputs],
      });
      notification.success("Proof accepted on-chain");
    } catch (error) {
      notification.error(error instanceof Error ? error.message : "Contract call failed");
    } finally {
      notification.remove(notificationId);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <section className="card bg-base-200 shadow-xl">
        <div className="card-body gap-6">
          <div>
            <h2 className="card-title text-2xl">Sample flow</h2>
            <p className="text-sm text-base-content/70">
              The trusted issuer signs a birth-year claim for the connected wallet. The Noir circuit proves the wallet
              owner is younger than the configured threshold without revealing anything beyond the required public
              inputs.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="form-control">
              <span className="label-text">Connected address</span>
              <div className="mt-2 rounded-2xl border border-base-300 bg-base-100 px-4 py-3">
                {address ? (
                  <Address address={address} chain={targetNetwork} />
                ) : (
                  <span className="text-sm text-base-content/60">Connect a wallet to run the starter flow.</span>
                )}
              </div>
            </label>

            <label className="form-control">
              <span className="label-text">Proof mode</span>
              <select
                className="select select-bordered mt-2"
                value={mode}
                onChange={event => setMode(event.target.value as ProofMode)}
              >
                <option value="browser">Browser proving</option>
                <option value="server">Server fallback</option>
              </select>
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="form-control">
              <span className="label-text">Required birth year</span>
              <input
                className="input input-bordered mt-2"
                min={0}
                max={65535}
                type="number"
                value={form.requiredBirthYear}
                onChange={event => setForm(current => ({ ...current, requiredBirthYear: Number(event.target.value) }))}
              />
            </label>

            <label className="form-control">
              <span className="label-text">Subject birth year</span>
              <input
                className="input input-bordered mt-2"
                min={0}
                max={65535}
                type="number"
                value={form.birthYear}
                onChange={event => setForm(current => ({ ...current, birthYear: Number(event.target.value) }))}
              />
            </label>
          </div>

          <label className="form-control">
            <span className="label-text">Trusted issuer private key</span>
            <input
              className="input input-bordered mt-2 font-mono text-sm"
              value={form.issuerPrivateKey}
              onChange={event =>
                setForm(current => ({ ...current, issuerPrivateKey: event.target.value as `0x${string}` }))
              }
            />
          </label>

          <div className="flex flex-wrap gap-3">
            <button className="btn btn-primary" disabled={!address} onClick={signClaim}>
              1. Sign claim
            </button>
            <button className="btn btn-secondary" disabled={!signedClaim || isLoading} onClick={generateProof}>
              2. Generate proof
            </button>
            <button className="btn btn-accent" disabled={!proofResult || isMining} onClick={submitProof}>
              3. Claim token
            </button>
          </div>
        </div>
      </section>

      <section className="card bg-base-100 shadow-xl border border-base-200">
        <div className="card-body gap-5">
          <div>
            <h2 className="card-title text-2xl">Starter output</h2>
            <p className="text-sm text-base-content/70">
              The shared proving service returns the proof bytes, ordered public inputs, backend metadata, and a local
              verification result.
            </p>
          </div>

          <div className="rounded-2xl border border-base-300 bg-base-200 p-4 text-sm">
            <p className="font-semibold">Wallet claim status</p>
            <p className="mt-2 text-base-content/70">Has claimed free token: {hasClaimed ? "yes" : "no"}</p>
            <p className="text-base-content/70">Token balance: {tokenBalance ? tokenBalance.toString() : "0"}</p>
          </div>

          <div className="rounded-2xl border border-base-300 bg-base-200 p-4 text-sm">
            <p className="font-semibold">Signed claim</p>
            <p className="mt-2 break-all font-mono text-xs">
              {signedClaim?.signedMessage || "No signed claim generated yet."}
            </p>
          </div>

          <div className="rounded-2xl border border-base-300 bg-base-200 p-4 text-sm">
            <p className="font-semibold">Proof response</p>
            {proofResult ? (
              <div className="mt-2 space-y-2 text-base-content/70">
                <p>
                  Mode: <span className="font-semibold text-base-content">{proofResult.mode}</span>
                </p>
                <p>
                  Backend: <span className="font-semibold text-base-content">{proofResult.backend}</span>
                </p>
                <p>
                  Noir version: <span className="font-semibold text-base-content">{proofResult.noirVersion}</span>
                </p>
                <p>
                  Verified locally:{" "}
                  <span className="font-semibold text-base-content">{proofResult.verified ? "yes" : "no"}</span>
                </p>
                <p>
                  Proof bytes: <span className="font-semibold text-base-content">{summary?.proofBytes}</span>
                </p>
                <p>
                  Public inputs: <span className="font-semibold text-base-content">{summary?.publicInputCount}</span>
                </p>
                <p className="break-all font-mono text-xs text-base-content">{proofResult.proof}</p>
              </div>
            ) : (
              <p className="mt-2 text-base-content/70">No proof generated yet.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
