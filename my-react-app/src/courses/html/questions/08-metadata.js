// Level 8: Metadata and Document Structure.
export default [
  {
    id: 'html-8-01', level: 8, topic: 'Character encoding',
    question: `<p>Which tag makes sure characters like <strong>é, ৳, অ and emoji 🎉</strong> display correctly?</p>`,
    options: [
      '<meta lang="UTF-8">',
      '<meta charset="UTF-8">',
      '<html encoding="UTF-8">',
      '<meta name="unicode">',
    ],
    correctIndex: 1,
    hint: 'The attribute name is short for "character set".',
    lesson: `
      <h3>Character encoding</h3>
      <p>Computers store text as numbers. The <strong>encoding</strong> tells the browser how to turn those numbers back into letters. <strong>UTF-8</strong> covers almost every writing system, plus emoji.</p>
      <pre><code>&lt;head&gt;
  &lt;meta charset="UTF-8"&gt;   &lt;!-- first thing in &lt;head&gt; --&gt;
  &lt;title&gt;আমার পাতা · My Page&lt;/title&gt;
&lt;/head&gt;</code></pre>
      <ul>
        <li>Put it <strong>early</strong>, within the first 1024 bytes of the file. The safest place is right after <code>&lt;head&gt;</code>.</li>
        <li>Save your file as UTF-8 in your editor too.</li>
        <li>Without it you may see garbage like <code>Ã©</code> instead of <code>é</code>.</li>
      </ul>
      <p class="tip">💡 <code>lang</code> (on <code>&lt;html&gt;</code>) says which <em>language</em> the text is in. <code>charset</code> says how the <em>characters</em> are encoded. They're different things.</p>`,
  },
  {
    id: 'html-8-02', level: 8, topic: 'Viewport meta tag',
    question: `<p>What does this tag do?</p>
<pre><code>&lt;meta name="viewport" content="width=device-width, initial-scale=1"&gt;</code></pre>`,
    options: [
      'Locks the page so users cannot zoom',
      'Sets the screen resolution of the device',
      "Makes the page use the phone's real width, instead of showing a shrunken desktop layout",
      'Hides the scrollbars',
    ],
    correctIndex: 2,
    hint: 'Without it, mobile browsers pretend the screen is about 980px wide and zoom out.',
    lesson: `
      <h3>The viewport meta tag</h3>
      <p>Early smartphones had to show websites built for desktops, so they render pages on a virtual canvas about 980px wide and then shrink it. Tiny text, lots of pinching.</p>
      <pre><code>&lt;meta name="viewport" content="width=device-width, initial-scale=1"&gt;</code></pre>
      <ul>
        <li><code>width=device-width</code>: use the device's real width.</li>
        <li><code>initial-scale=1</code>: start at 100% zoom.</li>
      </ul>
      <p>Together with responsive CSS, this is what makes a page "mobile-friendly".</p>
      <p class="tip">⚠️ Avoid <code>user-scalable=no</code> or <code>maximum-scale=1</code>: blocking zoom hurts people who need larger text.</p>`,
  },
  {
    id: 'html-8-03', level: 8, topic: 'Meta description',
    question: `<p>Which tag provides the short summary that search engines often show <strong>under your page title</strong> in results?</p>`,
    options: [
      '<meta name="description" content="…">',
      '<meta name="keywords" content="…">',
      '<meta name="summary" content="…">',
      '<meta name="author" content="…">',
    ],
    correctIndex: 0,
    hint: 'You are describing the page.',
    lesson: `
      <h3>The meta description</h3>
      <pre><code>&lt;head&gt;
  &lt;meta charset="UTF-8"&gt;
  &lt;title&gt;Learn HTML Forms | Pro Coder&lt;/title&gt;
  &lt;meta name="description"
        content="Build accessible HTML forms step by step, with labels, validation and the right input types."&gt;
&lt;/head&gt;</code></pre>
      <ul>
        <li>Write a unique, honest summary for each page, roughly 1–2 sentences.</li>
        <li>Search engines may use it as the snippet (or pick text from the page instead).</li>
        <li><code>name="keywords"</code> exists, but major search engines ignore it.</li>
      </ul>
      <p class="tip">💡 Social sites use separate "Open Graph" tags such as <code>&lt;meta property="og:title"&gt;</code> for link previews.</p>`,
  },
  {
    id: 'html-8-04', level: 8, topic: 'Favicons',
    question: `<p>Which line adds a <strong>favicon</strong>, the little icon in the browser tab?</p>`,
    options: [
      '<img rel="icon" src="favicon.svg">',
      '<meta name="favicon" content="favicon.svg">',
      '<icon src="favicon.svg">',
      '<link rel="icon" href="favicon.svg">',
    ],
    correctIndex: 3,
    hint: 'Resources the page relies on, like stylesheets and icons, are connected with a link in the <head>.',
    lesson: `
      <h3>The &lt;link&gt; element</h3>
      <p><code>&lt;link&gt;</code> connects the page to an external resource. The <code>rel</code> attribute says what the relationship is.</p>
      <pre><code>&lt;head&gt;
  &lt;link rel="icon" href="/favicon.svg" type="image/svg+xml"&gt;
  &lt;link rel="apple-touch-icon" href="/icons/apple-touch-icon.png"&gt;
  &lt;link rel="stylesheet" href="/css/style.css"&gt;
&lt;/head&gt;</code></pre>
      <ul>
        <li><code>&lt;link&gt;</code> is a void element and uses <code>href</code> (not <code>src</code>).</li>
        <li><code>rel="icon"</code>: the tab icon. <code>rel="stylesheet"</code>: a CSS file.</li>
      </ul>
      <p class="tip">💡 Browsers cache favicons heavily. If a new icon doesn't show, try a hard refresh.</p>`,
  },
  {
    id: 'html-8-05', level: 8, topic: 'Stylesheets & scripts',
    question: `<p>Which pair correctly loads an <strong>external stylesheet</strong> and an <strong>external script</strong>?</p>`,
    options: [
      '<style src="style.css"> and <script href="app.js"></script>',
      '<link rel="stylesheet" href="style.css"> and <script src="app.js" defer></script>',
      '<link src="style.css"> and <script src="app.js" />',
      '<css href="style.css"> and <js src="app.js"></js>',
    ],
    correctIndex: 1,
    hint: 'CSS files use <link> with href. Scripts use src and always need a closing tag.',
    lesson: `
      <h3>Connecting CSS and JavaScript</h3>
      <pre><code>&lt;head&gt;
  &lt;meta charset="UTF-8"&gt;
  &lt;title&gt;My Site&lt;/title&gt;
  &lt;link rel="stylesheet" href="style.css"&gt;
  &lt;script src="app.js" defer&gt;&lt;/script&gt;
&lt;/head&gt;</code></pre>
      <table>
        <tr><th></th><th>CSS</th><th>JavaScript</th></tr>
        <tr><td>External file</td><td><code>&lt;link rel="stylesheet" href&gt;</code></td><td><code>&lt;script src&gt;&lt;/script&gt;</code></td></tr>
        <tr><td>Inline code</td><td><code>&lt;style&gt;…&lt;/style&gt;</code></td><td><code>&lt;script&gt;…&lt;/script&gt;</code></td></tr>
      </table>
      <ul>
        <li><code>&lt;script&gt;</code> always needs <code>&lt;/script&gt;</code>, even when it's empty.</li>
        <li><code>defer</code> downloads the script without blocking the page and runs it after the HTML is parsed.</li>
      </ul>
      <p class="tip">💡 You'll write the CSS and JavaScript themselves in later Pro Coder courses.</p>`,
  },
  {
    id: 'html-8-06', level: 8, topic: 'What belongs in <head>',
    question: `<p>Which of these does <strong>not</strong> belong inside <code>&lt;head&gt;</code>?</p>`,
    options: ['<title>', '<meta>', '<link>', '<p>'],
    correctIndex: 3,
    hint: 'The head holds information about the page. Which of these is visible page content?',
    lesson: `
      <h3>Organising a document</h3>
      <pre><code>&lt;!DOCTYPE html&gt;
&lt;html lang="en"&gt;
&lt;head&gt;
  &lt;meta charset="UTF-8"&gt;
  &lt;meta name="viewport" content="width=device-width, initial-scale=1"&gt;
  &lt;title&gt;…&lt;/title&gt;
  &lt;meta name="description" content="…"&gt;
  &lt;link rel="icon" href="favicon.svg"&gt;
  &lt;link rel="stylesheet" href="style.css"&gt;
  &lt;script src="app.js" defer&gt;&lt;/script&gt;
&lt;/head&gt;
&lt;body&gt;
  &lt;!-- everything visible: headings, paragraphs, images… --&gt;
&lt;/body&gt;
&lt;/html&gt;</code></pre>
      <p>Allowed in <code>&lt;head&gt;</code>: <code>&lt;title&gt;</code>, <code>&lt;meta&gt;</code>, <code>&lt;link&gt;</code>, <code>&lt;style&gt;</code>, <code>&lt;script&gt;</code>, <code>&lt;base&gt;</code>, <code>&lt;noscript&gt;</code>.</p>
      <p>If a browser meets a <code>&lt;p&gt;</code> in the head, it quietly ends the head and starts the body there, so anything after it ends up in the wrong place.</p>
      <p class="tip">💡 Use the W3C validator (validator.w3.org) to catch nesting mistakes like this.</p>`,
  },
]
