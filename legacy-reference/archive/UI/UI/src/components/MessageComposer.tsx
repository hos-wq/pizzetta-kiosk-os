import { IconButton } from './ActionControls';
import { UniversalField } from './UniversalField';

type MessageComposerProps = {
  label: string;
  name: string;
  onChange: (value: string) => void;
  onSend: () => void;
  value: string;
};

export function MessageComposer({ label, name, onChange, onSend, value }: MessageComposerProps) {
  return <div className="br-message-composer"><UniversalField className="br-message-composer-field" label={label} multiline name={name} onChange={onChange} value={value} /><div className="br-message-composer-send-row"><IconButton disabled={!value.trim()} icon="send" label={`Send ${label.toLowerCase()} message`} onClick={onSend} tone="brass" /></div></div>;
}
