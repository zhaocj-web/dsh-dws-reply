import React from 'react';
type ActionButtonProps = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
};
export function ActionButton(props: ActionButtonProps) {
  return (
    <button
      type="button"
      className={(props.primary ?? false) ? 'dpr-btn dpr-btn-primary' : 'dpr-btn'}
      onClick={props.onClick}
      disabled={props.disabled ?? false}
    >
      {props.label}
    </button>
  );
}
type SectionPanelProps = {
  actions?: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
};
export function SectionPanel(props: SectionPanelProps) {
  return (
    <section className="dpr-panel">
      {props.actions ? (
        <div className="dpr-panel-heading">
          <h2>{props.title}</h2>
          <div className="dpr-panel-heading-actions">{props.actions}</div>
        </div>
      ) : (
        <h2>{props.title}</h2>
      )}
      {props.description && <p className="dpr-sub">{props.description}</p>}
      <div className="dpr-panel-body">{props.children}</div>
    </section>
  );
}
export function PageHeading(props: PageHeadingProps) {
  return (
    <header className="dpr-head">
      <h1>{props.title}</h1>
      {props.description && <p className="dpr-sub">{props.description}</p>}
    </header>
  );
}
export function DetailRow(props: DetailRowProps) {
  return (
    <div className="dpr-row">
      <span>{props.label}</span>
      <span>{props.value}</span>
    </div>
  );
}
type PageHeadingProps = {
  title: string;
  description?: string;
};
type DetailRowProps = {
  label: string;
  value: React.ReactNode;
};
