/** Browser-only measured pagination. Also serialized into the isolated print document. */
export function paginateMaterial() {
  const source = document.getElementById('material-source');
  const pages = document.getElementById('material-pages');
  const template = document.getElementById('material-page') as HTMLTemplateElement | null;
  if (!source || !pages || !template) return;
  pages.replaceChildren();
  let body: HTMLElement;
  let page: HTMLElement;
  const newPage = () => {
    const shell = template.content.firstElementChild?.cloneNode(true) as HTMLElement | undefined;
    if (!shell) throw new Error('Missing page template');
    pages.append(shell);
    page = shell;
    const content = shell.querySelector<HTMLElement>('.mx-content');
    if (!content) throw new Error('Missing content area');
    body = content;
  };
  newPage();
  const overflows = () => body.scrollHeight > body.clientHeight + 1;
  const add = (node: Node, wrappers: Element[] = []) => {
    if (node instanceof Element && node.classList.contains('mx-pb')) {
      if (body.childNodes.length) newPage();
      return;
    }
    const mount = (child: Node) => {
      let target: Node = body;
      for (const wrapper of wrappers) {
        const copy = wrapper.cloneNode(false) as Element;
        // Repeat column headings on continued tables.
        if (wrapper.tagName === 'TABLE') {
          const head = wrapper.querySelector('thead');
          if (head) copy.append(head.cloneNode(true));
        }
        target.appendChild(copy);
        target = copy;
      }
      target.appendChild(child);
      return body.lastChild;
    };
    let mounted = mount(node.cloneNode(true));
    if (!overflows()) return;
    mounted?.remove();
    if (body.childNodes.length) {
      newPage();
      mounted = mount(node.cloneNode(true));
      if (!overflows()) return;
      mounted?.remove();
    }
    if (node instanceof Element && node.children.length && !node.classList.contains('katex') && !node.classList.contains('mx-eq')) {
      const children = Array.from(node.childNodes).filter(n => !(n instanceof Element && n.tagName === 'THEAD'));
      children.forEach(child => add(child, [...wrappers, node]));
    } else if (node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim()) {
      const words = (node.textContent ?? '').split(/(\s+)/);
      let chunk = '';
      for (const word of words) {
        const trial = mount(document.createTextNode(chunk + word));
        const full = overflows();
        trial?.remove();
        if (full && chunk) {
          mount(document.createTextNode(chunk));
          newPage();
          chunk = word.trimStart();
        } else chunk += word;
      }
      if (chunk) mount(document.createTextNode(chunk));
    } else {
      // Oversized indivisible equations/images remain visible, never clipped.
      const item = node.cloneNode(true);
      if (item instanceof HTMLElement) item.classList.add('mx-oversized');
      mount(item);
      page.classList.add('mx-long-page');
    }
  };
  const nodes = Array.from(source.childNodes).filter(n => n.nodeType !== Node.TEXT_NODE || n.textContent?.trim());
  // Keep section headings with their following block when possible.
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const next = nodes[i + 1];
    if (node instanceof Element && /^H[1-6]$/.test(node.tagName) && next && !(next instanceof Element && next.classList.contains('mx-pb'))) {
      const group = document.createElement('div');
      group.append(node.cloneNode(true), next.cloneNode(true));
      add(group);
      i++;
    } else add(node);
  }
  const shells = Array.from(pages.children);
  shells.forEach((shell, index) => {
    const number = shell.querySelector('.mx-page-number');
    if (number) number.textContent = `${index + 1} / ${shells.length}`;
  });
  source.remove();
  const fit = () => {
    pages.style.zoom = String(Math.min(1, (document.documentElement.clientWidth - 24) / 794));
    window.parent.postMessage({ type: 'material-pages-height', height: document.body.getBoundingClientRect().height }, '*');
  };
  fit();
  window.addEventListener('resize', fit);
  document.documentElement.dataset.materialReady = 'true';
}
