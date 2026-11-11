import { UniversalField } from '../../components/UniversalField';
import {
  attentionTokenCatalog,
  labelTokenCatalog,
  occupancyTokenCatalog,
  radiusTokenCatalog,
  spacingTokenCatalog,
  systemTokenCatalog,
  typeTokenCatalog,
  type TokenSwatch,
} from '../tokenCatalog';

function TokenSwatchGrid({ tokens }: { tokens: TokenSwatch[] }) {
  return <div className="room-grid">{tokens.map((token) => <div className="palette-swatch" key={token.label}>
    <div className="swatch-title-row"><strong>{token.label}</strong><code>{token.background}</code></div>
    <div aria-label={token.label} className="token-swatch token-swatch-content" style={{ background: `var(${token.background})`, color: `var(${token.text ?? '--br-color-ink'})` }}>
      <strong>{token.label}</strong>
      {token.text && <code>{token.text}</code>}
    </div>
  </div>)}</div>;
}

export function TokensPage() {
  return <main aria-label="BR OS Design System Tokens" className="module-page">
    <section className="module-section"><h1>TOKENS</h1><p className="intro-copy">Canonical design decisions consumed by every downstream primitive, component, layout and page.</p></section>
    <section aria-label="System tokens" className="module-section"><h2>SYSTEM PALETTE</h2><TokenSwatchGrid tokens={systemTokenCatalog} /></section>
    <section aria-label="Label tokens" className="module-section"><h2>LABEL PALETTE · DS-061</h2><TokenSwatchGrid tokens={labelTokenCatalog} /></section>
    <section aria-label="Occupancy tokens" className="module-section"><h2>STATUS PALETTE · DS-054 OCCUPANCY</h2><TokenSwatchGrid tokens={occupancyTokenCatalog} /></section>
    <section aria-label="High attention tokens" className="module-section"><h2>HIGH-ATTENTION · DS-061</h2><TokenSwatchGrid tokens={attentionTokenCatalog} /></section>
    <section aria-label="Typography and geometry tokens" className="module-section"><h2>TYPE · SPACING · RADIUS</h2><div className="lightbox-fields">{typeTokenCatalog.map(([label, token]) => <UniversalField key={token} label={label} name={`type-${token}`} readOnly value={`var(${token})`} />)}</div><div className="spacing-bar-list">{spacingTokenCatalog.map((token) => <div className="spacing-bar" key={token} style={{ width: `var(${token})` }}>{token}</div>)}</div><div className="radius-token-list">{radiusTokenCatalog.map((token) => <div className="radius-sample" key={token} style={{ borderRadius: `var(${token})` }}>{token}</div>)}</div></section>
  </main>;
}
