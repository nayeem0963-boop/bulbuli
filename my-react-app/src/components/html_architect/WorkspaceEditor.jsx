/**
 * Bulbuli's HTML Architect 3D — code workspace
 *
 * - Syntax-highlighted textarea (transparent textarea over a highlighted <pre>),
 *   line numbers, and red markers on lines with structural errors.
 * - Tag palette: inserts a tag at the cursor, or wraps the selected text.
 *   Uses execCommand('insertText') so Ctrl+Z still works.
 * - Objectives checklist driven by the level's targetTags.
 * - Bulbuli, who reacts to what's happening and gives escalating hints.
 *
 * Props:
 *   level          level object from levelsData.js
 *   code           current editor text
 *   onChange(code)
 *   validation     validateHTML() result for (a debounced copy of) code
 *   checkState     null | { status: 'pass' | 'fail', code, result }  — last Run/Check
 *   onHintUsed()   called each time the player spends a hint
 *   onReset()      restore starter code
 *   stuckDelayMs   idle time without progress before Bulbuli offers help (default 30000)
 */

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

/* ================================================================== */
/* Tag palette                                                          */
/* ================================================================== */

// open/close wrap the selection; `text` is for void tags. `caret` = offset inside `open`/`text`.
const SNIPPETS = {
  html: { open: '<html>\n  ', close: '\n</html>' },
  head: { open: '<head>\n  ', close: '\n</head>' },
  body: { open: '<body>\n  ', close: '\n</body>' },
  title: { open: '<title>', close: '</title>' },
  h1: { open: '<h1>', close: '</h1>' },
  p: { open: '<p>', close: '</p>' },
  div: { open: '<div>\n  ', close: '\n</div>' },
  img: { text: '<img src="" alt="">', caret: 10 },
  a: { open: '<a href="">', close: '</a>', caret: 9 },
  ul: { open: '<ul>\n  <li>', close: '</li>\n</ul>' },
  ol: { open: '<ol>\n  <li>', close: '</li>\n</ol>' },
  li: { open: '<li>', close: '</li>' },
};

const PALETTE_GROUPS = [
  { label: 'Structure', tags: ['html', 'head', 'body', 'title'] },
  { label: 'Text', tags: ['h1', 'p', 'div'] },
  { label: 'Media', tags: ['img', 'a'] },
  { label: 'Lists', tags: ['ul', 'ol', 'li'] },
];

/* ================================================================== */
/* Hints                                                                */
/* ================================================================== */

const TAG_TIPS = {
  html: 'Everything lives inside <html> … </html>. Open it at the very top and close it at the very bottom.',
  head: '<head> holds info about the page, like its <title>. Put it inside <html>, before <body>.',
  body: '<body> holds everything visitors see. It goes inside <html>, right after </head>.',
  h1: 'A big heading: write <h1>, your title, then </h1>. It goes inside <body>.',
  p: 'A paragraph is text between <p> and </p>. For this level, tuck it inside your <div>.',
  div: 'A <div> is a box for grouping things. Open <div>, put stuff inside, then close </div>.',
  img: '<img> is special: it has no closing tag! It needs src="picture.png" and alt="what it shows".',
  a: 'A link wraps its words: <a href="https://...">Click me</a>. Don\'t forget the href.',
  ul: '<ul> makes a bullet list. Each item inside it is an <li>.',
  ol: '<ol> makes a numbered list. Each item inside it is an <li>.',
  li: 'Every <li> item must sit directly inside a <ul> or <ol>, and close with </li>.',
};

const EXAMPLES = {
  html: '<html>\n  <head></head>\n  <body></body>\n</html>',
  head: '<head>\n  <title>My page</title>\n</head>',
  body: '<body>\n</body>',
  h1: '<h1>Bulbuli Tower</h1>',
  p: '<p>Welcome to my building!</p>',
  div: '<div>\n  <p>Welcome to my building!</p>\n</div>',
  img: '<img src="https://picsum.photos/400/300" alt="A pretty picture">',
  a: '<a href="https://example.com">Visit me</a>',
  ul: '<ul>\n  <li>Mangoes</li>\n  <li>Kites</li>\n</ul>',
  ol: '<ol>\n  <li>Wake up</li>\n  <li>Build HTML</li>\n</ol>',
  li: '<li>Another item</li>',
};

const prettyKey = (key) => key.toLowerCase().split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');

/* ================================================================== */
/* Syntax highlighting                                                  */
/* ================================================================== */

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const TOKEN_RE = /<!--[\s\S]*?(?:-->|$)|<![a-zA-Z][^>]*>?|<\/?[a-zA-Z][\w-]*(?:\s+[^\s"'=<>\/`]+(?:\s*=\s*(?:"[^"]*"?|'[^']*'?|[^\s"'=<>`]+))?)*\s*\/?>?/g;
const ATTR_RE = /("[^"]*"?|'[^']*'?)|(=)|([^\s"'=]+)|(\s+)/g;

function highlightTag(tok) {
  if (tok.startsWith('<!--')) return `<span class="ha-tk-comment">${esc(tok)}</span>`;
  if (tok.startsWith('<!')) return `<span class="ha-tk-doctype">${esc(tok)}</span>`;
  const m = tok.match(/^(<\/?)([a-zA-Z][\w-]*)([\s\S]*?)(\/?>)?$/);
  if (!m) return esc(tok);
  const [, open, name, attrs, close = ''] = m;
  let out = `<span class="ha-tk-punct">${esc(open)}</span><span class="ha-tk-tag">${name}</span>`;
  for (const a of attrs.matchAll(ATTR_RE)) {
    if (a[1]) out += `<span class="ha-tk-value">${esc(a[1])}</span>`;
    else if (a[2]) out += '<span class="ha-tk-punct">=</span>';
    else if (a[3]) out += `<span class="ha-tk-attr">${esc(a[3])}</span>`;
    else out += a[4];
  }
  return `${out}<span class="ha-tk-punct">${esc(close)}</span>`;
}

function highlight(code) {
  let out = '';
  let last = 0;
  for (const m of code.matchAll(TOKEN_RE)) {
    out += esc(code.slice(last, m.index));
    out += highlightTag(m[0]);
    last = m.index + m[0].length;
  }
  // Trailing newline keeps the overlay as tall as the textarea
  return `${out}${esc(code.slice(last))}\n`;
}

/* ================================================================== */
/* Bulbuli avatar                                                       */
/* ================================================================== */

export function BulbuliAvatar({ mood = 'idle', size = 64 }) {
  const eyeY = mood === 'worried' ? 37 : 35;
  return (
    <svg className={`ha-bulbuli ha-bulbuli--${mood}`} width={size} height={size} viewBox="0 0 80 80" aria-hidden="true">
      {/* tail + body */}
      <path d="M14 58 L4 70 L20 64 Z" fill="#5a4a3c" />
      <ellipse cx="38" cy="54" rx="24" ry="20" fill="#6b5a4c" />
      <ellipse cx="44" cy="58" rx="15" ry="13" fill="#a8988a" />
      <circle cx="22" cy="66" r="6" fill="#e0283f" />
      {/* wing */}
      <ellipse className="ha-bulbuli-wing" cx="30" cy="52" rx="11" ry="8" fill="#564739" transform="rotate(-20 30 52)" />
      {/* head + crest */}
      <path d="M38 18 L44 2 L50 18 Z" fill="#1d1c22" />
      <circle cx="46" cy="30" r="16" fill="#1d1c22" />
      {/* eye */}
      <circle cx="52" cy={eyeY - 7} r="5.5" fill="#fff" />
      <circle className="ha-bulbuli-pupil" cx="53.5" cy={eyeY - 7} r="3" fill="#111" />
      <circle cx="54.5" cy={eyeY - 9} r="1" fill="#fff" />
      {mood === 'worried' && <path d="M46 20 L57 22" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />}
      {/* cheek + beak */}
      <ellipse cx="55" cy="35" rx="3.5" ry="2" fill="#ff7a8a" />
      <path d="M60 29 L71 31 L60 34 Z" fill="#f2b33d" />
      {mood === 'happy' && <path d="M59 34 Q63 38 67 34" stroke="#f2b33d" strokeWidth="1.5" fill="none" />}
    </svg>
  );
}

/* ================================================================== */
/* Editor                                                               */
/* ================================================================== */

const LINE_HEIGHT = 22;
const PAD = 12;

export default function WorkspaceEditor({
  level,
  code,
  onChange,
  validation,
  checkState,
  onHintUsed,
  onReset,
  stuckDelayMs = 30000,
}) {
  const taRef = useRef(null);
  const preRef = useRef(null);
  const gutterRef = useRef(null);
  const markersRef = useRef(null);
  const pendingSel = useRef(null);

  const [hintStage, setHintStage] = useState(0);
  const [stuck, setStuck] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const targetTags = level?.targetTags || [];
  const unlocks = level?.['3dUnlocks'] || {};
  const typed = validation?.typedTags || {};
  const broken = useMemo(() => new Set(validation?.brokenTags || []), [validation]);

  /* ---------- objectives ---------- */
  const objectives = targetTags.map((tag) => ({
    tag,
    reward: unlocks[tag] ? prettyKey(unlocks[tag]) : null,
    status: !typed[tag] ? 'todo' : broken.has(tag) ? 'error' : 'done',
  }));
  const doneCount = objectives.filter((o) => o.status === 'done').length;
  const allDone = doneCount === objectives.length && objectives.length > 0;
  const firstUnmet = objectives.find((o) => o.status !== 'done')?.tag;

  // Errors shown live: everything except "missing tag" (that's the checklist's job)
  const liveErrors = (validation?.errors || []).filter((e) => e.type !== 'MISSING_TAG');
  const errorLines = useMemo(
    () => [...new Set(liveErrors.map((e) => e.line).filter(Boolean))],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [validation],
  );

  /* ---------- stuck detection ---------- */
  const lastProgress = useRef({ count: -1, at: Date.now() });
  useEffect(() => {
    if (doneCount > lastProgress.current.count) {
      lastProgress.current = { count: doneCount, at: Date.now() };
      setStuck(false);
    } else if (doneCount < lastProgress.current.count) {
      lastProgress.current.count = doneCount;
    }
  }, [doneCount]);

  useEffect(() => {
    lastProgress.current = { count: -1, at: Date.now() };
    setHintStage(0);
    setStuck(false);
    setConfirmReset(false);
  }, [level?.id]);

  useEffect(() => {
    const id = setInterval(() => {
      setStuck(!allDone && Date.now() - lastProgress.current.at > stuckDelayMs);
    }, 2000);
    return () => clearInterval(id);
  }, [allDone, stuckDelayMs]);

  // Hints are about one tag; once that tag is fixed, start fresh for the next one
  const hintTagRef = useRef(firstUnmet);
  useEffect(() => {
    if (hintTagRef.current !== firstUnmet) {
      hintTagRef.current = firstUnmet;
      setHintStage(0);
    }
  }, [firstUnmet]);

  /* ---------- editing ---------- */
  useLayoutEffect(() => {
    const ta = taRef.current;
    if (ta && pendingSel.current) {
      const [s, e] = pendingSel.current;
      pendingSel.current = null;
      ta.focus();
      ta.setSelectionRange(s, e);
    }
  }, [code]);

  // Replace [start, end) with text, keeping native undo where the browser allows it.
  const replaceRange = (start, end, text, selAfter) => {
    const ta = taRef.current;
    ta.focus();
    ta.setSelectionRange(start, end);
    let ok = false;
    try { ok = document.execCommand('insertText', false, text); } catch { ok = false; }
    if (ok && ta.value === code.slice(0, start) + text + code.slice(end)) {
      ta.setSelectionRange(...selAfter);
    } else {
      pendingSel.current = selAfter;
      onChange(code.slice(0, start) + text + code.slice(end));
    }
  };

  const insertTag = (tag) => {
    const ta = taRef.current;
    if (!ta) return;
    const snip = SNIPPETS[tag];
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const lineStart = code.lastIndexOf('\n', start - 1) + 1;
    const indent = code.slice(lineStart).match(/^[ \t]*/)[0];
    const ind = (s) => s.replace(/\n/g, `\n${indent}`);

    if (snip.text) {
      const text = ind(snip.text);
      replaceRange(start, end, text, [start + snip.caret, start + snip.caret]);
      return;
    }
    const open = ind(snip.open);
    const close = ind(snip.close);
    const selected = code.slice(start, end);
    const text = open + selected + close;
    if (snip.caret != null && !selected) {
      replaceRange(start, end, text, [start + snip.caret, start + snip.caret]);
    } else {
      // Caret inside the new tag, or keep the wrapped text selected
      replaceRange(start, end, text, [start + open.length, start + open.length + selected.length]);
    }
  };

  const insertExample = (tag) => {
    const ta = taRef.current;
    if (!ta) return;
    const pos = ta.selectionStart;
    const lineStart = code.lastIndexOf('\n', pos - 1) + 1;
    const indent = code.slice(lineStart).match(/^[ \t]*/)[0];
    const text = EXAMPLES[tag].replace(/\n/g, `\n${indent}`);
    replaceRange(pos, pos, text, [pos + text.length, pos + text.length]);
  };

  const onKeyDown = (e) => {
    const ta = e.currentTarget;
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      const s = ta.selectionStart;
      // Caret right before a closing tag (e.g. just after inserting <h1></h1>)? Tab jumps past it.
      const closing = s === ta.selectionEnd && code.slice(s).match(/^<\/[a-zA-Z][\w-]*>/);
      if (closing) {
        ta.setSelectionRange(s + closing[0].length, s + closing[0].length);
        return;
      }
      replaceRange(s, ta.selectionEnd, '  ', [s + 2, s + 2]);
    } else if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      // Keep the current indentation on the new line
      const s = ta.selectionStart;
      const lineStart = code.lastIndexOf('\n', s - 1) + 1;
      const indent = code.slice(lineStart, s).match(/^[ \t]*/)[0];
      if (indent) {
        e.preventDefault();
        const text = `\n${indent}`;
        replaceRange(s, ta.selectionEnd, text, [s + text.length, s + text.length]);
      }
    }
  };

  const syncScroll = () => {
    const ta = taRef.current;
    const t = `translate(${-ta.scrollLeft}px, ${-ta.scrollTop}px)`;
    preRef.current.style.transform = t;
    markersRef.current.style.transform = `translateY(${-ta.scrollTop}px)`;
    gutterRef.current.style.transform = `translateY(${-ta.scrollTop}px)`;
  };
  useLayoutEffect(syncScroll, [code]);

  const jumpToLine = (line) => {
    const ta = taRef.current;
    if (!ta || !line) return;
    let pos = 0;
    for (let i = 1; i < line; i += 1) pos = code.indexOf('\n', pos) + 1;
    const lineEnd = code.indexOf('\n', pos);
    ta.focus();
    ta.setSelectionRange(pos, lineEnd === -1 ? code.length : lineEnd);
    ta.scrollTop = Math.max(0, (line - 3) * LINE_HEIGHT);
    syncScroll();
  };

  const lineCount = code.split('\n').length;
  const highlighted = useMemo(() => highlight(code), [code]);

  /* ---------- what Bulbuli says ---------- */
  const checkIsCurrent = checkState && checkState.code === code;
  const bubble = (() => {
    if (checkIsCurrent && checkState.status === 'pass') {
      return { mood: 'happy', text: 'Hooray! You built it! Every tag is in the right place.' };
    }
    if (hintStage > 0 && firstUnmet) {
      if (hintStage === 1) return { mood: 'thinking', text: TAG_TIPS[firstUnmet] || level.hintText };
      if (hintStage === 2) return { mood: 'thinking', text: level.hintText };
      return { mood: 'thinking', text: `Here's an example you can drop in:`, example: firstUnmet };
    }
    if (checkIsCurrent && checkState.status === 'fail') {
      const r = checkState.result;
      const first = r.errors.find((e) => e.type !== 'MISSING_TAG');
      if (first) return { mood: 'worried', text: `Almost! ${first.message}`, line: first.line };
      return {
        mood: 'worried',
        text: `So close! Still missing: ${r.missingTags.map((t) => `<${t}>`).join(', ')}.`,
      };
    }
    if (liveErrors.length && liveErrors[0].line) {
      return { mood: 'worried', text: `Hmm… ${liveErrors[0].message}`, line: liveErrors[0].line };
    }
    if (allDone) return { mood: 'happy', text: 'Looks great! Press "Check Code" to finish the level.' };
    if (stuck) return { mood: 'thinking', text: 'Stuck? That\'s okay! Tap "Give me a hint" and I\'ll help.' };
    if (doneCount > 0) {
      return { mood: 'idle', text: `Nice! ${doneCount} of ${objectives.length} built. Next up: <${firstUnmet}>.` };
    }
    return { mood: 'idle', text: level?.instructions };
  })();

  const askHint = () => {
    if (!firstUnmet) return;
    setHintStage((s) => Math.min(3, s + 1));
    setStuck(false);
    lastProgress.current.at = Date.now();
    onHintUsed?.();
  };

  /* ---------- render ---------- */
  return (
    <section className="ha-editor" aria-label="Code workspace">
      {/* Bulbuli */}
      <div className={`ha-coach ha-coach--${bubble.mood}`}>
        <BulbuliAvatar mood={bubble.mood} />
        <div className="ha-bubble" aria-live="polite">
          <p>{bubble.text}</p>
          {bubble.example && (
            <div className="ha-example">
              <pre>{EXAMPLES[bubble.example]}</pre>
              <button type="button" className="ha-btn ha-btn--small" onClick={() => insertExample(bubble.example)}>
                Insert at cursor
              </button>
            </div>
          )}
          <div className="ha-bubble-actions">
            {bubble.line && (
              <button type="button" className="ha-link" onClick={() => jumpToLine(bubble.line)}>
                Show me line {bubble.line}
              </button>
            )}
            {firstUnmet && hintStage < 3 && (
              <button type="button" className="ha-link" onClick={askHint}>
                {hintStage === 0 ? 'Give me a hint' : 'Another hint, please'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Objectives */}
      <ul className="ha-objectives" aria-label="Level goals">
        {objectives.map((o) => (
          <li key={o.tag} className={`ha-obj ha-obj--${o.status}`}>
            <span className="ha-obj-icon" aria-hidden="true">{o.status === 'done' ? '✓' : o.status === 'error' ? '!' : '○'}</span>
            <code>&lt;{o.tag}&gt;</code>
            {o.reward && <span className="ha-obj-reward">{o.reward}</span>}
            <span className="ha-sr">{o.status === 'done' ? 'done' : o.status === 'error' ? 'has an error' : 'to do'}</span>
          </li>
        ))}
      </ul>

      {/* Palette */}
      <div className="ha-palette" role="toolbar" aria-label="Insert a tag">
        {PALETTE_GROUPS.map((g) => (
          <div key={g.label} className="ha-palette-group">
            <span className="ha-palette-label">{g.label}</span>
            {g.tags.map((tag) => (
              <button
                key={tag}
                type="button"
                className={`ha-chip${targetTags.includes(tag) ? ' ha-chip--goal' : ''}`}
                onMouseDown={(e) => e.preventDefault() /* keep textarea selection */}
                onClick={() => insertTag(tag)}
                title={SNIPPETS[tag].text ? `Insert <${tag}>` : `Insert <${tag}></${tag}> — wraps selected text; press Tab to jump past </${tag}>`}
              >
                &lt;{tag}&gt;
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Code */}
      <div className="ha-code">
        <div className="ha-gutter" aria-hidden="true">
          <div ref={gutterRef} className="ha-gutter-inner" style={{ paddingTop: PAD }}>
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i} className={errorLines.includes(i + 1) ? 'ha-gutter-err' : undefined}>{i + 1}</div>
            ))}
          </div>
        </div>
        <div className="ha-code-area">
          <div ref={markersRef} className="ha-markers" aria-hidden="true">
            {errorLines.map((line) => (
              <div key={line} className="ha-marker" style={{ top: PAD + (line - 1) * LINE_HEIGHT }} />
            ))}
          </div>
          <pre ref={preRef} className="ha-highlight" aria-hidden="true" dangerouslySetInnerHTML={{ __html: highlighted }} />
          <textarea
            ref={taRef}
            className="ha-textarea"
            value={code}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            onScroll={syncScroll}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            wrap="off"
            aria-label="HTML code editor"
          />
        </div>
      </div>

      {/* Problems */}
      <div className="ha-problems" aria-live="polite">
        {liveErrors.length === 0 ? (
          <p className="ha-problems-ok">✓ No syntax problems</p>
        ) : (
          <ul>
            {liveErrors.slice(0, 4).map((e, i) => (
              <li key={i}>
                {e.line ? (
                  <button type="button" className="ha-link" onClick={() => jumpToLine(e.line)}>Line {e.line}</button>
                ) : <span className="ha-problem-tag">&lt;{e.tag}&gt;</span>}
                <span>{e.line ? e.message.replace(/^Line \d+: /, '') : e.message}</span>
              </li>
            ))}
            {liveErrors.length > 4 && <li className="ha-problems-more">+{liveErrors.length - 4} more</li>}
          </ul>
        )}
        <div className="ha-problems-actions">
          {confirmReset ? (
            <>
              <span>Start over?</span>
              <button type="button" className="ha-link" onClick={() => { onReset?.(); setConfirmReset(false); }}>Yes, reset</button>
              <button type="button" className="ha-link" onClick={() => setConfirmReset(false)}>Cancel</button>
            </>
          ) : (
            <button type="button" className="ha-link" onClick={() => setConfirmReset(true)}>Reset code</button>
          )}
        </div>
      </div>
    </section>
  );
}
