import { useEffect, useRef } from 'react';
import { resourceIncomeTick } from '../../shared/utils/resourceIncome.js';
export function useResources({screen, tilesRef, setRss, bldgs, fortsRef, rssBonus}) {
  const inputs = useRef({bldgs, rssBonus});
  useEffect(() => { inputs.current = {bldgs, rssBonus}; }, [bldgs, rssBonus]);
  useEffect(() => {
    if (screen !== 'game') return;
    const id = setInterval(() => {
      const {bldgs, rssBonus} = inputs.current;
      setRss(previous => resourceIncomeTick(previous, tilesRef.current, bldgs, fortsRef?.current || [], rssBonus));
    }, 60000);
    return () => clearInterval(id);
  }, [screen, setRss, tilesRef, fortsRef]);
}
