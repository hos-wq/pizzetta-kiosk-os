import { DevelopmentDataProvider } from '../../domain/developmentStore';
import { PagesPage } from './PagesPage';

/** Separate consumer contract: the mockup gets its own browser-local JSON store but renders the Theme Pages unchanged. */
export function IntegrationMockupPage({ presentation = 'showcase' }: { presentation?: 'showcase' | 'application' } = {}) {
  return <DevelopmentDataProvider storageKey="br-os-integration-mockup-v1"><PagesPage presentation={presentation} /></DevelopmentDataProvider>;
}
