import { useState } from 'react';
import { ActionButton, IconButton } from '../../components/ActionControls';
import { ContextTabs } from '../../components/ContextTabs';
import { Icon } from '../../components/Icon';
import { iconNames } from '../../components/IconRegistry';
import { RadioSelector } from '../../components/RadioSelector';
import { Checkbox, Toggle } from '../../components/SelectionControls';
import { Tabs } from '../../components/Tabs';
import { UniversalField } from '../../components/UniversalField';

const primitiveTabs = ['ROOM', 'TENANT', 'UTILITIES'];
const primitiveContextTabs = ['GENERAL', 'DETAILS', 'STATE'];

export function PrimitivesPage() {
  const [toggle, setToggle] = useState(true);
  const [checkbox, setCheckbox] = useState(true);
  const [tab, setTab] = useState(primitiveTabs[0]);
  const [contextTab, setContextTab] = useState(primitiveContextTabs[0]);
  const [radio, setRadio] = useState('NORMAL');

  return <main aria-label="BR OS Design System Primitives" className="module-page">
    <section className="module-section"><h1>PRIMITIVES</h1><p className="intro-copy">Composable interface primitives. Every specimen below is the production primitive itself, governed by the Tokens page.</p></section>
    <section aria-label="Field primitive" className="module-section"><h2>FIELD</h2><div className="field-demo-grid"><UniversalField label="Editable" name="primitive-editable" onChange={() => undefined} value="READY" /><UniversalField label="Read only" name="primitive-readonly" readOnly value="BR·02" /><UniversalField disabled label="Disabled" name="primitive-disabled" value="LOCKED" /><UniversalField error="Required value" label="Error" name="primitive-error" value="" /></div></section>
    <section aria-label="Action primitives" className="module-section"><h2>ACTIONS</h2><div className="lightbox-gallery-actions"><ActionButton>PRIMARY</ActionButton><ActionButton tone="neutral">NEUTRAL</ActionButton><ActionButton tone="quiet">QUIET</ActionButton><ActionButton disabled>DISABLED</ActionButton><IconButton icon="clear" label="Clear" /><IconButton icon="send" label="Send" tone="brass" /></div></section>
    <section aria-label="Selection primitives" className="module-section"><h2>SELECTION</h2><div className="selection-demo"><Toggle checked={toggle} label="Toggle" onChange={setToggle} /><Toggle checked={false} disabled label="Disabled toggle" onChange={() => undefined} /><Checkbox checked={checkbox} label="Checkbox" onChange={setCheckbox} /><Checkbox checked={false} error="Invalid selection" label="Error checkbox" onChange={() => undefined} /><RadioSelector label="Priority" name="primitive-priority" onChange={setRadio} options={['NORMAL', 'URGENT']} value={radio} /></div></section>
    <section aria-label="Navigation primitives" className="module-section"><h2>NAVIGATION</h2><Tabs active={tab} labels={primitiveTabs} onChange={setTab} /><ContextTabs active={contextTab} ariaLabel="Primitive context navigation" labels={primitiveContextTabs} onChange={setContextTab} /></section>
    <section aria-label="Icon primitive registry" className="module-section"><h2>ICON</h2><div className="icon-registry-grid">{iconNames.map((name) => <div className="icon-registry-item" key={name}><Icon name={name} /><span>{name}</span></div>)}</div></section>
  </main>;
}
