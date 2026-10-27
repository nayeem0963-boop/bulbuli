// Level 5: Lists and Tables.
export default [
  {
    id: 'html-5-01', level: 5, topic: '<ul> vs <ol>',
    question: `<p>You're writing recipe steps where the <strong>order matters</strong>. Which list should you use?</p>`,
    options: ['<ul>', '<ol>', '<li>', '<dl>'],
    correctIndex: 1,
    hint: 'One list type is "unordered" (bullets) and the other is "ordered" (numbers).',
    lesson: `
      <h3>Unordered vs ordered lists</h3>
      <table>
        <tr><th>&lt;ul&gt; unordered</th><th>&lt;ol&gt; ordered</th></tr>
        <tr><td>Bullet points •</td><td>Numbers 1, 2, 3…</td></tr>
        <tr><td>Order doesn't matter</td><td>Order matters</td></tr>
        <tr><td>Shopping list, features</td><td>Steps, rankings, instructions</td></tr>
      </table>
      <pre><code>&lt;ul&gt;
  &lt;li&gt;Eggs&lt;/li&gt;
  &lt;li&gt;Milk&lt;/li&gt;
&lt;/ul&gt;

&lt;ol&gt;
  &lt;li&gt;Crack the eggs&lt;/li&gt;
  &lt;li&gt;Whisk with milk&lt;/li&gt;
&lt;/ol&gt;</code></pre>
      <p class="tip">💡 <code>&lt;ol&gt;</code> has useful attributes: <code>start="5"</code> begins counting at 5, <code>reversed</code> counts down, and <code>type="A"</code> uses letters.</p>`,
  },
  {
    id: 'html-5-02', level: 5, topic: 'List items & nesting',
    question: `<p>Which snippet <strong>correctly</strong> nests a sub-list under "Fruit"?</p>`,
    options: [
      '<ul><li>Fruit</li><ul><li>Apple</li></ul></ul>',
      '<ul><li>Fruit</li><li><li>Apple</li></li></ul>',
      '<ul>Fruit<ul>Apple</ul></ul>',
      '<ul><li>Fruit<ul><li>Apple</li></ul></li></ul>',
    ],
    correctIndex: 3,
    hint: 'The only direct child a <ul> may have is <li>. So where must the inner list go?',
    lesson: `
      <h3>List items: &lt;li&gt;</h3>
      <p>The only element allowed as a direct child of <code>&lt;ul&gt;</code> or <code>&lt;ol&gt;</code> is <code>&lt;li&gt;</code>. Text or other tags placed straight inside the list are invalid.</p>
      <h3>Nesting lists</h3>
      <p>To make a sub-list, put a whole new list <strong>inside an &lt;li&gt;</strong>, before that item's closing tag:</p>
      <pre><code>&lt;ul&gt;
  &lt;li&gt;Fruit
    &lt;ul&gt;
      &lt;li&gt;Apple&lt;/li&gt;
      &lt;li&gt;Mango&lt;/li&gt;
    &lt;/ul&gt;
  &lt;/li&gt;
  &lt;li&gt;Vegetables&lt;/li&gt;
&lt;/ul&gt;</code></pre>
      <p class="tip">💡 You can mix types: an <code>&lt;ol&gt;</code> of steps can contain a <code>&lt;ul&gt;</code> of ingredients inside one step.</p>`,
  },
  {
    id: 'html-5-03', level: 5, topic: 'Description lists',
    question: `<p>You're building a <strong>glossary</strong>: a list of terms, each followed by its definition. Which elements are made for this?</p>`,
    options: ['<ul> and <li>', '<table> and <td>', '<dl>, <dt> and <dd>', '<ol> and <dt>'],
    correctIndex: 2,
    hint: 'd for description, t for term, and d for… details of the term.',
    lesson: `
      <h3>Description lists</h3>
      <pre><code>&lt;dl&gt;
  &lt;dt&gt;HTML&lt;/dt&gt;
  &lt;dd&gt;The language that structures web content.&lt;/dd&gt;

  &lt;dt&gt;CSS&lt;/dt&gt;
  &lt;dd&gt;The language that styles web content.&lt;/dd&gt;
&lt;/dl&gt;</code></pre>
      <ul>
        <li><code>&lt;dl&gt;</code>: the description list.</li>
        <li><code>&lt;dt&gt;</code>: a term (or name).</li>
        <li><code>&lt;dd&gt;</code>: its description (or value).</li>
      </ul>
      <p class="tip">💡 They also suit name–value data, like a product's specs: <em>Weight</em> → <em>1.2 kg</em>. A term can have several <code>&lt;dd&gt;</code>s.</p>`,
  },
  {
    id: 'html-5-04', level: 5, topic: 'Table structure',
    question: `<p>In a basic HTML table, what is the correct nesting order?</p>`,
    options: [
      '<table> → <tr> → <td>',
      '<table> → <td> → <tr>',
      '<tr> → <table> → <td>',
      '<table> → <col> → <td>',
    ],
    correctIndex: 0,
    hint: 'A table holds rows, and rows hold cells.',
    lesson: `
      <h3>Building a table</h3>
      <pre><code>&lt;table&gt;
  &lt;tr&gt;               &lt;!-- table row --&gt;
    &lt;td&gt;Apples&lt;/td&gt;  &lt;!-- table data (a cell) --&gt;
    &lt;td&gt;৳120&lt;/td&gt;
  &lt;/tr&gt;
  &lt;tr&gt;
    &lt;td&gt;Mangoes&lt;/td&gt;
    &lt;td&gt;৳200&lt;/td&gt;
  &lt;/tr&gt;
&lt;/table&gt;</code></pre>
      <ul>
        <li><code>&lt;table&gt;</code> → <code>&lt;tr&gt;</code> (rows) → <code>&lt;td&gt;</code> (cells).</li>
        <li>A cell can stretch across columns with <code>colspan="2"</code>, or rows with <code>rowspan="2"</code>.</li>
      </ul>
      <p class="tip">⚠️ Tables are for <strong>tabular data</strong> (timetables, prices, scores), never for page layout. Use CSS for layout.</p>`,
  },
  {
    id: 'html-5-05', level: 5, topic: 'Header cells <th>',
    question: `<p>Which element marks a <strong>header cell</strong>, such as "Price" at the top of a column?</p>`,
    options: ['<thead>', '<th>', '<td>', '<header>'],
    correctIndex: 1,
    hint: 'It looks like <td>, but h is for header.',
    lesson: `
      <h3>Header cells: &lt;th&gt;</h3>
      <pre><code>&lt;table&gt;
  &lt;tr&gt;
    &lt;th scope="col"&gt;Fruit&lt;/th&gt;
    &lt;th scope="col"&gt;Price&lt;/th&gt;
  &lt;/tr&gt;
  &lt;tr&gt;
    &lt;th scope="row"&gt;Apples&lt;/th&gt;
    &lt;td&gt;৳120&lt;/td&gt;
  &lt;/tr&gt;
&lt;/table&gt;</code></pre>
      <ul>
        <li><code>&lt;th&gt;</code> is a single header <em>cell</em> (bold and centred by default).</li>
        <li><code>&lt;thead&gt;</code> is a <em>group of rows</em>, not a cell.</li>
        <li><code>scope="col"</code> or <code>scope="row"</code> says whether the header labels a column or a row, so screen readers can announce "Price: ৳120".</li>
      </ul>`,
  },
  {
    id: 'html-5-06', level: 5, topic: 'thead, tbody & tfoot',
    question: `<p>The last row of your table shows the <strong>totals</strong> for each column. Which element should group that row?</p>`,
    options: ['<caption>', '<thead>', '<tbody>', '<tfoot>'],
    correctIndex: 3,
    hint: 'Totals sit at the foot of the table.',
    lesson: `
      <h3>Row groups</h3>
      <pre><code>&lt;table&gt;
  &lt;thead&gt;
    &lt;tr&gt;&lt;th scope="col"&gt;Month&lt;/th&gt;&lt;th scope="col"&gt;Savings&lt;/th&gt;&lt;/tr&gt;
  &lt;/thead&gt;
  &lt;tbody&gt;
    &lt;tr&gt;&lt;td&gt;January&lt;/td&gt;&lt;td&gt;৳500&lt;/td&gt;&lt;/tr&gt;
    &lt;tr&gt;&lt;td&gt;February&lt;/td&gt;&lt;td&gt;৳800&lt;/td&gt;&lt;/tr&gt;
  &lt;/tbody&gt;
  &lt;tfoot&gt;
    &lt;tr&gt;&lt;th scope="row"&gt;Total&lt;/th&gt;&lt;td&gt;৳1300&lt;/td&gt;&lt;/tr&gt;
  &lt;/tfoot&gt;
&lt;/table&gt;</code></pre>
      <ul>
        <li><code>&lt;thead&gt;</code>: the heading row(s).</li>
        <li><code>&lt;tbody&gt;</code>: the main data. Browsers add one automatically if you leave it out.</li>
        <li><code>&lt;tfoot&gt;</code>: summary rows such as totals.</li>
      </ul>
      <p class="tip">💡 Row groups help with styling, and when a long table is printed, browsers can repeat the head and foot on every page.</p>`,
  },
  {
    id: 'html-5-07', level: 5, topic: 'Table captions',
    question: `<p>How do you give a table a <strong>visible title</strong> that screen readers also announce as the table's name?</p>`,
    options: [
      'An <h2> placed inside <table>',
      'A title attribute on the first <td>',
      'A <caption> as the first child of <table>',
      'A <th> in the last row',
    ],
    correctIndex: 2,
    hint: 'Photos have captions. Tables have an element with the same name.',
    lesson: `
      <h3>The &lt;caption&gt; element</h3>
      <pre><code>&lt;table&gt;
  &lt;caption&gt;Class 5 exam results, 2026&lt;/caption&gt;
  &lt;thead&gt; … &lt;/thead&gt;
  &lt;tbody&gt; … &lt;/tbody&gt;
&lt;/table&gt;</code></pre>
      <ul>
        <li>It must be the <strong>first child</strong> of <code>&lt;table&gt;</code>.</li>
        <li>It is shown above the table by default (CSS <code>caption-side</code> can move it).</li>
        <li>Screen readers use it as the table's name, so users know what the table is about before reading every cell.</li>
      </ul>
      <p class="tip">💡 An <code>&lt;h2&gt;</code> can't go directly inside <code>&lt;table&gt;</code>. A heading <em>above</em> the table is fine, but only <code>&lt;caption&gt;</code> is tied to the table itself.</p>`,
  },
]
