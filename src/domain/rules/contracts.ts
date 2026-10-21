import type { EditionId } from "@/entities/content";
// Implemented edition modules arrive with reviewed SRD mechanics in Phase 3.
export type EffectSource = {
  entityId: string;
  type:
    | "Class"
    | "Subclass"
    | "Species"
    | "Background"
    | "Feat"
    | "Item"
    | "Spell"
    | "Condition"
    | "Homebrew";
};
export type RuleContext = {
  edition: EditionId;
  overrides: ReadonlyMap<string, string>;
};
export interface RuleModule<Input, Output> {
  readonly edition: EditionId;
  readonly ruleId: string;
  evaluate(input: Input, context: RuleContext): Output;
}
