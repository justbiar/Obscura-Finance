import { PoolInfo } from '../components/PoolInfo';

export function Pool() {
  return (
    <div className="max-w-[1200px] mx-auto px-6 py-12 min-h-[calc(100vh-160px)]">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text mb-2">Market Overview</h1>
        <p className="text-text-dim">Global statistics for the Obscura ZK Lending pool.</p>
      </div>
      <PoolInfo />
    </div>
  );
}
