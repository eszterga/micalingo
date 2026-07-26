// Wraps <table> elements found inside a rendered HTML container in a horizontally
// scrollable wrapper (so wide pasted tables from Word/Excel/Docs never get clipped
// or hidden on narrow mobile/app viewports), and injects a small "expand" button
// that lets the user open the table in a full-screen lightbox view.

export function enhanceResponsiveTables(
  container: HTMLElement | null | undefined,
  onExpand: (table: HTMLTableElement) => void,
  expandLabel: string = 'Expand table'
) {
  if (!container) return;

  const tables = container.querySelectorAll<HTMLTableElement>('table:not([data-table-enhanced])');

  tables.forEach((table) => {
    table.setAttribute('data-table-enhanced', 'true');

    const parent = table.parentNode;
    if (!parent) return;

    // Avoid double-wrapping if this table was already processed in a previous render
    if (parent instanceof HTMLElement && parent.classList.contains('table-scroll-wrapper')) {
      return;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'table-scroll-wrapper';
    parent.insertBefore(wrapper, table);
    wrapper.appendChild(table);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'table-expand-btn';
    btn.setAttribute('aria-label', expandLabel);
    btn.setAttribute('title', expandLabel);
    btn.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/></svg>';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      onExpand(table);
    });
    wrapper.appendChild(btn);
  });
}
