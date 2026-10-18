/**
 * Minimal DOM shim so the React binding layer can be exercised in vitest's
 * node environment (`desktop/vitest.config.ts` sets `environment: "node"` and
 * the repo has no jsdom/happy-dom dependency).
 *
 * `react-dom/client`'s `createRoot` needs a real `document`/`window` pair with
 * the constructor globals React and its serialiser look up, plus enough element
 * behaviour for React to commit, run effects and let `act()` flush them. Only
 * that surface is provided; nothing here emulates layout, so tests must not
 * depend on measurements.
 *
 * `installDomShim()` returns the shim document so a test can mount into it and
 * read back what React committed. `globalThis` is patched, so `vi.unstubAll`
 * alone is not enough - use `restoreDomShim()` in `afterEach`.
 */

class ShimNode {}
class ShimElement extends ShimNode {}
class ShimHTMLElement extends ShimElement {}
class ShimHTMLInputElement extends ShimHTMLElement {}
class ShimSVGElement extends ShimElement {}
class ShimHTMLIFrameElement extends ShimHTMLElement {}
class ShimHTMLAnchorElement extends ShimHTMLElement {}
class ShimHTMLButtonElement extends ShimHTMLElement {}
class ShimHTMLFormElement extends ShimHTMLElement {}
class ShimHTMLSelectElement extends ShimHTMLElement {}
class ShimHTMLTextAreaElement extends ShimHTMLElement {}
class ShimHTMLImageElement extends ShimHTMLElement {}
class ShimEvent {
  type: string;
  constructor(type: string, init: Record<string, unknown> = {}) {
    this.type = type;
    Object.assign(this, init);
  }
}
class ShimMouseEvent extends ShimEvent {}
class ShimKeyboardEvent extends ShimEvent {}

export interface ShimElementNode {
  nodeType: number;
  tagName: string;
  nodeName: string;
  localName: string;
  childNodes: ShimElementNode[];
  parentNode: ShimElementNode | null;
  attributes: Record<string, string>;
  listeners: Record<string, Array<(event: unknown) => void>>;
  style: Record<string, string>;
  dataset: Record<string, string>;
  ownerDocument: unknown;
  firstChild: ShimElementNode | null;
  nextSibling: null;
  textContent: string;
  appendChild(child: ShimElementNode): ShimElementNode;
  insertBefore(child: ShimElementNode, ref: ShimElementNode): ShimElementNode;
  removeChild(child: ShimElementNode): ShimElementNode;
  setAttribute(name: string, value: string): void;
  setAttributeNS(_ns: string, name: string, value: string): void;
  getAttribute(name: string): string | null;
  getAttributeNS(_ns: string, name: string): string | null;
  removeAttribute(name: string): void;
  addEventListener(type: string, fn: (event: unknown) => void): void;
  removeEventListener(type: string, fn: (event: unknown) => void): void;
  dispatchEvent(): boolean;
  contains(node: ShimElementNode): boolean;
  getBoundingClientRect(): {
    top: number;
    left: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
    x: number;
    y: number;
    toJSON(): void;
  };
  focus(): void;
  blur(): void;
  scrollTo(): void;
  querySelector(): null;
  querySelectorAll(): never[];
}

export interface ShimDocument extends ShimElementNode {
  defaultView: unknown;
  documentElement: ShimElementNode;
  body: ShimElementNode;
  activeElement: ShimElementNode;
  implementation: { createHTMLDocument(): ShimDocument };
  createElement(tag: string): ShimElementNode;
  createElementNS(_ns: string, tag: string): ShimElementNode;
  createTextNode(text: string): ShimElementNode;
  createComment(text: string): ShimElementNode;
  createDocumentFragment(): ShimElementNode;
}

function createElementNode(
  ownerDocument: unknown,
  tag: string,
): ShimElementNode {
  const node: ShimElementNode = {
    nodeType: 1,
    tagName: tag.toUpperCase(),
    nodeName: tag.toUpperCase(),
    localName: tag.toLowerCase(),
    childNodes: [],
    parentNode: null,
    attributes: {},
    listeners: {},
    style: {},
    dataset: {},
    ownerDocument,

    get firstChild() {
      return this.childNodes[0] ?? null;
    },
    get nextSibling() {
      return null;
    },
    get textContent() {
      // A text or comment node holds its own content on `nodeValue`, so
      // reading a subtree means descending into children AND honouring those.
      if (this.nodeType === 3 || this.nodeType === 8) {
        return String(
          (this as unknown as { nodeValue?: string }).nodeValue ?? "",
        );
      }
      return this.childNodes
        .map((child) => child.textContent ?? "")
        .join("");
    },
    set textContent(_value: string) {
      // React's `setTextContent` writes through this setter, so the value has
      // to survive as a real text child or the subtree reads back empty.
      this.childNodes = [];
      const owner = this.ownerDocument as unknown as {
        createTextNode?: (text: string) => ShimElementNode;
      } | null;
      if (owner?.createTextNode) {
        this.appendChild(owner.createTextNode(_value));
      }
    },

    appendChild(child) {
      this.childNodes.push(child);
      child.parentNode = this;
      return child;
    },
    insertBefore(child, ref) {
      const at = this.childNodes.indexOf(ref);
      this.childNodes.splice(at < 0 ? this.childNodes.length : at, 0, child);
      child.parentNode = this;
      return child;
    },
    removeChild(child) {
      const at = this.childNodes.indexOf(child);
      if (at >= 0) this.childNodes.splice(at, 1);
      child.parentNode = null;
      return child;
    },

    setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
    setAttributeNS(_ns, name, value) {
      this.attributes[name] = String(value);
    },
    getAttribute(name) {
      return name in this.attributes ? this.attributes[name] : null;
    },
    getAttributeNS(_ns, name) {
      return this.getAttribute(name);
    },
    removeAttribute(name) {
      delete this.attributes[name];
    },

    addEventListener(type, fn) {
      (this.listeners[type] ||= []).push(fn);
    },
    removeEventListener(type, fn) {
      this.listeners[type] = (this.listeners[type] ?? []).filter(
        (entry) => entry !== fn,
      );
    },
    dispatchEvent() {
      return true;
    },
    contains(node) {
      return this.childNodes.includes(node);
    },

    getBoundingClientRect() {
      return {
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: 0,
        height: 0,
        x: 0,
        y: 0,
        toJSON() {},
      };
    },
    focus() {},
    blur() {},
    scrollTo() {},
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
  };

  return node;
}

function createDocument(): ShimDocument {
  const doc = createElementNode(null, "#document") as unknown as ShimDocument;

  doc.nodeType = 9;
  doc.nodeName = "#document";
  doc.ownerDocument = doc;
  doc.createElement = (tag) => createElementNode(doc, tag);
  doc.createElementNS = (_ns, tag) => createElementNode(doc, tag);
  doc.createTextNode = (text) => {
    const node = createElementNode(doc, "#text");
    node.nodeType = 3;
    (node as unknown as { nodeValue: string }).nodeValue = text;
    return node;
  };
  doc.createComment = (text) => {
    const node = createElementNode(doc, "#comment");
    node.nodeType = 8;
    (node as unknown as { nodeValue: string }).nodeValue = text;
    return node;
  };
  doc.createDocumentFragment = () => {
    const node = createElementNode(doc, "#fragment");
    node.nodeType = 11;
    return node;
  };
  doc.documentElement = doc.createElement("html");
  doc.body = doc.createElement("body");
  doc.activeElement = doc.body;
  doc.body.appendChild(doc.documentElement);
  doc.implementation = { createHTMLDocument: () => createDocument() };

  return doc;
}

/** Everything the shim put on `globalThis`, so it can be restored afterwards. */
const patchedKeys = [
  "IS_REACT_ACT_ENVIRONMENT",
  "document",
  "window",
  "Node",
  "Element",
  "HTMLElement",
  "HTMLInputElement",
  "SVGElement",
  "HTMLIFrameElement",
  "HTMLAnchorElement",
  "HTMLButtonElement",
  "HTMLFormElement",
  "HTMLSelectElement",
  "HTMLTextAreaElement",
  "HTMLImageElement",
  "Event",
  "MouseEvent",
  "KeyboardEvent",
  "requestAnimationFrame",
  "cancelAnimationFrame",
  "getComputedStyle",
  "matchMedia",
] as const;

let installedDocument: ShimDocument | null = null;

/**
 * Installs the shim on `globalThis` and returns its document.
 *
 * Call once per test file (or per test) before mounting React.
 */
export function installDomShim(): ShimDocument {
  const doc = createDocument();

  const view: Record<string, unknown> = {
    document: doc,
    addEventListener() {},
    removeEventListener() {},
    requestAnimationFrame: (fn: () => void) => setTimeout(fn, 0),
    cancelAnimationFrame: (handle: unknown) => clearTimeout(handle as never),
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    location: { href: "http://localhost/" },
    Node: ShimNode,
    Element: ShimElement,
    HTMLElement: ShimHTMLElement,
    HTMLInputElement: ShimHTMLInputElement,
    SVGElement: ShimSVGElement,
    HTMLIFrameElement: ShimHTMLIFrameElement,
    HTMLAnchorElement: ShimHTMLAnchorElement,
    HTMLButtonElement: ShimHTMLButtonElement,
    HTMLFormElement: ShimHTMLFormElement,
    HTMLSelectElement: ShimHTMLSelectElement,
    HTMLTextAreaElement: ShimHTMLTextAreaElement,
    HTMLImageElement: ShimHTMLImageElement,
    Event: ShimEvent,
    MouseEvent: ShimMouseEvent,
    KeyboardEvent: ShimKeyboardEvent,
    getComputedStyle: () => ({ getPropertyValue: () => "" }),
    matchMedia: () => ({
      matches: false,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
    }),
  };

  doc.defaultView = view;

  const globals = globalThis as unknown as Record<string, unknown>;
  for (const key of patchedKeys) {
    if (!(key in globals)) {
      delete globals[key];
    }
  }

  // Tell React the test host supports act(); without this React logs a
  // warning on every flush.
  globals.IS_REACT_ACT_ENVIRONMENT = true;

  globals.document = doc;
  globals.window = view;
  globals.Node = ShimNode;
  globals.Element = ShimElement;
  globals.HTMLElement = ShimHTMLElement;
  globals.HTMLInputElement = ShimHTMLInputElement;
  globals.SVGElement = ShimSVGElement;
  globals.HTMLIFrameElement = ShimHTMLIFrameElement;
  globals.HTMLAnchorElement = ShimHTMLAnchorElement;
  globals.HTMLButtonElement = ShimHTMLButtonElement;
  globals.HTMLFormElement = ShimHTMLFormElement;
  globals.HTMLSelectElement = ShimHTMLSelectElement;
  globals.HTMLTextAreaElement = ShimHTMLTextAreaElement;
  globals.HTMLImageElement = ShimHTMLImageElement;
  globals.Event = ShimEvent;
  globals.MouseEvent = ShimMouseEvent;
  globals.KeyboardEvent = ShimKeyboardEvent;
  globals.requestAnimationFrame = view.requestAnimationFrame;
  globals.cancelAnimationFrame = view.cancelAnimationFrame;
  globals.getComputedStyle = view.getComputedStyle;
  globals.matchMedia = view.matchMedia;

  installedDocument = doc;

  return doc;
}

/** Undoes {@link installDomShim}. Safe to call when nothing was installed. */
export function restoreDomShim(): void {
  const globals = globalThis as unknown as Record<string, unknown>;

  for (const key of patchedKeys) {
    delete globals[key];
  }

  installedDocument = null;
}

/** The document {@link installDomShim} installed, for assertions in tests. */
export function installedDomDocument(): ShimDocument | null {
  return installedDocument;
}

/** Flattens the text of a shim subtree, trimmed and space-collapsed. */
export function shimText(node: ShimElementNode | ShimDocument): string {
  const raw = node.textContent ?? "";
  return raw.replace(/\s+/g, " ").trim();
}

/** Finds the first descendant whose attribute matches, depth-first. */
export function findByAttribute(
  root: ShimElementNode | ShimDocument,
  name: string,
  value: string,
): ShimElementNode | null {
  const stack = [...root.childNodes];

  while (stack.length > 0) {
    const node = stack.pop() as ShimElementNode;
    if (node.getAttribute?.(name) === value) return node;
    stack.push(...node.childNodes);
  }

  return null;
}

/** All descendants carrying a non-null value for `name`, in document order. */
export function findAllByAttribute(
  root: ShimElementNode | ShimDocument,
  name: string,
): Array<{ node: ShimElementNode; value: string }> {
  const found: Array<{ node: ShimElementNode; value: string }> = [];
  const walk = (node: ShimElementNode): void => {
    for (const child of node.childNodes) {
      const value = child.getAttribute?.(name);
      if (value !== null && value !== undefined) {
        found.push({ node: child, value });
      }
      walk(child);
    }
  };

  walk(root as ShimElementNode);

  return found;
}
