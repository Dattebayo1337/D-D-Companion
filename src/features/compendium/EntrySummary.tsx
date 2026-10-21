import {
  Swords,
  Shield,
  Sparkles,
  Skull,
  BookOpen,
  Backpack,
  Gem,
  Compass,
  Users,
  ScrollText,
  Award,
  GitBranch,
  CircleAlert,
  Eye,
  Flame,
  WandSparkles,
  Heart,
  Shapes,
  Ghost,
} from "lucide-react";
import type { Content } from "@/entities/content";
import { contentSummary } from "@/domain/content-summary";
const referenceIcons = {
  Class: Swords,
  Subclass: GitBranch,
  SpeciesRace: Users,
  Background: Compass,
  Feat: Award,
  Weapon: Swords,
  Armor: Shield,
  Equipment: Backpack,
  MagicItem: Gem,
  Condition: CircleAlert,
  Rule: ScrollText,
};
const schoolIcons = {
  Abjuration: Shield,
  Conjuration: WandSparkles,
  Divination: Eye,
  Enchantment: Heart,
  Evocation: Flame,
  Illusion: Ghost,
  Necromancy: Skull,
  Transmutation: Shapes,
};
export function EntryIcon({
  entry,
  size = 24,
}: {
  entry: Content;
  size?: number;
}) {
  const Icon =
    entry.kind === "Reference"
      ? referenceIcons[entry.reference.category]
      : entry.kind === "Spell"
        ? schoolIcons[entry.spell.school]
        : Skull;
  return <Icon size={size} aria-hidden="true" />;
}
export function EntrySummary({ entry }: { entry: Content }) {
  const summary = contentSummary(entry);
  return (
    <section className="entry-summary" aria-label="Краткое описание">
      <div className="summary-heading">
        <EntryIcon entry={entry} size={28} />
        <h3>Кратко</h3>
      </div>
      <p>{summary.text || "Основные сведения приведены ниже."}</p>
      {!!summary.facts.length && (
        <dl>
          {summary.facts.map((fact, index) => (
            <div key={index}>
              <dt>
                <BookOpen size={14} aria-hidden="true" />
                {fact.label}
              </dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
      )}
      <small>
        <Sparkles size={13} aria-hidden="true" />
        {entry.contentOrigin === "MetadataOnly"
          ? " Краткий обзор. Полные правила и исключения — по ссылке на источник."
          : " Краткое описание и ключевые сведения. Подробности — в режиме описания и правил."}
      </small>
      {entry.kind === "Reference" && entry.reference.features.length > 0 && (
        <div className="summary-features">
          <h4>Основные умения</h4>
          <ul>
            {entry.reference.features.slice(0, 6).map((feature, index) => (
              <li key={index}>
                {feature.level !== null && `${feature.level}-й уровень — `}
                {feature.nameRu}
              </li>
            ))}
          </ul>
          {entry.reference.features.length > 6 && <p>Ещё {entry.reference.features.length - 6} — в режиме «Описание и умения».</p>}
        </div>
      )}
    </section>
  );
}
