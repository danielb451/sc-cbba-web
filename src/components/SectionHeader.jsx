export default function SectionHeader({ title, text, actions }) {
  return (
    <div className="section-header">
      <div><h1>{title}</h1>{text ? <p>{text}</p> : null}</div>
      {actions ? <div className="section-header__actions">{actions}</div> : null}
    </div>
  );
}
