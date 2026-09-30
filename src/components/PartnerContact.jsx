import { Radio } from 'lucide-react';

export function PartnerContact({ partner, alert, selected, disabled, onOpen }) {
  if (!partner) return null;
  return (
    <button
      className={`partner-contact ${selected ? 'selected' : ''} ${alert ? 'has-alert' : ''}`}
      aria-label={`Open partner call with ${partner.name}${alert ? ' — attention requested' : ''}`}
      aria-expanded={selected}
      onClick={onOpen}
      disabled={disabled}
    >
      <span className="partner-contact-portrait">
        {partner.avatar ? <img src={partner.avatar} alt="" /> : partner.initials || '?'}
      </span>
      <span className="partner-contact-copy">
        <small>YOUR PARTNER</small>
        <strong>{partner.name}</strong>
      </span>
      <span className="partner-contact-action">
        <Radio size={17} aria-hidden="true" />
        <span>{alert ? 'Attention requested' : 'Open line'}</span>
      </span>
    </button>
  );
}
