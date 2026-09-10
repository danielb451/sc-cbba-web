export default function StatCard({ icon: Icon, label, value, detail, tone = 'purple' }) {
  return (
    <article className="stat-card">
      <div className={`stat-card__icon stat-card__icon--${tone}`}>{Icon ? <Icon size={25} /> : null}</div>
      <div className="stat-card__body">
        <span className="stat-card__label">{label}</span>
        <strong>{value}</strong>
        {detail ? <small>{detail}</small> : null}
      </div>
    </article>
  );
}
