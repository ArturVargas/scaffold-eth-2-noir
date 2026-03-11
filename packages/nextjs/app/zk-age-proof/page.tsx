import { AgeProofDemo } from "~~/app/zk-age-proof/_components/AgeProofDemo";

const ZkAgeProofPage = () => {
  return (
    <div className="flex flex-col gap-8 px-6 py-10 lg:px-10">
      <div className="max-w-4xl">
        <p className="text-sm uppercase tracking-[0.3em] text-secondary">Noir Starter</p>
        <h1 className="text-4xl font-bold">Browser-first proving with a server fallback</h1>
        <p className="mt-4 text-base-content/70">
          This sample keeps the latest Scaffold-ETH 2 shell, compiles Noir circuits in `packages/noir`, generates bb
          verifiers for Hardhat, and exposes a shared proof service that can run in the browser or through a Next.js
          route handler.
        </p>
      </div>
      <AgeProofDemo />
    </div>
  );
};

export default ZkAgeProofPage;
