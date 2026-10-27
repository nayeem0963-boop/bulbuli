// Level 7: Semantic HTML.
export default [
  {
    id: 'html-7-01', level: 7, topic: 'What is semantic HTML?',
    question: `<p>Which statement best describes <strong>semantic HTML</strong>?</p>`,
    options: [
      'Using as few elements as possible',
      'Building everything from <div>s and styling them with CSS',
      'Choosing elements that describe what the content is',
      'Writing every tag in lowercase',
    ],
    correctIndex: 2,
    hint: '"Semantic" means "relating to meaning".',
    lesson: `
      <h3>Semantic HTML</h3>
      <p>Semantic elements describe the <em>meaning</em> of their content, not how it looks. A <code>&lt;div&gt;</code> says nothing; a <code>&lt;nav&gt;</code> says "these are navigation links".</p>
      <pre><code>&lt;!-- ❌ Non-semantic --&gt;
&lt;div class="top"&gt;&lt;div class="title"&gt;My Blog&lt;/div&gt;&lt;/div&gt;

&lt;!-- ✅ Semantic --&gt;
&lt;header&gt;&lt;h1&gt;My Blog&lt;/h1&gt;&lt;/header&gt;</code></pre>
      <h3>Why it matters</h3>
      <ul>
        <li><strong>Accessibility:</strong> screen readers can list headings and jump between regions.</li>
        <li><strong>Search engines</strong> understand what's important on the page.</li>
        <li><strong>Built-in behaviour:</strong> a <code>&lt;button&gt;</code> works with the keyboard for free.</li>
        <li><strong>Readable code</strong> for your team and future you.</li>
      </ul>`,
  },
  {
    id: 'html-7-02', level: 7, topic: '<nav>',
    question: `<p>Which element is meant for a block of the page's <strong>main navigation links</strong>?</p>`,
    options: ['<nav>', '<header>', '<links>', '<menu-bar>'],
    correctIndex: 0,
    hint: 'Its name is a short form of "navigation".',
    lesson: `
      <h3>The &lt;nav&gt; element</h3>
      <pre><code>&lt;nav aria-label="Main"&gt;
  &lt;ul&gt;
    &lt;li&gt;&lt;a href="/"&gt;Home&lt;/a&gt;&lt;/li&gt;
    &lt;li&gt;&lt;a href="/courses"&gt;Courses&lt;/a&gt;&lt;/li&gt;
    &lt;li&gt;&lt;a href="/contact"&gt;Contact&lt;/a&gt;&lt;/li&gt;
  &lt;/ul&gt;
&lt;/nav&gt;</code></pre>
      <ul>
        <li>Screen-reader users can jump straight to the navigation.</li>
        <li>Links are often put in a list, so screen readers announce "list, 3 items".</li>
        <li>With several <code>&lt;nav&gt;</code>s, give each one an <code>aria-label</code> ("Main", "Footer") to tell them apart.</li>
      </ul>
      <p class="tip">💡 Use <code>&lt;nav&gt;</code> for <em>major</em> navigation blocks, not for every single link on the page. <code>&lt;links&gt;</code> and <code>&lt;menu-bar&gt;</code> aren't HTML elements.</p>`,
  },
  {
    id: 'html-7-03', level: 7, topic: '<main>',
    question: `<p>Which tag should replace <code>???</code> to hold the page's unique, main content?</p>
<pre><code>&lt;body&gt;
  &lt;header&gt;Logo + nav&lt;/header&gt;
  &lt;???&gt;Articles go here&lt;/???&gt;
  &lt;footer&gt;© 2026&lt;/footer&gt;
&lt;/body&gt;</code></pre>`,
    options: ['<section>', '<body>', '<content>', '<main>'],
    correctIndex: 3,
    hint: 'Its name literally means "the primary part".',
    lesson: `
      <h3>The semantic page layout</h3>
      <pre><code>&lt;body&gt;
  &lt;header&gt; … &lt;/header&gt;   &lt;!-- logo, site title, often the nav --&gt;
  &lt;main&gt;                  &lt;!-- the unique content of THIS page --&gt;
    &lt;article&gt; … &lt;/article&gt;
  &lt;/main&gt;
  &lt;footer&gt; … &lt;/footer&gt;   &lt;!-- copyright, contact, small links --&gt;
&lt;/body&gt;</code></pre>
      <table>
        <tr><th>Tag</th><th>Use it for</th></tr>
        <tr><td><code>&lt;header&gt;</code></td><td>Intro content: logo, title, nav</td></tr>
        <tr><td><code>&lt;main&gt;</code></td><td>The page's central content. Only <strong>one</strong> visible per page.</td></tr>
        <tr><td><code>&lt;footer&gt;</code></td><td>Closing info: copyright, links, contact</td></tr>
      </table>
      <p class="tip">💡 Repeated parts (header, nav, footer) go <em>outside</em> <code>&lt;main&gt;</code>. <code>&lt;content&gt;</code> is not an HTML element.</p>`,
  },
  {
    id: 'html-7-04', level: 7, topic: '<article> vs <section>',
    question: `<p>A blog's home page lists several posts. Each post <strong>makes sense on its own</strong> and could be shared separately. Which element should wrap each post?</p>`,
    options: ['<section>', '<article>', '<aside>', '<span>'],
    correctIndex: 1,
    hint: 'Think of a newspaper: each story is a self-contained…',
    lesson: `
      <h3>&lt;article&gt; vs &lt;section&gt;</h3>
      <table>
        <tr><th>&lt;article&gt;</th><th>&lt;section&gt;</th></tr>
        <tr><td>Self-contained: makes sense on its own</td><td>A themed part of something bigger</td></tr>
        <tr><td>Blog post, news story, product card, comment</td><td>Chapters, "Features", "Pricing", "FAQ"</td></tr>
      </table>
      <pre><code>&lt;main&gt;
  &lt;article&gt;
    &lt;h2&gt;How I learned HTML&lt;/h2&gt;
    &lt;section&gt;
      &lt;h3&gt;Week 1&lt;/h3&gt; …
    &lt;/section&gt;
  &lt;/article&gt;
  &lt;article&gt;
    &lt;h2&gt;My first website&lt;/h2&gt; …
  &lt;/article&gt;
&lt;/main&gt;</code></pre>
      <p class="tip">💡 Quick test: could you publish it on another site, or in an RSS feed, and it would still make sense? Then it's an <code>&lt;article&gt;</code>. A <code>&lt;section&gt;</code> should normally have a heading.</p>`,
  },
  {
    id: 'html-7-05', level: 7, topic: '<aside>',
    question: `<p>A news story has a <strong>"Did you know?" fact box</strong> beside it: related, but not part of the story's main text. Which element fits best?</p>`,
    options: ['<footer>', '<main>', '<article>', '<aside>'],
    correctIndex: 3,
    hint: 'In a play, an actor speaks an "aside" to the audience: a remark off to the side of the main action.',
    lesson: `
      <h3>The &lt;aside&gt; element</h3>
      <p><code>&lt;aside&gt;</code> holds content that is <strong>related to</strong> the content around it, but separate from it: fact boxes, pull quotes, glossaries, related links, sidebars.</p>
      <pre><code>&lt;article&gt;
  &lt;h2&gt;Bees in the city&lt;/h2&gt;
  &lt;p&gt;Rooftop gardens are bringing bees back…&lt;/p&gt;
  &lt;aside&gt;
    &lt;h3&gt;Did you know?&lt;/h3&gt;
    &lt;p&gt;One honeybee can visit thousands of flowers in a day.&lt;/p&gt;
  &lt;/aside&gt;
&lt;/article&gt;</code></pre>
      <p class="tip">💡 If you could remove it and the main content would still be complete, it's probably an <code>&lt;aside&gt;</code>.</p>`,
  },
  {
    id: 'html-7-06', level: 7, topic: '<div> vs <span>',
    question: `<p>What is the key difference between <code>&lt;div&gt;</code> and <code>&lt;span&gt;</code>?</p>`,
    options: [
      '<div> is a block container; <span> is an inline container',
      '<span> is for images; <div> is for text',
      'They behave exactly the same',
      '<div> can only be used inside a <span>',
    ],
    correctIndex: 0,
    hint: 'One stacks like building blocks; the other flows within a line of text.',
    lesson: `
      <h3>Generic containers</h3>
      <p>Neither <code>&lt;div&gt;</code> nor <code>&lt;span&gt;</code> has any meaning. They are plain boxes used to group content for styling or scripting.</p>
      <table>
        <tr><th>&lt;div&gt; (block)</th><th>&lt;span&gt; (inline)</th></tr>
        <tr><td>Starts on a new line, full width</td><td>Stays inside the line of text</td></tr>
        <tr><td>Groups sections: cards, rows, wrappers</td><td>Marks a word or phrase</td></tr>
      </table>
      <pre><code>&lt;div class="card"&gt;
  &lt;h2&gt;Profile&lt;/h2&gt;
  &lt;p&gt;Status: &lt;span class="online"&gt;Online&lt;/span&gt;&lt;/p&gt;
&lt;/div&gt;</code></pre>
      <p>Dropping a <code>&lt;div&gt;</code> into the middle of a sentence would push that word onto its own line; a <code>&lt;span&gt;</code> keeps the sentence intact.</p>
      <p class="tip">💡 Reach for a <code>&lt;div&gt;</code> or <code>&lt;span&gt;</code> only when no element with real meaning (<code>&lt;nav&gt;</code>, <code>&lt;strong&gt;</code>, <code>&lt;article&gt;</code>…) fits.</p>`,
  },
  {
    id: 'html-7-07', level: 7, topic: 'Landmarks & structure',
    question: `<p>Screen-reader users often jump between page <strong>landmarks</strong> (banner, navigation, main, footer). Which structure provides them without any extra attributes?</p>`,
    options: [
      '<div id="header">, <div id="nav">, <div id="main">, <div id="footer">',
      '<b>, <i>, <u> and <small>',
      '<header>, <nav>, <main> and <footer>',
      '<span class="landmark"> around each part',
    ],
    correctIndex: 2,
    hint: 'IDs and classes are just names for CSS. Which option uses elements that carry meaning themselves?',
    lesson: `
      <h3>Landmarks come free with semantic elements</h3>
      <table>
        <tr><th>Element</th><th>Landmark announced</th></tr>
        <tr><td><code>&lt;header&gt;</code> (top of page)</td><td>banner</td></tr>
        <tr><td><code>&lt;nav&gt;</code></td><td>navigation</td></tr>
        <tr><td><code>&lt;main&gt;</code></td><td>main</td></tr>
        <tr><td><code>&lt;aside&gt;</code></td><td>complementary</td></tr>
        <tr><td><code>&lt;footer&gt;</code> (bottom of page)</td><td>content info</td></tr>
      </table>
      <p>An <code>id="nav"</code> on a <code>&lt;div&gt;</code> means nothing to assistive technology. It's only a name for your CSS or JavaScript.</p>
      <h3>Headings are a map too</h3>
      <p>Many screen-reader users navigate by headings first, so a clean <code>h1 → h2 → h3</code> outline is just as important as landmarks.</p>`,
  },
  {
    id: 'html-7-08', level: 7, topic: 'Common semantic mistakes',
    question: `<p>What is the main problem with this "button"?</p>
<pre><code>&lt;div class="btn" onclick="save()"&gt;Save&lt;/div&gt;</code></pre>`,
    options: [
      "Keyboard users can't reach or press it, and it isn't announced as a button. Use <button>.",
      "A <div> can't have a class attribute",
      'onclick only works on links',
      'Nothing: this is the recommended pattern',
    ],
    correctIndex: 0,
    hint: 'Try to use it without a mouse. Can you Tab to it? Does Enter work?',
    lesson: `
      <h3>Use the real element</h3>
      <pre><code>&lt;!-- ❌ looks like a button, isn't one --&gt;
&lt;div class="btn" onclick="save()"&gt;Save&lt;/div&gt;

&lt;!-- ✅ --&gt;
&lt;button type="button" onclick="save()"&gt;Save&lt;/button&gt;</code></pre>
      <p>A real <code>&lt;button&gt;</code> is focusable with Tab, works with Enter and Space, and is announced as "Save, button", all for free.</p>
      <h3>Other common mistakes</h3>
      <ul>
        <li>Picking headings by size (<code>&lt;h4&gt;</code> because it looks small) instead of by outline level.</li>
        <li>Using <code>&lt;br&gt;&lt;br&gt;</code> for spacing instead of paragraphs or CSS.</li>
        <li>Using <code>&lt;table&gt;</code> for page layout.</li>
        <li>Links that act like buttons and buttons that act like links (see Level 10).</li>
        <li>Wrapping everything in <code>&lt;section&gt;</code> when a <code>&lt;div&gt;</code> would do.</li>
      </ul>`,
  },
]
