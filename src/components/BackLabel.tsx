type BackLabelProps = {
  label: string;
};

/**
 * The "←" glyph sits on the text baseline, so on a phone it hangs below the
 * middle of the word. Draw it on its own and nudge it up to the cap-height center.
 */
export default function BackLabel({ label }: BackLabelProps) {
  const text = label.replace(/^\s*←\s*/, '');
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden="true" className="inline-block -translate-y-[0.07em]">
        ←
      </span>
      {text}
    </span>
  );
}
