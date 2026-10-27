// Level 2: Text and Content.
export default [
  {
    id: 'html-2-01', level: 2, topic: 'Headings',
    question: `<p>Which heading element is the <strong>most important</strong> (and largest by default)?</p>`,
    options: ['<h6>', '<heading>', '<h1>', '<head>'],
    correctIndex: 2,
    hint: 'Headings are numbered by rank. Think "number one".',
    lesson: `
      <h3>Headings: &lt;h1&gt; to &lt;h6&gt;</h3>
      <p>HTML has six heading levels. <code>&lt;h1&gt;</code> is the most important (and largest by default), and <code>&lt;h6&gt;</code> is the least.</p>
      <pre><code>&lt;h1&gt;Cooking Basics&lt;/h1&gt;       &lt;!-- page title --&gt;
&lt;h2&gt;Knife Skills&lt;/h2&gt;         &lt;!-- section --&gt;
&lt;h3&gt;Dicing an Onion&lt;/h3&gt;      &lt;!-- sub-section --&gt;</code></pre>
      <h3>Good habits</h3>
      <ul>
        <li>Use <strong>one</strong> <code>&lt;h1&gt;</code> per page for its main topic.</li>
        <li>Don't skip levels (go h1 → h2 → h3, not h1 → h4).</li>
        <li>Pick headings for <strong>meaning</strong>, not size. Change size with CSS.</li>
      </ul>
      <p class="tip">⚠️ Don't confuse <code>&lt;h1&gt;</code> (a heading on the page) with <code>&lt;head&gt;</code> (the invisible metadata section).</p>`,
  },
  {
    id: 'html-2-02', level: 2, topic: 'Paragraphs & <br>',
    question: `<p>How does this code render in the browser?</p>
<pre><code>&lt;p&gt;Roses are red&lt;br&gt;Violets are blue&lt;/p&gt;</code></pre>`,
    options: [
      'Two separate paragraphs with a big gap',
      'One paragraph split across two lines',
      'One line: "Roses are redViolets are blue"',
      'An error, because <br> has no closing tag',
    ],
    correctIndex: 1,
    hint: '<br> stands for "break", and it stays inside the same paragraph.',
    lesson: `
      <h3>Paragraphs: &lt;p&gt;</h3>
      <p><code>&lt;p&gt;</code> wraps a block of text. Browsers add space above and below each paragraph automatically.</p>
      <h3>Line breaks: &lt;br&gt;</h3>
      <p><code>&lt;br&gt;</code> forces a new line <em>inside</em> the same block. It is a <strong>void element</strong>: no content and no closing tag.</p>
      <h3>Whitespace collapses!</h3>
      <p>Pressing Enter in your code does <strong>not</strong> create a new line on the page. Browsers collapse extra spaces and line breaks into one space:</p>
      <pre><code>&lt;p&gt;Hello
      World&lt;/p&gt;   →  Hello World</code></pre>
      <p class="tip">💡 Use <code>&lt;br&gt;</code> for addresses or poems. For space between sections, use separate paragraphs or CSS instead.</p>`,
  },
  {
    id: 'html-2-03', level: 2, topic: 'Horizontal rule <hr>',
    question: `<p>What does <code>&lt;hr&gt;</code> mean in modern HTML?</p>`,
    options: [
      'A thematic break, such as a change of topic or scene',
      'A hyperlink reference to another page',
      'A header row in a table',
      'Hidden text for screen readers',
    ],
    correctIndex: 0,
    hint: 'Browsers draw it as a horizontal line, but HTML cares about what that line means.',
    lesson: `
      <h3>&lt;hr&gt;: a thematic break</h3>
      <p><code>&lt;hr&gt;</code> separates two parts of content that are on different topics, like a scene change in a story. Browsers draw it as a horizontal line.</p>
      <pre><code>&lt;p&gt;…and that was the end of summer.&lt;/p&gt;
&lt;hr&gt;
&lt;p&gt;Winter arrived early that year…&lt;/p&gt;</code></pre>
      <ul>
        <li>It is a <strong>void element</strong>: no closing tag.</li>
        <li>Want a line purely for decoration? Use a CSS border instead.</li>
        <li>Old attributes like <code>size</code>, <code>noshade</code> and <code>color</code> are obsolete: style it with CSS.</li>
      </ul>`,
  },
  {
    id: 'html-2-04', level: 2, topic: '<strong> vs <b>',
    question: `<p>You're writing: <em>"Warning: do not unplug the device during the update."</em> Which element marks the warning as having <strong>strong importance</strong>?</p>`,
    options: ['<b>', '<strong>', '<big>', '<mark>'],
    correctIndex: 1,
    hint: 'One of these only makes text bold. Another says the text is important, seriously or urgently.',
    lesson: `
      <h3>Meaning vs looks</h3>
      <table>
        <tr><th>Element</th><th>Meaning</th></tr>
        <tr><td><code>&lt;strong&gt;</code></td><td>Strong importance, seriousness or urgency</td></tr>
        <tr><td><code>&lt;b&gt;</code></td><td>Draws attention <em>without</em> extra importance (e.g. a product name in a review)</td></tr>
        <tr><td><code>&lt;mark&gt;</code></td><td>Highlighted because it's relevant right now (e.g. search matches)</td></tr>
      </table>
      <pre><code>&lt;p&gt;&lt;strong&gt;Warning:&lt;/strong&gt; do not unplug the device.&lt;/p&gt;</code></pre>
      <p>Both <code>&lt;strong&gt;</code> and <code>&lt;b&gt;</code> look bold by default, but only <code>&lt;strong&gt;</code> tells browsers and assistive tech the text matters.</p>
      <p class="tip">💡 <code>&lt;big&gt;</code> is obsolete. To make text bigger, use CSS.</p>`,
  },
  {
    id: 'html-2-05', level: 2, topic: '<em> emphasis',
    question: `<p>Which element adds <strong>stress emphasis</strong> that changes how a sentence is read, as in: I <em>did</em> finish my homework!</p>`,
    options: ['<i>', '<u>', '<small>', '<em>'],
    correctIndex: 3,
    hint: 'Its name is short for "emphasis".',
    lesson: `
      <h3>&lt;em&gt; vs &lt;i&gt;</h3>
      <p><code>&lt;em&gt;</code> marks stress emphasis: the word you would say louder. Moving it changes the meaning:</p>
      <pre><code>&lt;p&gt;&lt;em&gt;I&lt;/em&gt; did finish my homework.&lt;/p&gt;   &lt;!-- me, not someone else --&gt;
&lt;p&gt;I &lt;em&gt;did&lt;/em&gt; finish my homework.&lt;/p&gt;   &lt;!-- it really happened --&gt;</code></pre>
      <p><code>&lt;i&gt;</code> looks the same (italic) but means "text in a different voice or mood": a foreign word, a technical term, a ship's name or a character's thought.</p>
      <pre><code>&lt;p&gt;The word &lt;i lang="fr"&gt;bonjour&lt;/i&gt; means hello.&lt;/p&gt;</code></pre>
      <p class="tip">💡 <code>&lt;u&gt;</code> is for unarticulated annotations (e.g. marking a misspelling). Avoid it for emphasis: underlined text looks like a link.</p>`,
  },
  {
    id: 'html-2-06', level: 2, topic: 'Subscript & superscript',
    question: `<p>Which markup writes the chemical formula for water, <strong>H₂O</strong>, correctly?</p>`,
    options: ['H<sup>2</sup>O', 'H<small>2</small>O', 'H<sub>2</sub>O', 'H<low>2</low>O'],
    correctIndex: 2,
    hint: 'The 2 sits below the line. "Sub" means below, as in submarine.',
    lesson: `
      <h3>&lt;sub&gt; and &lt;sup&gt;</h3>
      <table>
        <tr><th>Element</th><th>Position</th><th>Examples</th></tr>
        <tr><td><code>&lt;sub&gt;</code></td><td>Below the line</td><td>H₂O, CO₂</td></tr>
        <tr><td><code>&lt;sup&gt;</code></td><td>Above the line</td><td>x², 1st, footnote¹</td></tr>
      </table>
      <pre><code>&lt;p&gt;Water is H&lt;sub&gt;2&lt;/sub&gt;O.&lt;/p&gt;
&lt;p&gt;Area = πr&lt;sup&gt;2&lt;/sup&gt;&lt;/p&gt;</code></pre>
      <p class="tip">💡 Use them only when the position changes the meaning (formulas, exponents). For pure decoration, use CSS.</p>`,
  },
  {
    id: 'html-2-07', level: 2, topic: 'Quotations & citations',
    question: `<p>Which element is meant for a <strong>long quotation</strong> from another source, shown as its own block?</p>`,
    options: ['<blockquote>', '<q>', '<cite>', '<quote>'],
    correctIndex: 0,
    hint: 'It is a quote that forms a whole block of the page.',
    lesson: `
      <h3>Quoting other people</h3>
      <table>
        <tr><th>Element</th><th>Use it for</th></tr>
        <tr><td><code>&lt;blockquote&gt;</code></td><td>A longer, block-level quotation</td></tr>
        <tr><td><code>&lt;q&gt;</code></td><td>A short quote inside a sentence (browsers add quotation marks)</td></tr>
        <tr><td><code>&lt;cite&gt;</code></td><td>The <em>title of a work</em>: a book, film, song or article</td></tr>
      </table>
      <pre><code>&lt;blockquote cite="https://example.com/speech"&gt;
  &lt;p&gt;The best way to learn to code is to build things.&lt;/p&gt;
&lt;/blockquote&gt;
&lt;p&gt;— from &lt;cite&gt;Learning in Public&lt;/cite&gt;&lt;/p&gt;

&lt;p&gt;She said &lt;q&gt;see you tomorrow&lt;/q&gt; and left.&lt;/p&gt;</code></pre>
      <p class="tip">💡 The <code>cite</code> <em>attribute</em> holds a URL for the source. It isn't shown on the page; the <code>&lt;cite&gt;</code> <em>element</em> is visible.</p>`,
  },
  {
    id: 'html-2-08', level: 2, topic: 'Code & preformatted text',
    question: `<p>You want to show a <strong>multi-line code example</strong> where every space and line break is kept exactly as typed. Which markup fits best?</p>`,
    options: [
      '<p> with a <br> at the end of every line',
      '<kbd>…</kbd>',
      '<code>…</code> on its own',
      '<pre><code>…</code></pre>',
    ],
    correctIndex: 3,
    hint: 'One element means "preformatted": it keeps whitespace. Another means "this is code".',
    lesson: `
      <h3>Showing code</h3>
      <table>
        <tr><th>Element</th><th>Meaning</th></tr>
        <tr><td><code>&lt;code&gt;</code></td><td>A fragment of computer code (inline)</td></tr>
        <tr><td><code>&lt;pre&gt;</code></td><td>Preformatted: keeps spaces and line breaks, uses a monospace font</td></tr>
        <tr><td><code>&lt;kbd&gt;</code></td><td>Keyboard input, like <kbd>Ctrl</kbd> + <kbd>S</kbd></td></tr>
        <tr><td><code>&lt;samp&gt;</code></td><td>Sample output from a program</td></tr>
      </table>
      <pre><code>&lt;pre&gt;&lt;code&gt;function hello() {
  return "Hi!";
}&lt;/code&gt;&lt;/pre&gt;

&lt;p&gt;Press &lt;kbd&gt;Ctrl&lt;/kbd&gt; + &lt;kbd&gt;S&lt;/kbd&gt; to save.&lt;/p&gt;</code></pre>
      <p class="tip">⚠️ Inside <code>&lt;pre&gt;</code>, you still have to write <code>&amp;lt;</code> for <code>&lt;</code>, or the browser will treat it as a tag.</p>`,
  },
]
