import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SlideToUnlock } from '@/components/ui/reward-card';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';
import { Coins } from 'lucide-react';
import { api } from '@/lib/api';

export default function RewardPage() {
  const navigate = useNavigate();
  const { width, height } = useWindowSize();
  // loading -> asking the server, available -> reward can still be claimed
  const [state, setState] = React.useState<'loading' | 'available'>('loading');
  const [isClaimed, setIsClaimed] = React.useState(false);
  const [claiming, setClaiming] = React.useState(false);
  const [error, setError] = React.useState('');
  const timer = React.useRef<number | undefined>(undefined);

  React.useEffect(() => {
    api
      .rewardStatus()
      // Reward already claimed on this Gmail: go straight to the dashboard
      .then((r) => (r.claimed ? navigate('/dashboard', { replace: true }) : setState('available')))
      .catch((e: Error) => {
        setError(e.message);
        setState('available');
      });
    return () => window.clearTimeout(timer.current);
  }, [navigate]);

  // Clicking the gift claims it on the server, then opens the dashboard.
  const handleClaim = async () => {
    if (claiming || isClaimed) return;
    setClaiming(true);
    setError('');
    try {
      await api.claimReward();
      setIsClaimed(true); // confetti
      timer.current = window.setTimeout(() => navigate('/dashboard'), 1800);
    } catch (e) {
      try {
        const r = await api.rewardStatus();
        if (r.claimed) {
          navigate('/dashboard', { replace: true });
          return;
        }
      } catch {
        /* fall through to the error message */
      }
      setError((e as Error).message);
      setClaiming(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await api.logout();
    } finally {
      navigate('/');
    }
  };

  const UnlockedGift = () => (
    <button
      type="button"
      onClick={handleClaim}
      disabled={claiming}
      className="mt-6 flex h-14 w-full cursor-pointer items-center justify-between rounded-full border-0 bg-[#1DB954] p-2 text-left text-white shadow-lg transition-transform hover:scale-105 disabled:cursor-default disabled:hover:scale-100"
    >
      <div className="pl-3">
        <p className="text-sm font-bold">1k Virtual Coins</p>
        <p className="text-xs opacity-80">
          {isClaimed ? 'Reward claimed' : claiming ? 'Claiming...' : 'Click to claim'}
        </p>
      </div>
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white">
        <Coins className="h-6 w-6 text-[#1DB954]" />
      </div>
    </button>
  );

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-background p-4">
      <button
        type="button"
        onClick={handleSignOut}
        className="absolute right-4 top-4 border-0 bg-transparent p-0 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
      >
        Sign out
      </button>

      {isClaimed && (
        <Confetti width={width} height={height} recycle={false} numberOfPieces={500} gravity={0.1} />
      )}

      {state === 'available' && (
        <div className="w-full max-w-xs">
          <SlideToUnlock onUnlock={() => {}} unlockedContent={<UnlockedGift />} shimmer={true}>
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-secondary">
                <GiftIcon className="h-12 w-12 text-foreground/80" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Welcome Trader
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Your investing journey starts today. Claim your virtual coins, explore real market data, and learn to invest without risking real money.
              </p>
            </div>
          </SlideToUnlock>
          {error && <p className="mt-3 text-center text-sm text-destructive">{error}</p>}
        </div>
      )}
    </div>
  );
}

// ---ICONS---
const GiftIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="8" width="18" height="4" rx="1" />
    <path d="M12 12v8" />
    <path d="M19 12v8H5v-8" />
    <path d="M19 8a4 4 0 0 0-8 0" />
    <path d="M5 8a4 4 0 0 1 8 0" />
  </svg>
);
