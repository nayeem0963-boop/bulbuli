// Level 1: HTML Fundamentals. Question format: see src/courses/README.md.
export default [
  {
    id: 'html-1-01', level: 1, topic: 'What is HTML?',
    question: `<p>What is HTML's main job on a web page?</p>`,
    options: [
      'Choosing colours, fonts and layout',
      'Describing the structure and meaning of the content',
      'Running logic, like checking a password',
      'Storing user accounts in a database',
    ],
    correctIndex: 1,
    hint: 'HTML stands for HyperText Markup Language. Markup labels what each piece of content is.',
    lesson: `
      <h3>HTML, CSS and JavaScript</h3>
      <p><strong>HTML</strong> (HyperText Markup Language) <em>marks up</em> content: it tells the browser "this is a heading", "this is a paragraph", "this is a link".</p>
      <table>
        <tr><th>Language</th><th>Job</th><th>Think of it as…</th></tr>
        <tr><td>HTML</td><td>Structure and meaning</td><td>The skeleton</td></tr>
        <tr><td>CSS</td><td>Colours, fonts, layout</td><td>The clothes</td></tr>
        <tr><td>JavaScript</td><td>Behaviour and logic</td><td>The muscles</td></tr>
      </table>
      <pre><code>&lt;h1&gt;My Recipes&lt;/h1&gt;
&lt;p&gt;Simple dishes anyone can cook.&lt;/p&gt;</code></pre>
      <p class="tip">💡 HTML is not a programming language: it has no loops or calculations. It is a <em>markup</em> language.</p>`,
  },
  {
    id: 'html-1-02', level: 1, topic: 'DOCTYPE',
    question: `<p>What does this line at the very top of an HTML file do?</p>
<pre><code>&lt;!DOCTYPE html&gt;</code></pre>`,
    options: [
      "Creates the page's main heading",
      'Tells the browser the page uses modern HTML5',
      'Links a CSS stylesheet',
      'Sets the text shown in the browser tab',
    ],
    correctIndex: 1,
    hint: "It's a declaration about which version of HTML the document follows.",
    lesson: `
      <h3>The DOCTYPE declaration</h3>
      <p><code>&lt;!DOCTYPE html&gt;</code> is <strong>not an HTML element</strong>. It is an instruction to the browser: <em>"read this page using the modern HTML rules."</em></p>
      <p>Without it, browsers fall back to <strong>"quirks mode"</strong>, an old compatibility mode where layouts can behave strangely.</p>
      <pre><code>&lt;!DOCTYPE html&gt;   &lt;!-- always line 1 --&gt;
&lt;html lang="en"&gt;
  ...
&lt;/html&gt;</code></pre>
      <ul>
        <li>It must be the <strong>very first line</strong> of the file.</li>
        <li>It is not case-sensitive, but <code>&lt;!DOCTYPE html&gt;</code> is the convention.</li>
        <li>It has no closing tag.</li>
      </ul>
      <p class="tip">💡 In many code editors, typing <code>!</code> and pressing Tab generates the whole starter skeleton, DOCTYPE included.</p>`,
  },
  {
    id: 'html-1-03', level: 1, topic: '<html> root',
    question: `<p>Which element is the <strong>root</strong> that wraps all other content of an HTML page?</p>`,
    options: ['<body>', '<root>', '<html>', '<head>'],
    correctIndex: 2,
    hint: 'It shares its name with the language itself.',
    lesson: `
      <h3>The root element</h3>
      <p>Every HTML page is a tree of elements. The top of that tree, the <strong>root</strong>, is <code>&lt;html&gt;</code>. Everything except the DOCTYPE lives inside it.</p>
      <pre><code>&lt;!DOCTYPE html&gt;
&lt;html lang="en"&gt;
  &lt;head&gt; ... &lt;/head&gt;
  &lt;body&gt; ... &lt;/body&gt;
&lt;/html&gt;</code></pre>
      <p>The <code>lang="en"</code> attribute tells browsers, search engines and screen readers which language the page is written in.</p>
      <p class="tip">💡 <code>&lt;html&gt;</code> has exactly two children: <code>&lt;head&gt;</code> and <code>&lt;body&gt;</code>.</p>`,
  },
  {
    id: 'html-1-04', level: 1, topic: '<head> vs <body>',
    question: `<p>Where should the <code>&lt;title&gt;</code> element go?</p>
<pre><code>&lt;html&gt;
  &lt;head&gt; ??? &lt;/head&gt;
  &lt;body&gt; ??? &lt;/body&gt;
&lt;/html&gt;</code></pre>`,
    options: ['Inside <body>', 'Inside <head>', 'After </html>', 'Inside an <h1>'],
    correctIndex: 1,
    hint: 'The title shows in the browser tab, not on the page itself. Where does information about the page go?',
    lesson: `
      <h3>&lt;head&gt; vs &lt;body&gt;</h3>
      <table>
        <tr><th>&lt;head&gt;</th><th>&lt;body&gt;</th></tr>
        <tr><td>Information <em>about</em> the page</td><td>The content people <em>see</em></td></tr>
        <tr><td><code>&lt;title&gt;</code>, <code>&lt;meta&gt;</code>, <code>&lt;link&gt;</code>, <code>&lt;style&gt;</code></td><td>Headings, paragraphs, images, links, forms…</td></tr>
      </table>
      <pre><code>&lt;head&gt;
  &lt;meta charset="UTF-8"&gt;
  &lt;title&gt;My First Page&lt;/title&gt;  &lt;!-- shows in the tab --&gt;
&lt;/head&gt;
&lt;body&gt;
  &lt;h1&gt;Welcome!&lt;/h1&gt;              &lt;!-- shows on the page --&gt;
&lt;/body&gt;</code></pre>
      <p class="tip">💡 The <code>&lt;title&gt;</code> is also what appears in search results and bookmarks, so make it descriptive.</p>`,
  },
  {
    id: 'html-1-05', level: 1, topic: 'Tags & elements',
    question: `<p>In <code>&lt;p&gt;Hello&lt;/p&gt;</code>, what do we call the <strong>complete unit</strong>: opening tag, content and closing tag together?</p>`,
    options: ['An attribute', 'A selector', 'An element', 'A comment'],
    correctIndex: 2,
    hint: 'Tags are the parts in angle brackets. The whole thing they build is something else.',
    lesson: `
      <h3>Tags vs elements</h3>
      <pre><code>&lt;p&gt;Hello&lt;/p&gt;
│  │    └─ closing tag (note the /)
│  └─ content
└─ opening tag</code></pre>
      <ul>
        <li>A <strong>tag</strong> is the markup in angle brackets: <code>&lt;p&gt;</code> or <code>&lt;/p&gt;</code>.</li>
        <li>An <strong>element</strong> is the whole unit: opening tag + content + closing tag.</li>
        <li><strong>Void elements</strong> such as <code>&lt;br&gt;</code>, <code>&lt;img&gt;</code> and <code>&lt;input&gt;</code> have no content and no closing tag.</li>
      </ul>
      <p>Elements can contain other elements. That is called <strong>nesting</strong>:</p>
      <pre><code>&lt;p&gt;I love &lt;strong&gt;HTML&lt;/strong&gt;!&lt;/p&gt;</code></pre>
      <p class="tip">💡 Forgetting the <code>/</code> in a closing tag is one of the most common beginner bugs.</p>`,
  },
  {
    id: 'html-1-06', level: 1, topic: 'Attribute syntax',
    question: `<p>Which line uses <strong>correct</strong> attribute syntax?</p>`,
    options: [
      '<img src="cat.jpg" alt="A cat">',
      '<img src: "cat.jpg">',
      '<img "src"=cat.jpg>',
      '<img (src="cat.jpg")>',
    ],
    correctIndex: 0,
    hint: 'Attributes look like name="value", separated by spaces.',
    lesson: `
      <h3>What are attributes?</h3>
      <p>Attributes add extra information to an element. They always go inside the <strong>opening tag</strong>.</p>
      <pre><code>&lt;tag name="value" another="value"&gt;</code></pre>
      <ul>
        <li><strong>name</strong>: the attribute, e.g. <code>src</code>, <code>href</code>, <code>class</code></li>
        <li><strong>=</strong>: an equals sign, not a colon</li>
        <li><strong>"value"</strong>: in quotes (double quotes are the convention)</li>
        <li>Several attributes are separated by <strong>spaces</strong></li>
      </ul>
      <pre><code>&lt;a href="https://example.com" title="Go to Example"&gt;Example&lt;/a&gt;
&lt;p class="intro" id="welcome"&gt;Hi!&lt;/p&gt;</code></pre>
      <p class="tip">💡 Some attributes are <strong>boolean</strong> and need no value: <code>&lt;input required&gt;</code> or <code>&lt;video controls&gt;</code>. You'll meet them again in Level 9.</p>`,
  },
  {
    id: 'html-1-07', level: 1, topic: 'Comments',
    question: `<p>Which of these is a correct <strong>HTML comment</strong>, ignored by the browser?</p>`,
    options: [
      '<comment>Main menu</comment>',
      '// Main menu',
      '/* Main menu */',
      '<!-- Main menu -->',
    ],
    correctIndex: 3,
    hint: 'It starts with an exclamation mark and two dashes inside an angle bracket.',
    lesson: `
      <h3>HTML comments</h3>
      <p>A comment is a note for humans. The browser doesn't display it.</p>
      <pre><code>&lt;!-- Main menu starts here --&gt;
&lt;nav&gt; ... &lt;/nav&gt;</code></pre>
      <ul>
        <li>Starts with <code>&lt;!--</code> and ends with <code>--&gt;</code>.</li>
        <li>It can span several lines.</li>
        <li><code>//</code> and <code>/* */</code> are comments in JavaScript and CSS, <strong>not</strong> HTML. In HTML, <code>// Main menu</code> would appear as visible text.</li>
      </ul>
      <p class="tip">⚠️ Comments are still sent to the browser, and anyone can read them with "View Source". Never put passwords or secrets in them.</p>`,
  },
  {
    id: 'html-1-08', level: 1, topic: 'Reading the document tree',
    question: `<p>Read this page. Which statement is <strong>true</strong>?</p>
<pre><code>&lt;!DOCTYPE html&gt;
&lt;html lang="en"&gt;
  &lt;head&gt;
    &lt;title&gt;Pet Shop&lt;/title&gt;
  &lt;/head&gt;
  &lt;body&gt;
    &lt;h1&gt;Welcome&lt;/h1&gt;
    &lt;p&gt;We sell fish.&lt;/p&gt;
  &lt;/body&gt;
&lt;/html&gt;</code></pre>`,
    options: [
      '<h1> and <p> are both children of <body>',
      '<title> is a child of <body>',
      '<head> is nested inside <body>',
      '<p> is the parent of <h1>',
    ],
    correctIndex: 0,
    hint: 'Look at the indentation: which element directly wraps the heading and the paragraph?',
    lesson: `
      <h3>Parents, children and siblings</h3>
      <p>Nested elements form a family tree:</p>
      <pre><code>html
├── head
│   └── title
└── body
    ├── h1
    └── p</code></pre>
      <ul>
        <li><strong>Parent</strong>: the element that directly wraps another. <code>&lt;body&gt;</code> is the parent of <code>&lt;h1&gt;</code>.</li>
        <li><strong>Child</strong>: an element directly inside another. <code>&lt;title&gt;</code> is a child of <code>&lt;head&gt;</code>.</li>
        <li><strong>Siblings</strong>: children of the same parent. <code>&lt;h1&gt;</code> and <code>&lt;p&gt;</code> are siblings.</li>
      </ul>
      <p class="tip">💡 Indent each child two spaces deeper than its parent. The browser doesn't care, but it makes the tree easy to read.</p>`,
  },
]
