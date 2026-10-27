// Level 6: Forms and User Input.
export default [
  {
    id: 'html-6-01', level: 6, topic: 'The <form> element',
    question: `<p>Which attribute of <code>&lt;form&gt;</code> sets the <strong>URL the data is sent to</strong>?</p>
<pre><code>&lt;form ???="/subscribe" method="post"&gt; … &lt;/form&gt;</code></pre>`,
    options: ['method', 'action', 'target', 'src'],
    correctIndex: 1,
    hint: 'It names what should happen with the data: the action to take.',
    lesson: `
      <h3>The &lt;form&gt; element</h3>
      <p>A form groups input controls and sends their values somewhere when submitted.</p>
      <pre><code>&lt;form action="/subscribe" method="post"&gt;
  &lt;label for="email"&gt;Email&lt;/label&gt;
  &lt;input id="email" name="email" type="email"&gt;
  &lt;button type="submit"&gt;Subscribe&lt;/button&gt;
&lt;/form&gt;</code></pre>
      <table>
        <tr><th>Attribute</th><th>What it does</th></tr>
        <tr><td><code>action</code></td><td>The URL that receives the data (default: the current page)</td></tr>
        <tr><td><code>method</code></td><td>How it's sent: <code>get</code> (default) or <code>post</code></td></tr>
        <tr><td><code>target</code></td><td>Where to show the response, e.g. <code>_blank</code></td></tr>
      </table>
      <p class="tip">💡 HTML only <em>sends</em> the data. A server program (or JavaScript) has to receive it and do something useful with it.</p>`,
  },
  {
    id: 'html-6-02', level: 6, topic: 'Labels',
    question: `<p>In this form, what does the <code>for</code> attribute on the label do?</p>
<pre><code>&lt;form&gt;
  &lt;label for="email"&gt;Email&lt;/label&gt;
  &lt;input id="email" type="email"&gt;
  &lt;button type="submit"&gt;Sign up&lt;/button&gt;
&lt;/form&gt;</code></pre>`,
    options: [
      "Sets the input's default value",
      'Makes the field required',
      'Repeats the input for each email address',
      'Connects the label to the input whose id is "email"',
    ],
    correctIndex: 3,
    hint: 'Compare the value of for with the input\'s id.',
    lesson: `
      <h3>Linking labels to inputs</h3>
      <pre><code>&lt;label for="email"&gt;Email&lt;/label&gt;
&lt;input id="email" name="email" type="email"&gt;</code></pre>
      <p><code>&lt;label for="x"&gt;</code> belongs to the control with <code>id="x"</code>. That gives two big benefits:</p>
      <ul>
        <li><strong>Clicking the label focuses the input</strong>: a bigger target, which is especially helpful for small checkboxes.</li>
        <li><strong>Screen readers announce the label</strong> when the input is focused, so users know what to type.</li>
      </ul>
      <p>You can also wrap the input inside the label:</p>
      <pre><code>&lt;label&gt;Email &lt;input type="email" name="email"&gt;&lt;/label&gt;</code></pre>
      <p class="tip">⚠️ A <code>placeholder</code> is <strong>not</strong> a label: it disappears as soon as the user starts typing.</p>`,
  },
  {
    id: 'html-6-03', level: 6, topic: 'Input types',
    question: `<p>Which input type <strong>hides the characters</strong> as the user types?</p>`,
    options: ['type="hidden"', 'type="secret"', 'type="password"', 'type="text"'],
    correctIndex: 2,
    hint: 'Think of the field you fill in when you log in.',
    lesson: `
      <h3>Common input types</h3>
      <table>
        <tr><th>type</th><th>What it does</th></tr>
        <tr><td><code>text</code></td><td>Single line of text (the default)</td></tr>
        <tr><td><code>password</code></td><td>Masks characters as •••</td></tr>
        <tr><td><code>email</code></td><td>Checks for a valid address; email keyboard on phones</td></tr>
        <tr><td><code>number</code></td><td>Numbers only, with up/down arrows</td></tr>
        <tr><td><code>checkbox</code> / <code>radio</code></td><td>Tick boxes / pick one from a group</td></tr>
        <tr><td><code>date</code></td><td>Date picker</td></tr>
        <tr><td><code>hidden</code></td><td>Not shown at all; sends a value silently</td></tr>
      </table>
      <pre><code>&lt;input type="password" name="pw" autocomplete="current-password" minlength="8"&gt;</code></pre>
      <p class="tip">⚠️ <code>type="password"</code> only hides the text <em>on screen</em>. It doesn't encrypt anything; secure sites rely on HTTPS for that.</p>`,
  },
  {
    id: 'html-6-04', level: 6, topic: 'name, value & placeholder',
    question: `<p>The user submits this form <strong>without touching</strong> the field. What does the server receive for it?</p>
<pre><code>&lt;input type="text" name="city" value="Dhaka" placeholder="Your city"&gt;</code></pre>`,
    options: ['city=Dhaka', 'city=Your city', 'text=Dhaka', 'Nothing, because the user typed nothing'],
    correctIndex: 0,
    hint: 'One attribute is the key, one is the real starting content, and one is only a grey hint.',
    lesson: `
      <h3>Three attributes that are easy to mix up</h3>
      <table>
        <tr><th>Attribute</th><th>Role</th></tr>
        <tr><td><code>name</code></td><td>The <strong>key</strong> sent to the server. No name = the field is not sent at all!</td></tr>
        <tr><td><code>value</code></td><td>The field's real starting content. It is sent unless the user changes it.</td></tr>
        <tr><td><code>placeholder</code></td><td>A grey hint shown while the field is empty. It is <strong>never</strong> sent.</td></tr>
      </table>
      <p>Here the field already contains "Dhaka", so the form sends <code>city=Dhaka</code>.</p>
      <p class="tip">💡 Use placeholders for examples (<code>placeholder="e.g. Dhaka"</code>), never instead of a label.</p>`,
  },
  {
    id: 'html-6-05', level: 6, topic: 'Required fields & validation',
    question: `<p>A user clicks <strong>Join</strong> with the email field empty. What happens?</p>
<pre><code>&lt;form action="/join"&gt;
  &lt;label for="em"&gt;Email&lt;/label&gt;
  &lt;input id="em" name="email" type="email" required&gt;
  &lt;button&gt;Join&lt;/button&gt;
&lt;/form&gt;</code></pre>`,
    options: [
      'The form is sent with an empty email',
      'The page reloads and clears every field',
      'The browser stops the submission and asks the user to fill in the field',
      'The input turns into a password field',
    ],
    correctIndex: 2,
    hint: 'required is a boolean attribute that the browser checks before sending.',
    lesson: `
      <h3>Built-in validation</h3>
      <p>Browsers check some rules before submitting, and show a message if one fails:</p>
      <ul>
        <li><code>required</code>: the field can't be empty.</li>
        <li><code>type="email"</code> / <code>type="url"</code>: the value must look like an email / URL.</li>
        <li><code>minlength</code> / <code>maxlength</code>: text length limits.</li>
        <li><code>min</code> / <code>max</code>: limits for numbers and dates.</li>
        <li><code>pattern</code>: a regular expression the value must match.</li>
      </ul>
      <pre><code>&lt;input name="code" required pattern="[0-9]{6}" title="Six digits"&gt;</code></pre>
      <p class="tip">⚠️ Browser validation is a convenience for users, not security. Anyone can bypass it, so the server must check the data again.</p>`,
  },
  {
    id: 'html-6-06', level: 6, topic: 'Radio buttons & checkboxes',
    question: `<p>Users must pick <strong>exactly one</strong> T-shirt size: Small, Medium or Large. What should you use?</p>`,
    options: [
      'Three checkboxes, each with a different name',
      'Three radio buttons that share the same name',
      'Three radio buttons, each with a different name',
      'Three text inputs',
    ],
    correctIndex: 1,
    hint: 'Radio buttons only know they belong together when something about them matches.',
    lesson: `
      <h3>Radio vs checkbox</h3>
      <table>
        <tr><th>Radio</th><th>Checkbox</th></tr>
        <tr><td>Pick <strong>one</strong> from a group</td><td>Pick <strong>any number</strong> (including none)</td></tr>
        <tr><td>Grouped by sharing a <code>name</code></td><td>Each one is independent</td></tr>
      </table>
      <pre><code>&lt;fieldset&gt;
  &lt;legend&gt;T-shirt size&lt;/legend&gt;
  &lt;label&gt;&lt;input type="radio" name="size" value="s"&gt; Small&lt;/label&gt;
  &lt;label&gt;&lt;input type="radio" name="size" value="m" checked&gt; Medium&lt;/label&gt;
  &lt;label&gt;&lt;input type="radio" name="size" value="l"&gt; Large&lt;/label&gt;
&lt;/fieldset&gt;

&lt;label&gt;&lt;input type="checkbox" name="gift" value="yes"&gt; Gift wrap&lt;/label&gt;</code></pre>
      <p>With different names, each radio is its own group, so users could select all three.</p>
      <p class="tip">💡 <code>&lt;fieldset&gt;</code> and <code>&lt;legend&gt;</code> give the group a name that screen readers announce: "T-shirt size, Medium, radio button".</p>`,
  },
  {
    id: 'html-6-07', level: 6, topic: 'Select menus',
    question: `<p>The user picks <strong>Bangladesh</strong>. What is sent to the server?</p>
<pre><code>&lt;select name="country"&gt;
  &lt;option value="bd"&gt;Bangladesh&lt;/option&gt;
  &lt;option value="in"&gt;India&lt;/option&gt;
&lt;/select&gt;</code></pre>`,
    options: ['country=Bangladesh', 'select=bd', 'bd=Bangladesh', 'country=bd'],
    correctIndex: 3,
    hint: "The key comes from the select's name. The value comes from the chosen option's value attribute.",
    lesson: `
      <h3>Drop-down menus</h3>
      <pre><code>&lt;label for="country"&gt;Country&lt;/label&gt;
&lt;select id="country" name="country"&gt;
  &lt;option value=""&gt;Choose…&lt;/option&gt;
  &lt;optgroup label="Asia"&gt;
    &lt;option value="bd"&gt;Bangladesh&lt;/option&gt;
    &lt;option value="in"&gt;India&lt;/option&gt;
  &lt;/optgroup&gt;
&lt;/select&gt;</code></pre>
      <ul>
        <li>The <code>&lt;select&gt;</code>'s <code>name</code> is the key; the chosen option's <code>value</code> is sent.</li>
        <li>If an option has no <code>value</code>, its visible text is sent instead.</li>
        <li><code>selected</code> pre-selects an option. <code>multiple</code> allows several choices.</li>
        <li><code>&lt;optgroup&gt;</code> groups long lists under headings.</li>
      </ul>`,
  },
  {
    id: 'html-6-08', level: 6, topic: 'Textareas & buttons',
    question: `<p>This <code>&lt;button&gt;</code> sits inside a <code>&lt;form&gt;</code> and has <strong>no type attribute</strong>. What does clicking it do?</p>
<pre><code>&lt;form action="/feedback"&gt;
  &lt;textarea name="message" rows="4"&gt;&lt;/textarea&gt;
  &lt;button&gt;Send&lt;/button&gt;
&lt;/form&gt;</code></pre>`,
    options: [
      'Submits the form, because a button\'s default type is "submit"',
      'Nothing, until you add JavaScript',
      'Clears the textarea',
      'Opens a file picker',
    ],
    correctIndex: 0,
    hint: 'Inside a form, a button with no type behaves like the most common kind of form button.',
    lesson: `
      <h3>Buttons in forms</h3>
      <table>
        <tr><th>type</th><th>What it does</th></tr>
        <tr><td><code>submit</code> (default)</td><td>Sends the form</td></tr>
        <tr><td><code>button</code></td><td>Nothing on its own; used with JavaScript</td></tr>
        <tr><td><code>reset</code></td><td>Clears the form back to its starting values (rarely a good idea)</td></tr>
      </table>
      <p class="tip">⚠️ A button meant only for JavaScript (like "Show password") needs <code>type="button"</code>, or it will submit the form by accident.</p>
      <h3>Multi-line text: &lt;textarea&gt;</h3>
      <pre><code>&lt;label for="msg"&gt;Your message&lt;/label&gt;
&lt;textarea id="msg" name="message" rows="4" maxlength="500"&gt;&lt;/textarea&gt;</code></pre>
      <p>Unlike <code>&lt;input&gt;</code>, <code>&lt;textarea&gt;</code> has a closing tag, and its starting text goes <em>between</em> the tags, not in a <code>value</code> attribute.</p>`,
  },
  {
    id: 'html-6-09', level: 6, topic: 'GET vs POST',
    question: `<p>A login form sends a username and password. Which <code>method</code> should it use?</p>`,
    options: [
      'GET, because it is faster',
      'GET, so the login page can be bookmarked',
      'POST, so the data travels in the request body instead of the URL',
      "Either one: they're identical",
    ],
    correctIndex: 2,
    hint: 'One method puts every field into the address bar, where it ends up in history and server logs.',
    lesson: `
      <h3>GET vs POST</h3>
      <table>
        <tr><th>GET (default)</th><th>POST</th></tr>
        <tr><td>Data goes in the URL: <code>/search?q=cats</code></td><td>Data goes in the request body</td></tr>
        <tr><td>Visible, saved in history, bookmarkable</td><td>Not shown in the URL</td></tr>
        <tr><td>For <strong>reading</strong>: search, filters</td><td>For <strong>changing</strong> things: logins, sign-ups, orders</td></tr>
      </table>
      <pre><code>&lt;form action="/search" method="get"&gt; … &lt;/form&gt;
&lt;form action="/login" method="post"&gt; … &lt;/form&gt;</code></pre>
      <p class="tip">⚠️ POST keeps data out of the URL, but it is <strong>not encrypted</strong> by itself. Only HTTPS protects data on the way to the server.</p>`,
  },
  {
    id: 'html-6-10', level: 6, topic: 'Accessible input types',
    question: `<p>Which input is the right choice for a <strong>phone number</strong>, and shows a phone keypad on mobile?</p>`,
    options: [
      '<input type="number" name="phone">',
      '<input type="tel" name="phone">',
      '<input type="phone" name="phone">',
      '<input type="text" name="phone" inputmode="none">',
    ],
    correctIndex: 1,
    hint: 'A phone number is not a quantity you count with. The type is short for telephone.',
    lesson: `
      <h3>Choose the type that fits the data</h3>
      <ul>
        <li><code>type="tel"</code>: phone numbers. Shows a dial pad on phones and allows +, spaces and leading zeros.</li>
        <li><code>type="number"</code>: <em>quantities</em> (age, amount). It can drop leading zeros and adds spinner arrows, which is wrong for phone numbers, PINs or card numbers.</li>
        <li><code>type="phone"</code> doesn't exist; browsers treat it as plain text.</li>
      </ul>
      <h3>Accessible form checklist</h3>
      <ul>
        <li>Every control has a visible, linked <code>&lt;label&gt;</code>.</li>
        <li>Related controls are grouped with <code>&lt;fieldset&gt;</code> + <code>&lt;legend&gt;</code>.</li>
        <li><code>autocomplete</code> helps browsers fill fields: <code>autocomplete="tel"</code>, <code>"email"</code>, <code>"name"</code>.</li>
        <li>Error messages say what went wrong and how to fix it, not just "Invalid".</li>
      </ul>
      <pre><code>&lt;label for="phone"&gt;Mobile number&lt;/label&gt;
&lt;input id="phone" name="phone" type="tel" autocomplete="tel"&gt;</code></pre>`,
  },
]
