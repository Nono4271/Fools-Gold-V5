import { useEffect, useRef } from 'react';
import { resourceIncomeTick } from '../../shared/utils/resourceIncome.js';
export function useResources({screen, tilesRef, setRss, bldgs, fortsRef, rssBonus}) {
  const inputs = useRef({bldgs, rssBonus});
  useEffect(() => { inputs.current = {bldgs, rssBonus}; }, [bldgs, rssBonus]);
  const lastTickRef = useRef(Date.now());
  useEffect(() => {
    if (screen !== 'game') return;
    lastTickRef.current = Date.now();
    const doTick = () => {
      const now = Date.now();
      const elapsed = now - lastTickRef.current;
      lastTickRef.current = now;
      if (elapsed <= 0) return;
      const {bldgs, rssBonus} = inputs.current;
      setRss(previous => resourceIncomeTick(previous, tilesRef.current, bldgs, fortsRef?.current || [], rssBonus, elapsed));
    };
    const id = setInterval(doTick, 60000);
    // Credit the full gap immediately on foreground instead of waiting for
    // the next scheduled tick (which may be throttled right after resume).
    const onVisible = () => { if (document.visibilityState === 'visible') doTick(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
  }, [screen, setRss, tilesRef, fortsRef]);
}
