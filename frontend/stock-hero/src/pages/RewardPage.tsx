import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SlideToUnlock } from '@/components/ui/reward-card';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';
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
        <SpotifyIcon className="h-6 w-6 text-[#1DB954]" />
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

const SpotifyIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 256 256"
    width="150"
    height="150"
    xmlns="http://www.w3.org/2000/svg"
    preserveAspectRatio="xMidYMid"
    {...props}
  >
    <path
      d="M128 0C57.308 0 0 57.309 0 128c0 70.696 57.309 128 128 128 70.697 0 128-57.304 128-128C256 57.314 198.697.007 127.998.007l.001-.006Zm58.699 184.614c-2.293 3.76-7.215 4.952-10.975 2.644-30.053-18.357-67.885-22.515-112.44-12.335a7.981 7.981 0 0 1-9.552-6.007 7.968 7.968 0 0 1 6-9.553c48.76-11.14 90.583-6.344 124.323 14.276 3.76 2.308 4.952 7.215 2.644 10.975Zm15.667-34.853c-2.89 4.695-9.034 6.178-13.726 3.289-34.406-21.148-86.853-27.273-127.548-14.92-5.278 1.594-10.852-1.38-12.454-6.649-1.59-5.278 1.386-10.842 6.655-12.446 46.485-14.106 104.275-7.273 143.787 17.007 4.692 2.89 6.175 9.034 3.286 13.72v-.001Zm1.345-36.293C162.457 88.964 94.394 86.71 55.007 98.666c-6.325 1.918-13.014-1.653-14.93-7.978-1.917-6.328 1.65-13.012 7.98-14.935C93.27 62.027 168.434 64.68 215.929 92.876c5.702 3.376 7.566 10.724 4.188 16.405-3.362 5.69-10.73 7.565-16.4 4.187h-.006Z"
      fill="#1ED760"
    />
  </svg>
);
