// Level 3: Links and Navigation.
export default [
  {
    id: 'html-3-01', level: 3, topic: 'Anchor <a>',
    question: `<p>What will this code produce?</p>
<pre><code>&lt;a href="https://example.com"&gt;Visit&lt;/a&gt;</code></pre>`,
    options: [
      'An image linking to example.com',
      'A button that downloads a file',
      'Plain text that says https://example.com',
      'A clickable link with the text "Visit"',
    ],
    correctIndex: 3,
    hint: 'The "a" stands for anchor, and href holds the destination.',
    lesson: `
      <h3>Anchor elements: &lt;a&gt;</h3>
      <p>The <code>&lt;a&gt;</code> element creates a hyperlink. <code>href</code> (hypertext reference) is where it goes, and the content between the tags is what the user clicks.</p>
      <pre><code>&lt;a href="https://example.com"&gt;Visit&lt;/a&gt;</code></pre>
      <h3>Kinds of href</h3>
      <ul>
        <li><code>href="https://site.com"</code>: another website</li>
        <li><code>href="about.html"</code>: another page on your site</li>
        <li><code>href="#contact"</code>: jump to <code>id="contact"</code> on this page</li>
        <li><code>href="mailto:hi@site.com"</code>: open an email app</li>
      </ul>
      <p class="tip">💡 Use descriptive link text. "Read our pricing guide" beats "click here" for both accessibility and search engines.</p>`,
  },
  {
    id: 'html-3-02', level: 3, topic: 'Absolute URLs',
    question: `<p>Which <code>href</code> value is an <strong>absolute URL</strong>?</p>`,
    options: ['about.html', '../images/', 'https://developer.mozilla.org/', '#top'],
    correctIndex: 2,
    hint: 'An absolute URL works the same from any page, because it includes the scheme and domain.',
    lesson: `
      <h3>Absolute vs relative URLs</h3>
      <table>
        <tr><th>Type</th><th>Example</th><th>Meaning</th></tr>
        <tr><td>Absolute</td><td><code>https://example.com/about.html</code></td><td>Full address with scheme (<code>https://</code>) and domain</td></tr>
        <tr><td>Root-relative</td><td><code>/about.html</code></td><td>From the root of the current site</td></tr>
        <tr><td>Relative</td><td><code>about.html</code>, <code>../img/</code></td><td>From the folder of the current page</td></tr>
        <tr><td>Fragment</td><td><code>#top</code></td><td>A spot on the current page</td></tr>
      </table>
      <p class="tip">💡 Use absolute URLs for other websites, and relative URLs for pages on your own site, so your links still work if the domain changes.</p>`,
  },
  {
    id: 'html-3-03', level: 3, topic: 'Relative paths',
    question: `<p>Your site looks like this. Which link in <code>contact.html</code> goes to <code>index.html</code>?</p>
<pre><code>my-site/
├── index.html
└── pages/
    └── contact.html</code></pre>`,
    options: ['index.html', '../index.html', 'pages/index.html', './pages/index.html'],
    correctIndex: 1,
    hint: 'You need to go up one folder from pages/ first.',
    lesson: `
      <h3>Moving around folders</h3>
      <p>A relative path starts from the folder of the <strong>current page</strong>.</p>
      <table>
        <tr><th>Path</th><th>Means</th></tr>
        <tr><td><code>file.html</code> or <code>./file.html</code></td><td>Same folder</td></tr>
        <tr><td><code>folder/file.html</code></td><td>Go down into a folder</td></tr>
        <tr><td><code>../file.html</code></td><td>Go <strong>up</strong> one folder</td></tr>
        <tr><td><code>../../file.html</code></td><td>Go up two folders</td></tr>
      </table>
      <pre><code>&lt;!-- in pages/contact.html --&gt;
&lt;a href="../index.html"&gt;Home&lt;/a&gt;</code></pre>
      <p>Writing <code>index.html</code> there would look for <code>pages/index.html</code>, which doesn't exist: a broken link.</p>`,
  },
  {
    id: 'html-3-04', level: 3, topic: 'Email links',
    question: `<p>Which link opens the visitor's email app with a new message to <code>hello@example.com</code>?</p>`,
    options: [
      '<a href="mailto:hello@example.com">Email us</a>',
      '<a href="email:hello@example.com">Email us</a>',
      '<a href="@hello@example.com">Email us</a>',
      '<a href="send:hello@example.com">Email us</a>',
    ],
    correctIndex: 0,
    hint: 'The scheme is the same word as the old phrase "mail to".',
    lesson: `
      <h3>mailto: and tel: links</h3>
      <pre><code>&lt;a href="mailto:hello@example.com"&gt;Email us&lt;/a&gt;
&lt;a href="mailto:hello@example.com?subject=Question"&gt;Ask a question&lt;/a&gt;
&lt;a href="tel:+8801700000000"&gt;Call us&lt;/a&gt;</code></pre>
      <ul>
        <li><code>mailto:</code> opens the default email app.</li>
        <li>You can pre-fill a subject with <code>?subject=…</code>.</li>
        <li><code>tel:</code> starts a phone call on mobile.</li>
      </ul>
      <p class="tip">💡 Show the address as visible text too. Some visitors have no email app set up, and they can still copy it.</p>`,
  },
  {
    id: 'html-3-05', level: 3, topic: 'New tabs & rel',
    question: `<p>Which link opens an external site in a <strong>new tab</strong> while also preventing the new page from reaching back to yours through <code>window.opener</code>?</p>`,
    options: [
      '<a href="https://example.com" target="_self" rel="noopener">',
      '<a href="https://example.com" target="_blank" rel="opener">',
      '<a href="https://example.com" new-tab="secure">',
      '<a href="https://example.com" target="_blank" rel="noopener">',
    ],
    correctIndex: 3,
    hint: 'You need one attribute for the new tab and one rel value that says "no opener".',
    lesson: `
      <h3>Opening links in a new tab</h3>
      <pre><code>&lt;a href="https://developer.mozilla.org" target="_blank" rel="noopener noreferrer"&gt;
  MDN Docs (opens in a new tab)
&lt;/a&gt;</code></pre>
      <ul>
        <li><code>target="_blank"</code> opens the link in a new tab or window.</li>
        <li><code>target="_self"</code> (the default) opens it in the same tab.</li>
      </ul>
      <h3>Why rel="noopener"?</h3>
      <p>Without it, older browsers gave the new page access to your page through <code>window.opener</code>, so a malicious site could secretly redirect your tab to a fake login page ("tab-nabbing"). <code>noopener</code> cuts that link. Modern browsers apply it automatically for <code>_blank</code>, but writing it is a good habit. <code>noreferrer</code> also hides which page the visitor came from.</p>
      <p class="tip">💡 Use new tabs sparingly and tell users (e.g. "opens in a new tab"). <code>rel="opener"</code> does the opposite and deliberately keeps the connection.</p>`,
  },
  {
    id: 'html-3-06', level: 3, topic: 'Fragment links & IDs',
    question: `<p>Which link jumps to this heading on the <strong>same page</strong>?</p>
<pre><code>&lt;h2 id="faq"&gt;FAQ&lt;/h2&gt;</code></pre>`,
    options: ['<a href="faq">FAQ</a>', '<a href="#faq">FAQ</a>', '<a href=".faq">FAQ</a>', '<a name="faq">FAQ</a>'],
    correctIndex: 1,
    hint: 'Fragment links start with the hash symbol.',
    lesson: `
      <h3>Fragment links</h3>
      <p>A <code>#</code> followed by an element's <code>id</code> scrolls to that element.</p>
      <pre><code>&lt;nav&gt;
  &lt;a href="#faq"&gt;FAQ&lt;/a&gt;
&lt;/nav&gt;
…
&lt;h2 id="faq"&gt;Frequently asked questions&lt;/h2&gt;</code></pre>
      <ul>
        <li>The <code>id</code> must be <strong>unique</strong> on the page.</li>
        <li>IDs are case-sensitive: <code>#FAQ</code> won't find <code>id="faq"</code>.</li>
        <li>Link to a spot on another page with <code>help.html#faq</code>.</li>
        <li><code>href="#top"</code> (or <code>href="#"</code>) goes to the top of the page.</li>
      </ul>
      <p class="tip">💡 <code>.faq</code> is CSS syntax for a <em>class</em>; it doesn't work as a link target. <code>&lt;a name&gt;</code> is the obsolete way of making anchors.</p>`,
  },
]
