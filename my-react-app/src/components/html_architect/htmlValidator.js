/**
 * Bulbuli's HTML Architect 3D — HTML validation engine
 *
 * Why two passes?
 *   The browser's DOMParser ('text/html') never fails: it silently closes
 *   missing tags, invents <html>/<head>/<body> when they're absent and moves
 *   misplaced elements. Great for browsers, bad for teaching. So:
 *
 *   1. A small tokenizer walks the player's *source* with a tag stack to
 *      catch unclosed, mismatched and stray closing tags, and records which
 *      tags were actually typed (with line numbers).
 *   2. DOMParser builds the real DOM. Nesting rules are checked on it, and
 *      any target tag the browser had to drop or relocate is reported as
 *      misplaced.
 *
 * Main export:
 *   validateHTML(code, level) -> {
 *     isValid:     boolean,   // well-formed AND every target present AND correctly nested
 *     missingTags: string[],  // target tags never written
 *     parsedTree:  object,    // { tag, attributes, children, text? } from DOMParser
 *     errors:      Array<{ type, message, tag?, line? }>,  // friendly, player-facing
 *     unlocked:    string[],  // 3D object keys earned (present + correctly nested tags)
 *     typedTags:   object,    // tag -> number of opening tags actually typed
 *     brokenTags:  string[],  // tags with a structural, nesting or attribute error
 *   }
 */

// Tags that never have a closing tag.
export const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'source', 'track', 'wbr',
]);

// Tags whose contents are raw text — anything inside isn't parsed as tags.
const RAW_TEXT_TAGS = new Set(['script', 'style', 'textarea', 'title']);

// <tag attr="v" attr='v' attr=v attr> or </tag>, quoted values may contain '>'.
const TAG_RE =
  /<(\/?)([a-zA-Z][\w-]*)((?:\s+[^\s"'=<>\/`]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*(\/?)>/y;
const ATTR_RE = /([^\s"'=<>\/`]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

const lineAt = (code, index) => code.slice(0, index).split('\n').length;
const article = (word) => (/^[aeiou]/i.test(word) ? 'an' : 'a');

/* ------------------------------------------------------------------ */
/* Pass 1: source well-formedness                                      */
/* ------------------------------------------------------------------ */

/**
 * Scans the raw source. Returns the tags the player typed and any
 * structural errors (unclosed / mismatched / stray closing tags).
 */
export function checkWellFormed(code) {
  const errors = [];
  const tagCounts = {};            // tag -> number of opening tags written
  const attributes = {};           // tag -> array of attribute maps, in order
  const ancestry = {};             // tag -> array of ancestor chains as typed (nearest parent first)
  const stack = [];                // { tag, line }
  let i = 0;

  while (i < code.length) {
    const lt = code.indexOf('<', i);
    if (lt === -1) break;
    i = lt;

    // Comments, <!DOCTYPE>, <![CDATA[ ... ]]> and <?...?> are skipped.
    if (code.startsWith('<!--', i)) {
      const end = code.indexOf('-->', i + 4);
      if (end === -1) {
        errors.push({
          type: 'UNCLOSED_COMMENT',
          line: lineAt(code, i),
          message: `Line ${lineAt(code, i)}: a comment "<!--" is never closed with "-->".`,
        });
        break;
      }
      i = end + 3;
      continue;
    }
    if (code[i + 1] === '!' || code[i + 1] === '?') {
      const end = code.indexOf('>', i);
      i = end === -1 ? code.length : end + 1;
      continue;
    }

    TAG_RE.lastIndex = i;
    const m = TAG_RE.exec(code);
    if (!m) {
      // A lone "<" that isn't a tag (e.g. "3 < 5") — or a broken tag like "<h1"
      const nextChar = code[i + 1] || '';
      if (/[a-zA-Z\/]/.test(nextChar)) {
        const snippet = code.slice(i, i + 20).split('\n')[0];
        errors.push({
          type: 'BROKEN_TAG',
          line: lineAt(code, i),
          message: `Line ${lineAt(code, i)}: "${snippet}" looks like a tag but isn't finished — check for a missing ">".`,
        });
      }
      i += 1;
      continue;
    }

    const [full, slash, rawName, rawAttrs, selfClose] = m;
    const tag = rawName.toLowerCase();
    const line = lineAt(code, i);
    i += full.length;

    if (slash) {
      // ---- closing tag ----
      if (VOID_TAGS.has(tag)) {
        errors.push({
          type: 'VOID_CLOSED', tag, line,
          message: `Line ${line}: <${tag}> never needs a closing tag — remove </${tag}>.`,
        });
        continue;
      }
      const idx = stack.map((s) => s.tag).lastIndexOf(tag);
      if (idx === -1) {
        errors.push({
          type: 'STRAY_CLOSING', tag, line,
          message: `Line ${line}: </${tag}> closes a tag that was never opened.`,
        });
        continue;
      }
      // Everything opened after the matching tag was left unclosed.
      for (let k = stack.length - 1; k > idx; k -= 1) {
        const open = stack[k];
        errors.push({
          type: 'MISSING_CLOSING', tag: open.tag, line: open.line,
          message: `Line ${open.line}: <${open.tag}> must be closed with </${open.tag}> before </${tag}> on line ${line}.`,
        });
      }
      stack.length = idx;
      continue;
    }

    // ---- opening tag ----
    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    const attrMap = {};
    for (const a of rawAttrs.matchAll(ATTR_RE)) {
      attrMap[a[1].toLowerCase()] = a[2] ?? a[3] ?? a[4] ?? '';
    }
    (attributes[tag] ||= []).push(attrMap);
    (ancestry[tag] ||= []).push(stack.map((s) => s.tag).reverse());

    if (VOID_TAGS.has(tag) || selfClose) continue;

    if (RAW_TEXT_TAGS.has(tag)) {
      const closeRe = new RegExp(`</${tag}\\s*>`, 'ig');
      closeRe.lastIndex = i;
      const close = closeRe.exec(code);
      if (!close) {
        errors.push({
          type: 'MISSING_CLOSING', tag, line,
          message: `Line ${line}: <${tag}> is never closed — add </${tag}>.`,
        });
        break;
      }
      i = close.index + close[0].length;
      continue;
    }

    stack.push({ tag, line });
  }

  for (const open of stack) {
    errors.push({
      type: 'MISSING_CLOSING', tag: open.tag, line: open.line,
      message: `Line ${open.line}: <${open.tag}> is never closed — add </${open.tag}>.`,
    });
  }

  return { wellFormed: errors.length === 0, errors, tagCounts, attributes, ancestry };
}

/* ------------------------------------------------------------------ */
/* Pass 2: DOM tree + nesting                                          */
/* ------------------------------------------------------------------ */

function getParser(options) {
  if (options.parser) return options.parser;
  if (typeof DOMParser !== 'undefined') return new DOMParser();
  throw new Error('htmlValidator: DOMParser is not available. Pass { parser } in options (e.g. from jsdom) when running outside a browser.');
}

/** Converts a DOM element into a plain, serialisable object for the 3D scene. */
export function domToTree(el) {
  const node = { tag: el.tagName.toLowerCase(), attributes: {}, children: [] };
  for (const attr of Array.from(el.attributes)) node.attributes[attr.name] = attr.value;
  const text = Array.from(el.childNodes)
    .filter((n) => n.nodeType === 3)
    .map((n) => n.textContent)
    .join('')
    .trim();
  if (text) node.text = text;
  for (const child of Array.from(el.children)) node.children.push(domToTree(child));
  return node;
}

const asList = (v) => (Array.isArray(v) ? v : [v]);
const tagList = (v) => asList(v).map((t) => `<${t}>`).join(' or ');

/**
 * parent/ancestor rules are checked against the structure the player TYPED
 * (the browser would otherwise hide mistakes, e.g. by inventing a <head>);
 * contains rules are checked on the DOM.
 */
function checkNesting(doc, ancestry, rules) {
  const errors = [];
  for (const rule of rules) {
    const chains = ancestry[rule.tag] || [];
    if (chains.length === 0) continue; // absence is reported as missing, not misnested

    if ('parent' in rule) {
      const allowed = rule.parent === null ? null : asList(rule.parent);
      const bad = chains.find((chain) => (allowed === null
        ? chain.length > 0
        : !allowed.includes(chain[0])));
      if (bad) {
        errors.push({
          type: 'WRONG_PARENT', tag: rule.tag,
          message: allowed === null
            ? `<${rule.tag}> must be the outermost element.`
            : `<${rule.tag}> must sit directly inside ${tagList(allowed)}.`,
        });
      }
    }

    if ('ancestor' in rule) {
      const bad = chains.find((chain) => !chain.includes(rule.ancestor));
      if (bad) {
        errors.push({
          type: 'WRONG_ANCESTOR', tag: rule.tag,
          message: `<${rule.tag}> must be somewhere inside <${rule.ancestor}>.`,
        });
      }
    }

    if ('contains' in rule) {
      const els = Array.from(doc.getElementsByTagName(rule.tag));
      const ok = els.some((el) => el.getElementsByTagName(rule.contains).length > 0);
      if (!ok) {
        errors.push({
          type: 'MISSING_CHILD', tag: rule.tag,
          message: `Put at least one <${rule.contains}> inside your <${rule.tag}>.`,
        });
      }
    }
  }
  return errors;
}

function checkAttributes(sourceAttributes, required) {
  const errors = [];
  for (const [tag, attrs] of Object.entries(required)) {
    const instances = sourceAttributes[tag] || [];
    for (const attr of attrs) {
      if (instances.some((a) => !a[attr] || !a[attr].trim())) {
        errors.push({
          type: 'MISSING_ATTRIBUTE', tag,
          message: `Every <${tag}> needs ${article(attr)} ${attr}="..." attribute.`,
        });
      }
    }
  }
  return errors;
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/**
 * Validates the player's code against a level.
 * @param {string} code   the editor contents
 * @param {object} level  a level from levelsData.js
 * @param {object} [options]
 * @param {DOMParser} [options.parser] custom parser (tests / SSR)
 */
export function validateHTML(code, level, options = {}) {
  const targetTags = (level?.targetTags || []).map((t) => t.toLowerCase());
  const unlockMap = level?.['3dUnlocks'] || {};
  const source = typeof code === 'string' ? code : '';

  // Pass 1 — what did the player actually type, and is it balanced?
  const wf = checkWellFormed(source);
  const missingTags = targetTags.filter((t) => !wf.tagCounts[t]);

  // Pass 2 — real DOM.
  const doc = getParser(options).parseFromString(source, 'text/html');
  const parsedTree = domToTree(doc.documentElement);

  const nestingErrors = checkNesting(doc, wf.ancestry, level?.nestingRules || []);

  // Tags the browser had to drop or move (e.g. <head> written inside <body>).
  const misplaced = targetTags.filter(
    (t) => wf.tagCounts[t] && doc.getElementsByTagName(t).length < wf.tagCounts[t]
      && !nestingErrors.some((e) => e.tag === t),
  );
  for (const tag of misplaced) {
    nestingErrors.push({
      type: 'MISPLACED', tag,
      message: `A <${tag}> is in a spot where it isn't allowed, so the browser ignored it.`,
    });
  }

  const attributeErrors = checkAttributes(wf.attributes, level?.requiredAttributes || {});

  const missingErrors = missingTags.map((tag) => ({
    type: 'MISSING_TAG', tag,
    message: `Your code still needs ${article(tag)} <${tag}> element.`,
  }));

  const errors = [...wf.errors, ...missingErrors, ...nestingErrors, ...attributeErrors];

  // A tag earns its 3D object once it's written, correctly nested and has its attributes —
  // even while other parts of the level are unfinished, so the scene grows as the player types.
  const brokenTags = new Set(
    [...wf.errors, ...nestingErrors, ...attributeErrors].map((e) => e.tag).filter(Boolean),
  );
  const unlocked = targetTags
    .filter((t) => wf.tagCounts[t] && !brokenTags.has(t) && unlockMap[t])
    .map((t) => unlockMap[t]);

  return {
    isValid: errors.length === 0,
    missingTags,
    parsedTree,
    errors,
    unlocked,
    typedTags: wf.tagCounts,          // tag -> count of opening tags the player actually typed
    brokenTags: Array.from(brokenTags), // tags that have a structural, nesting or attribute error
  };
}

export default validateHTML;
