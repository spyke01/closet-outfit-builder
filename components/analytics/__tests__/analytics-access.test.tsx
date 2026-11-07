import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsDashboard } from '../analytics-dashboard';
import type { AnalyticsDashboardResponse } from '@/lib/types/analytics';
import { SEBASTIAN_OPEN_EVENT } from '@/lib/utils/sebastian-events';

afterEach(cleanup);
const free: AnalyticsDashboardResponse = {
  tier:'free',wardrobe:{totalItems:12,totalOutfits:4,recentlyAdded:null,mostWorn:null},engagement:null,
  preview:{items:[{id:'shirt',name:'Blue shirt',imageUrl:null,category:'Shirt'}],categories:[{name:'Shirt',count:12}],recentWears:[{id:'wear',date:'2026-11-06',name:'Friday workwear'}],wearCount:2,pricedCount:5},
};
describe('free analytics previews', () => {
  it('identifies same-name pieces by color and hands the selected piece to Sebastian', () => {
    const olive = { id:'olive-id',name:'Chinos',color:'olive',brand:'Test brand',material:'Cotton',imageUrl:null,category:'Pants',active:true,price:null,currency:'USD',createdAt:'2026-11-01' };
    render(<AnalyticsDashboard data={{ wardrobe:free.wardrobe, engagement:{savedOutfits:0,lovedOutfits:0,outfitHistory:[],todayStats:{totalRecommendations:0,accepted:0,acceptanceRate:0}}, insights:{ items:[olive,{...olive,id:'navy-id',color:'navy'}],wears:[],asOf:'2026-11-07' } }} />);
    fireEvent.click(screen.getByRole('tab',{name:'Clothing'}));
    expect(screen.getByText('Olive Chinos')).toBeInTheDocument();
    expect(screen.getByText('Navy Chinos')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox',{name:'Search clothing analytics'}),{target:{value:'olive'}});
    expect(screen.queryByText('Navy Chinos')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:/Olive Chinos/}));
    const listener = vi.fn(); window.addEventListener(SEBASTIAN_OPEN_EVENT,listener);
    try {
      fireEvent.click(within(screen.getByRole('dialog',{name:'Olive Chinos'})).getByRole('button',{name:'Ask Sebastian'}));
      const detail = (listener.mock.calls[0][0] as CustomEvent).detail;
      expect(detail.contextHints.focusItemId).toBe(olive.id);
      expect(detail.prompt).toContain('Olive Chinos (Pants · Test brand · Cotton)');
      expect(detail.focusItem).toMatchObject({id:olive.id,color:'olive'});
    } finally { window.removeEventListener(SEBASTIAN_OPEN_EVENT,listener); }
  });
  it('changes the content and upgrade benefit for every tab', () => {
    render(<AnalyticsDashboard data={free} />);
    expect(screen.getByRole('heading',{name:'Your wardrobe at a glance'})).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab',{name:'Clothing'}));
    expect(screen.getByRole('heading',{name:'A closer look at your clothing'})).toBeInTheDocument();
    expect(screen.getByText('Blue shirt')).toBeInTheDocument();
    expect(screen.queryByRole('heading',{name:'Your wardrobe at a glance'})).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab',{name:'Wear history'}));
    expect(screen.getByRole('heading',{name:'Your recent wears'})).toBeInTheDocument();
    expect(screen.getByRole('link',{name:/Friday workwear/})).toHaveAttribute('href','/calendar?date=2026-11-06');
    fireEvent.click(screen.getByRole('tab',{name:'Cost per wear'}));
    expect(screen.getByRole('heading',{name:'Start with a purchase price'})).toBeInTheDocument();
    expect(screen.getByText('Example calculation · illustrative numbers')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'See benefits'}));
    expect(screen.getByRole('link',{name:'Compare Plus & Pro'})).toHaveAttribute('href','/settings/billing');
  });
  it('keeps keyboard tab selection and the visible panel connected', () => {
    render(<AnalyticsDashboard data={free} />);
    fireEvent.keyDown(screen.getByRole('tab',{name:'Overview'}),{key:'End'});
    expect(screen.getByRole('tab',{name:'Cost per wear'})).toHaveAttribute('aria-selected','true');
    expect(within(screen.getByRole('tabpanel')).getByRole('heading',{name:'Start with a purchase price'})).toBeInTheDocument();
  });
  it('shows useful empty previews without inventing wear counts or purchase values', () => {
    render(<AnalyticsDashboard data={{...free,preview:undefined}} />);
    fireEvent.click(screen.getByRole('tab',{name:'Wear history'}));
    expect(screen.getByRole('link',{name:/Record your first wear/})).toHaveAttribute('href','/calendar');
    expect(screen.queryByText('Friday workwear')).not.toBeInTheDocument();
  });
});
