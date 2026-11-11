import { useState } from 'react';
import { ComponentsPage } from './pages/ComponentsPage';
import { LayoutsPage } from './pages/LayoutsPage';
import { PagesPage } from './pages/PagesPage';
import { IntegrationMockupPage } from './pages/IntegrationMockupPage';
import { PrimitivesPage } from './pages/PrimitivesPage';
import { TokensPage } from './pages/TokensPage';
import { showcaseSectorCatalog } from './tokenCatalog';
import { DevelopmentDataProvider } from '../domain/developmentStore';

type ShowcaseSector = (typeof showcaseSectorCatalog)[number]['id'];

export function ThemeShowcase() {
  const [sector, setSector] = useState<ShowcaseSector>('PAGES');
  return <DevelopmentDataProvider><div className="design-system-showcase"><nav aria-label="Design system showcase sectors" className="showcase-sector-nav">{showcaseSectorCatalog.map((item) => <button aria-current={sector === item.id ? 'page' : undefined} className={`showcase-sector-tab${sector === item.id ? ' is-active' : ''}`} key={item.id} onClick={() => setSector(item.id)} type="button">{item.label}</button>)}</nav>{sector === 'TOKENS' && <TokensPage />}{sector === 'PRIMITIVES' && <PrimitivesPage />}{sector === 'COMPONENTS' && <ComponentsPage />}{sector === 'LAYOUTS' && <LayoutsPage />}{sector === 'PAGES' && <PagesPage />}{sector === 'INTEGRATION_MOCKUP' && <IntegrationMockupPage />}</div></DevelopmentDataProvider>;
}
