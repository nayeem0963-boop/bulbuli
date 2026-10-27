// Level 9: HTML Attributes and Accessibility.
export default [
  {
    id: 'html-9-01', level: 9, topic: 'id, class & title',
    question: `<p>What is the key difference between the <code>id</code> and <code>class</code> attributes?</p>`,
    options: [
      'A class must be unique; an id can repeat',
      'An id must be unique on the page; a class can be shared by many elements',
      'id is only for CSS and class is only for JavaScript',
      'There is no difference',
    ],
    correctIndex: 1,
    hint: 'Think of an ID card (one per person) and a school class (many students).',
    lesson: `
      <h3>Global attributes</h3>
      <p>Global attributes work on <em>any</em> element.</p>
      <table>
        <tr><th>Attribute</th><th>Purpose</th></tr>
        <tr><td><code>id</code></td><td>A <strong>unique</strong> name for one element: fragment links, labels, JavaScript</td></tr>
        <tr><td><code>class</code></td><td>A <strong>reusable</strong> group name, mainly for CSS. An element can have several, separated by spaces.</td></tr>
        <tr><td><code>title</code></td><td>Extra advisory text, often shown as a tooltip on hover</td></tr>
        <tr><td><code>lang</code></td><td>The language of the element's text</td></tr>
        <tr><td><code>hidden</code></td><td>Hides the element</td></tr>
      </table>
      <pre><code>&lt;section id="pricing"&gt;
  &lt;div class="card featured"&gt;…&lt;/div&gt;
  &lt;div class="card"&gt;…&lt;/div&gt;
  &lt;abbr title="HyperText Markup Language"&gt;HTML&lt;/abbr&gt;
&lt;/section&gt;</code></pre>
      <p class="tip">⚠️ Don't put important information only in <code>title</code>: touch-screen and keyboard users usually can't see tooltips.</p>`,
  },
  {
    id: 'html-9-02', level: 9, topic: 'Boolean attributes',
    question: `<p>What does this checkbox do when the page loads?</p>
<pre><code>&lt;input type="checkbox" checked="false"&gt;</code></pre>`,
    options: [
      'Starts unticked, because the value is "false"',
      'It is disabled',
      'Starts ticked, because a boolean attribute only needs to be present',
      'Shows a validation error',
    ],
    correctIndex: 2,
    hint: 'For boolean attributes, the browser only checks whether the attribute is there at all.',
    lesson: `
      <h3>Boolean attributes</h3>
      <p>Some attributes are on/off switches. If the attribute is <strong>present</strong>, it's on, whatever its value. To turn it off, <strong>remove it</strong>.</p>
      <pre><code>&lt;input type="checkbox" checked&gt;        &lt;!-- ticked --&gt;
&lt;input type="checkbox" checked="false"&gt; &lt;!-- still ticked! --&gt;
&lt;input type="checkbox"&gt;                &lt;!-- not ticked --&gt;</code></pre>
      <p>Common boolean attributes: <code>checked</code>, <code>disabled</code>, <code>required</code>, <code>readonly</code>, <code>selected</code>, <code>multiple</code>, <code>hidden</code>, <code>controls</code>, <code>autoplay</code>, <code>muted</code>, <code>defer</code>.</p>
      <p class="tip">💡 Writing <code>checked=""</code> or <code>checked="checked"</code> is also valid, but plain <code>checked</code> is the clearest.</p>`,
  },
  {
    id: 'html-9-03', level: 9, topic: 'data-* attributes',
    question: `<p>Which is a <strong>valid custom data attribute</strong> for storing a product's ID on an element?</p>`,
    options: ['product-id="42"', 'data:product="42"', 'custom-id="42"', 'data-product-id="42"'],
    correctIndex: 3,
    hint: 'Custom attributes must start with a special prefix followed by a hyphen.',
    lesson: `
      <h3>data-* attributes</h3>
      <p>You can store your own extra information on any element with attributes that start with <code>data-</code>.</p>
      <pre><code>&lt;button class="add-to-cart" data-product-id="42" data-price="350"&gt;
  Add to cart
&lt;/button&gt;</code></pre>
      <p>JavaScript reads them through <code>dataset</code>, turning hyphens into camelCase:</p>
      <pre><code>button.dataset.productId  // "42"
button.dataset.price      // "350"</code></pre>
      <ul>
        <li>Names are lowercase letters, numbers and hyphens after <code>data-</code>.</li>
        <li>Values are always strings.</li>
        <li>Made-up attributes without the prefix (like <code>product-id</code>) are invalid HTML.</li>
      </ul>
      <p class="tip">⚠️ Don't store secrets in them: anyone can read them in the page source.</p>`,
  },
  {
    id: 'html-9-04', level: 9, topic: 'IDs & labels',
    question: `<p>Clicking the word "Name" doesn't put the cursor in the box, and screen readers don't announce the label. Why?</p>
<pre><code>&lt;label for="user-name"&gt;Name&lt;/label&gt;
&lt;input id="username" name="username" type="text"&gt;</code></pre>`,
    options: [
      'Labels can never be clicked',
      'The label\'s for value doesn\'t exactly match the input\'s id',
      'The input is missing a placeholder',
      'The for attribute only works on checkboxes',
    ],
    correctIndex: 1,
    hint: 'Compare the two values character by character.',
    lesson: `
      <h3>Exact matches only</h3>
      <p>The connection between a label and its control is made by matching <code>for</code> to <code>id</code>. They must be <strong>identical</strong>, including hyphens and capital letters.</p>
      <pre><code>&lt;!-- ❌ "user-name" ≠ "username" --&gt;
&lt;label for="user-name"&gt;Name&lt;/label&gt;
&lt;input id="username"&gt;

&lt;!-- ✅ --&gt;
&lt;label for="username"&gt;Name&lt;/label&gt;
&lt;input id="username" name="username"&gt;</code></pre>
      <h3>How to check</h3>
      <ul>
        <li>Click the label: the field should get focus (checkboxes should toggle).</li>
        <li>In browser DevTools, the Accessibility panel shows the input's "Name". If it's empty, the label isn't connected.</li>
      </ul>
      <p class="tip">💡 IDs must also be unique: if two inputs share <code>id="username"</code>, the label only finds the first.</p>`,
  },
  {
    id: 'html-9-05', level: 9, topic: 'Accessible names',
    question: `<p>A button shows <strong>only a 🔍 icon</strong>, with no text. How can you give it an accessible name for screen readers?</p>`,
    options: [
      '<button aria-label="Search">🔍</button>',
      '<button alt="Search">🔍</button>',
      '<button role="search">🔍</button>',
      '<button title="">🔍</button>',
    ],
    correctIndex: 0,
    hint: 'alt only works on images. You need an attribute that sets a label.',
    lesson: `
      <h3>What is an accessible name?</h3>
      <p>Every interactive element needs a name that assistive tech can announce: "Search, button". Where it comes from:</p>
      <ul>
        <li><strong>Text content:</strong> <code>&lt;button&gt;Search&lt;/button&gt;</code> (best).</li>
        <li><strong>A linked label:</strong> <code>&lt;label for&gt;</code> for form controls.</li>
        <li><strong>alt text:</strong> an <code>&lt;img alt="Search"&gt;</code> inside the button.</li>
        <li><strong>aria-label</strong> when there is no visible text.</li>
      </ul>
      <pre><code>&lt;button type="button" aria-label="Search"&gt;
  &lt;span aria-hidden="true"&gt;🔍&lt;/span&gt;
&lt;/button&gt;</code></pre>
      <p><code>aria-hidden="true"</code> stops the emoji being read out as "magnifying glass tilted left".</p>
      <p class="tip">💡 <code>alt</code> is not valid on a button, and <code>role="search"</code> marks a search <em>region</em>, not a name.</p>`,
  },
  {
    id: 'html-9-06', level: 9, topic: 'ARIA basics',
    question: `<p>What is the "<strong>first rule of ARIA</strong>"?</p>`,
    options: [
      'Add a role attribute to every element',
      'ARIA attributes make elements keyboard-accessible automatically',
      'ARIA replaces the need for alt text',
      'If a native HTML element already has the meaning and behaviour you need, use it instead of adding ARIA',
    ],
    correctIndex: 3,
    hint: 'ARIA is a repair kit for when HTML has no suitable element, not a replacement for HTML.',
    lesson: `
      <h3>What ARIA is</h3>
      <p><strong>ARIA</strong> (Accessible Rich Internet Applications) is a set of attributes (<code>role</code>, <code>aria-label</code>, <code>aria-expanded</code>…) that describe elements to assistive technology.</p>
      <h3>What ARIA is not</h3>
      <p>ARIA only changes what is <em>announced</em>. It adds no behaviour: no focus, no keyboard support, no clicks.</p>
      <pre><code>&lt;!-- ❌ announced as a button, but still can't be focused or pressed with a key --&gt;
&lt;div role="button"&gt;Save&lt;/div&gt;

&lt;!-- ✅ everything built in --&gt;
&lt;button type="button"&gt;Save&lt;/button&gt;</code></pre>
      <h3>Good uses of ARIA</h3>
      <ul>
        <li><code>aria-label</code> for icon-only buttons.</li>
        <li><code>aria-expanded="true|false"</code> on a button that opens a menu.</li>
        <li><code>aria-live="polite"</code> so updates (like "Saved!") are read out.</li>
      </ul>
      <p class="tip">💡 "No ARIA is better than bad ARIA." Wrong roles can make a page harder to use than having none.</p>`,
  },
]
