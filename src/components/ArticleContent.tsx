import React, { useEffect, useRef } from 'react';
import { useI18n } from '../I18nContext';
import { enhanceResponsiveTables } from '../lib/enhanceTables';

interface ArticleContentProps {
  id?: string;
  html: string;
  className?: string;
  onImageClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onExpandTable?: (table: HTMLTableElement) => void;
  onMouseUp?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onTouchEnd?: (e: React.TouchEvent<HTMLDivElement>) => void;
}

// Renders rich-text HTML content (from the CMS editor) while making any pasted
// tables mobile/app-friendly: they become horizontally scrollable instead of
// getting clipped, and gain a small button to open them in a full-screen view.
export default function ArticleContent({ id, html, className, onImageClick, onExpandTable, onMouseUp, onTouchEnd }: ArticleContentProps) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && onExpandTable) {
      enhanceResponsiveTables(ref.current, onExpandTable, t('expand_table') || 'Expand table');
    }
  }, [html, onExpandTable, t]);

  return (
    <div
      id={id}
      ref={ref}
      className={className}
      onClick={onImageClick}
      onMouseUp={onMouseUp}
      onTouchEnd={onTouchEnd}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
