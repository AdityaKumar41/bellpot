import type { ElementType } from "react";

type RichTextProps = {
  html: string;
  as?: ElementType;
  className?: string;
};

/** Dictionary strings are our own files and may contain markup. Slot values are escaped before they are interpolated. */
export function RichText({ html, as: Tag = "span", className }: RichTextProps) {
  return <Tag className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
