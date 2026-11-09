export type BadgeData = { label: string; tone: string };

export default function Badge({ badge }: { badge: BadgeData }) {
  return <span className={`badge badge-${badge.tone}`}>{badge.label}</span>;
}
