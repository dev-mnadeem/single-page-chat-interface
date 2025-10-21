import { File, FileCode, FileText, Image as ImageIcon } from "lucide-react";

type IconComponent = typeof File;

/** Ordered: the first pattern that matches the MIME type wins. */
const ICON_RULES: ReadonlyArray<[RegExp, IconComponent]> = [
  [/^image\//, ImageIcon],
  [/(javascript|typescript|json|x-sh|xml)/, FileCode],
  [/(^text\/|document|pdf)/, FileText],
];

export function iconForType(type: string): IconComponent {
  const rule = ICON_RULES.find(([pattern]) => pattern.test(type));
  return rule ? rule[1] : File;
}
