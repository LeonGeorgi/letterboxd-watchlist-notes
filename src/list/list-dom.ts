export function findListActionsPanel(root: ParentNode = document): HTMLElement | null {
  return (
    root.querySelector<HTMLElement>('#userpanel[data-component-class="ListSidebar"]') ??
    root.querySelector<HTMLElement>('#userpanel.actions-panel') ??
    root.querySelector<HTMLElement>('.sidebar .actions-panel[data-list-identifier]')
  );
}

export function findListActions(panel: ParentNode): HTMLUListElement | null {
  return panel.querySelector<HTMLUListElement>('ul');
}

export function getListSlug(pathname: string = window.location.pathname) {
  const encodedSlug = pathname.match(/^\/[^/]+\/list\/([^/]+)\/?/)?.[1];
  if (!encodedSlug) {
    return null;
  }

  try {
    return decodeURIComponent(encodedSlug);
  } catch {
    return encodedSlug;
  }
}
