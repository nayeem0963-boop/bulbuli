// Level 10: Practical HTML and Knowledge Check. Snippets that combine earlier levels.
export default [
  {
    id: 'html-10-01', level: 10, topic: 'Reading a form',
    question: `<p>The user clicks <strong>Go</strong> without changing anything. Which address does the browser load?</p>
<pre><code>&lt;form action="/search" method="get"&gt;
  &lt;label for="q"&gt;Search&lt;/label&gt;
  &lt;input id="q" name="q" value="cats"&gt;
  &lt;button&gt;Go&lt;/button&gt;
&lt;/form&gt;</code></pre>`,
    options: ['/search/cats', '/q?search=cats', '/search?q=cats', '/search (the data is hidden in the request body)'],
    correctIndex: 2,
    hint: 'Combine three things: the action, the method, and each field\'s name=value pair.',
    lesson: `
      <h3>Putting it together</h3>
      <ul>
        <li><code>action="/search"</code>: the address that receives the data.</li>
        <li><code>method="get"</code>: data is added to the URL after a <code>?</code>.</li>
        <li><code>name="q"</code> + <code>value="cats"</code>: the pair <code>q=cats</code>.</li>
        <li>The button has no <code>type</code>, so it submits.</li>
        <li>The input has no <code>type</code>, so it's a text field.</li>
      </ul>
      <p>Result: <code>/search?q=cats</code>. Several fields are joined with <code>&amp;</code>: <code>/search?q=cats&amp;page=2</code>.</p>
      <p class="tip">💡 This is exactly how many search engines' search boxes work. Try searching for something and look at the address bar.</p>`,
  },
  {
    id: 'html-10-02', level: 10, topic: 'Overlapping tags',
    question: `<p>Which line is <strong>incorrectly nested</strong>?</p>`,
    options: [
      '<p><strong>Hi</strong> there</p>',
      '<p><strong>Hi there</p></strong>',
      '<ul><li><a href="/">Home</a></li></ul>',
      '<a href="/"><img src="logo.png" alt="Home"></a>',
    ],
    correctIndex: 1,
    hint: 'Last opened, first closed. Check the order of the closing tags.',
    lesson: `
      <h3>Last in, first out</h3>
      <p>Elements must close in the <strong>reverse order</strong> they were opened, like stacking boxes inside boxes.</p>
      <pre><code>&lt;!-- ❌ tags overlap --&gt;
&lt;p&gt;&lt;strong&gt;Hi there&lt;/p&gt;&lt;/strong&gt;

&lt;!-- ✅ inner element closes first --&gt;
&lt;p&gt;&lt;strong&gt;Hi there&lt;/strong&gt;&lt;/p&gt;</code></pre>
      <p>Browsers try to repair overlapping tags, but each browser may guess differently, and styling or scripts can break in confusing ways.</p>
      <p class="tip">💡 Good indentation makes overlaps easy to spot. Editors that highlight matching tags help too.</p>`,
  },
  {
    id: 'html-10-03', level: 10, topic: 'Valid nesting',
    question: `<p>Why is this markup <strong>invalid</strong>?</p>
<pre><code>&lt;p&gt;Intro text
  &lt;div class="box"&gt;Details&lt;/div&gt;
&lt;/p&gt;</code></pre>`,
    options: [
      'A <div> must always have an id',
      'A <p> must be inside a <div>, never the other way round',
      'class is not allowed on a <div>',
      'A <p> may only contain inline (phrasing) content, so the <div> ends the paragraph early',
    ],
    correctIndex: 3,
    hint: 'Think block vs inline. What is a paragraph allowed to contain?',
    lesson: `
      <h3>Content models</h3>
      <p>Each element has rules about what it may contain. A <code>&lt;p&gt;</code> may contain only <strong>phrasing content</strong>: text and inline elements such as <code>&lt;a&gt;</code>, <code>&lt;strong&gt;</code>, <code>&lt;em&gt;</code>, <code>&lt;span&gt;</code>, <code>&lt;img&gt;</code>.</p>
      <p>When the browser meets the <code>&lt;div&gt;</code>, it closes the paragraph automatically. The stray <code>&lt;/p&gt;</code> then creates a second, empty paragraph. What you see is not what you wrote!</p>
      <pre><code>&lt;!-- ✅ --&gt;
&lt;div class="intro"&gt;
  &lt;p&gt;Intro text&lt;/p&gt;
  &lt;div class="box"&gt;Details&lt;/div&gt;
&lt;/div&gt;</code></pre>
      <p>Other rules you've met: <code>&lt;ul&gt;</code> may only contain <code>&lt;li&gt;</code>; <code>&lt;head&gt;</code> may only contain metadata; you can't put a link inside another link.</p>`,
  },
  {
    id: 'html-10-04', level: 10, topic: 'Link or button?',
    question: `<p>A "See pricing" control should take the user to <strong>another page</strong>, <code>/pricing</code>. Which markup is most appropriate?</p>`,
    options: [
      '<a href="/pricing">See pricing</a>',
      '<button onclick="location.href=\'/pricing\'">See pricing</button>',
      '<div class="link" onclick="go()">See pricing</div>',
      '<span href="/pricing">See pricing</span>',
    ],
    correctIndex: 0,
    hint: 'Links go places. Buttons do things.',
    lesson: `
      <h3>Links go places, buttons do things</h3>
      <table>
        <tr><th>Use &lt;a href&gt; when…</th><th>Use &lt;button&gt; when…</th></tr>
        <tr><td>It navigates to a URL or a spot on the page</td><td>It performs an action: submit, open a menu, play, save</td></tr>
        <tr><td>Users might open it in a new tab or copy the link</td><td>There's no address to go to</td></tr>
      </table>
      <p>A real link supports middle-click, "open in new tab", copying the address and the browser's history, and it is announced as a "link". A button that navigates with JavaScript loses all of that.</p>
      <p class="tip">💡 You can still <em>style</em> a link to look like a button with CSS. What matters is the element underneath. <code>&lt;span href&gt;</code> does nothing: only <code>&lt;a&gt;</code> (and a few others) understand <code>href</code>.</p>`,
  },
  {
    id: 'html-10-05', level: 10, topic: 'Reviewing a whole page',
    question: `<p>You're reviewing this page. What is the <strong>one fix</strong> it needs?</p>
<pre><code>&lt;!DOCTYPE html&gt;
&lt;html lang="en"&gt;
&lt;head&gt;
  &lt;meta charset="UTF-8"&gt;
  &lt;meta name="viewport" content="width=device-width, initial-scale=1"&gt;
  &lt;title&gt;Bake Sale&lt;/title&gt;
&lt;/head&gt;
&lt;body&gt;
  &lt;header&gt;&lt;h1&gt;School Bake Sale&lt;/h1&gt;&lt;/header&gt;
  &lt;main&gt;
    &lt;img src="cakes.jpg" width="800" height="500"&gt;
    &lt;p&gt;&lt;a href="#menu"&gt;See the menu&lt;/a&gt;&lt;/p&gt;
    &lt;h2 id="menu"&gt;Menu&lt;/h2&gt;
  &lt;/main&gt;
&lt;/body&gt;
&lt;/html&gt;</code></pre>`,
    options: [
      'Move <title> into <body>',
      'Add alt text that describes the image',
      'Change id="menu" to class="menu"',
      'Remove lang="en" from <html>',
    ],
    correctIndex: 1,
    hint: 'Go through it like a screen reader would. What would it have nothing to say about?',
    lesson: `
      <h3>A page review checklist</h3>
      <ul>
        <li>✅ <code>&lt;!DOCTYPE html&gt;</code> and <code>&lt;html lang&gt;</code></li>
        <li>✅ <code>charset</code>, <code>viewport</code> and a descriptive <code>&lt;title&gt;</code> in the head</li>
        <li>✅ Landmarks: <code>&lt;header&gt;</code>, <code>&lt;main&gt;</code></li>
        <li>✅ One <code>&lt;h1&gt;</code>, then <code>&lt;h2&gt;</code></li>
        <li>✅ The fragment link <code>#menu</code> matches <code>id="menu"</code> (a class wouldn't work)</li>
        <li>❌ The image has no <code>alt</code>, so screen readers may read "cakes dot jpg"</li>
      </ul>
      <pre><code>&lt;img src="cakes.jpg" width="800" height="500"
     alt="A table full of cupcakes, brownies and a chocolate cake"&gt;</code></pre>
      <p class="tip">🏁 You've used ideas from every level: document structure, links, images, semantics, metadata and accessibility. That's the whole HTML course!</p>`,
  },
]
