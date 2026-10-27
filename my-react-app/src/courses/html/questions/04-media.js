// Level 4: Images and Media.
export default [
  {
    id: 'html-4-01', level: 4, topic: '<img> src',
    question: `<p>In this code, what does <code>src</code> tell the browser?</p>
<pre><code>&lt;img src="images/logo.png" alt="Company logo"&gt;</code></pre>`,
    options: [
      "The image's caption",
      "The image's width and height",
      'Where to find the image file',
      'The text read by screen readers',
    ],
    correctIndex: 2,
    hint: 'src is short for "source".',
    lesson: `
      <h3>The &lt;img&gt; element</h3>
      <p><code>&lt;img&gt;</code> embeds a picture. Like <code>&lt;br&gt;</code>, it is a <strong>void element</strong>: no closing tag.</p>
      <pre><code>&lt;img src="images/logo.png" alt="Company logo"&gt;</code></pre>
      <h3>src = source</h3>
      <ul>
        <li><strong>Relative path:</strong> <code>src="images/logo.png"</code> looks in the <code>images</code> folder next to this HTML file.</li>
        <li><strong>Absolute URL:</strong> <code>src="https://example.com/logo.png"</code> loads it from the web.</li>
      </ul>
      <p class="tip">💡 Paths are case-sensitive on most web servers: <code>Logo.PNG</code> ≠ <code>logo.png</code>. A wrong path is the #1 cause of broken images.</p>`,
  },
  {
    id: 'html-4-02', level: 4, topic: '<img> alt',
    question: `<p>Which attribute provides <strong>alternative text</strong> for an image, read by screen readers and shown if the image fails to load?</p>`,
    options: ['title', 'src', 'desc', 'alt'],
    correctIndex: 3,
    hint: 'It is short for "alternative".',
    lesson: `
      <h3>The alt attribute</h3>
      <p><code>alt</code> describes what an image shows, in words.</p>
      <pre><code>&lt;img src="cat.jpg" alt="An orange cat asleep on a sofa"&gt;</code></pre>
      <h3>Why it matters</h3>
      <ul>
        <li><strong>Accessibility:</strong> screen readers read it aloud for blind and low-vision users.</li>
        <li><strong>Broken images:</strong> the browser shows the alt text instead.</li>
        <li><strong>Search engines</strong> use it to understand the image.</li>
      </ul>
      <h3>Writing good alt text</h3>
      <ul>
        <li>✅ <code>alt="Bar chart: sales doubled in 2025"</code> describes the meaning.</li>
        <li>❌ <code>alt="image"</code> or <code>alt="photo.jpg"</code> tells the user nothing.</li>
      </ul>
      <p class="tip">💡 <code>title</code> shows a tooltip on hover, but it is not a replacement for <code>alt</code>.</p>`,
  },
  {
    id: 'html-4-03', level: 4, topic: 'Decorative images',
    question: `<p>An image is <strong>purely decorative</strong> (a swirly divider) and adds no information. What's the best way to write its alt?</p>`,
    options: [
      'alt=""',
      'alt="decorative swirl image"',
      'Leave out the alt attribute entirely',
      'alt="image"',
    ],
    correctIndex: 0,
    hint: "You want screen readers to skip it completely, but the attribute itself should still be there.",
    lesson: `
      <h3>Empty alt for decoration</h3>
      <pre><code>&lt;img src="swirl.svg" alt=""&gt;</code></pre>
      <ul>
        <li><code>alt=""</code> (empty) tells screen readers: <em>skip this, it's decoration</em>.</li>
        <li>Leaving <code>alt</code> <strong>out</strong> is different: many screen readers then read the file name, like "swirl dot s v g".</li>
        <li>Words like "image of…" are redundant: screen readers already say it's an image.</li>
      </ul>
      <h3>Quick decision guide</h3>
      <ul>
        <li>Does the image carry information? Describe that information.</li>
        <li>Is it inside a link or button with no other text? Describe where it goes or what it does.</li>
        <li>Pure decoration? <code>alt=""</code>, or better, use a CSS background.</li>
      </ul>`,
  },
  {
    id: 'html-4-04', level: 4, topic: 'Image size & responsiveness',
    question: `<p>Why add <code>width</code> and <code>height</code> attributes to an <code>&lt;img&gt;</code>, even when CSS makes it resize for phones?</p>
<pre><code>&lt;img src="hero.jpg" alt="Mountains at sunrise" width="1200" height="800"&gt;</code></pre>`,
    options: [
      'They make the file download faster',
      "They let the browser reserve the right space, so the layout doesn't jump while the image loads",
      "They're required, or the image won't display",
      'They crop the image to exactly that size',
    ],
    correctIndex: 1,
    hint: 'Think about what happens to the text below an image while the image is still downloading.',
    lesson: `
      <h3>Reserving space</h3>
      <p>Before an image downloads, the browser doesn't know how big it is. Without <code>width</code> and <code>height</code>, the text below jumps down when it arrives: annoying, and it can cause mis-clicks.</p>
      <p>With them, the browser knows the <strong>aspect ratio</strong> (here 3:2) and reserves the space.</p>
      <h3>Responsive images</h3>
      <pre><code>/* CSS: shrink on small screens, keep the ratio */
img { max-width: 100%; height: auto; }</code></pre>
      <pre><code>&lt;img src="hero-800.jpg"
     srcset="hero-800.jpg 800w, hero-1600.jpg 1600w"
     sizes="(max-width: 600px) 100vw, 800px"
     alt="Mountains at sunrise" width="800" height="533"
     loading="lazy"&gt;</code></pre>
      <ul>
        <li><code>srcset</code> + <code>sizes</code> let the browser download a smaller file on phones.</li>
        <li><code>loading="lazy"</code> waits to load images until they're near the screen.</li>
      </ul>
      <p class="tip">💡 The attributes take plain numbers (pixels), with no "px".</p>`,
  },
  {
    id: 'html-4-05', level: 4, topic: 'Video & audio',
    question: `<p>Which attribute adds the browser's play, pause and volume buttons?</p>
<pre><code>&lt;video src="intro.mp4" ???&gt;&lt;/video&gt;</code></pre>`,
    options: ['play', 'controls', 'buttons', 'player'],
    correctIndex: 1,
    hint: "It's a boolean attribute. The word describes the buttons that let you control playback.",
    lesson: `
      <h3>Embedding video</h3>
      <pre><code>&lt;video controls width="640" poster="thumb.jpg"&gt;
  &lt;source src="intro.webm" type="video/webm"&gt;
  &lt;source src="intro.mp4"  type="video/mp4"&gt;
  &lt;track kind="captions" src="intro.en.vtt" srclang="en" label="English"&gt;
  Sorry, your browser can't play this video.
&lt;/video&gt;</code></pre>
      <h3>Embedding audio</h3>
      <pre><code>&lt;audio controls src="podcast.mp3"&gt;&lt;/audio&gt;</code></pre>
      <h3>Useful attributes</h3>
      <ul>
        <li><code>controls</code>: shows play, pause, volume and more. Without it, users can't control the media!</li>
        <li><code>autoplay</code>: starts automatically. Browsers usually only allow this together with <code>muted</code>.</li>
        <li><code>loop</code>: restarts when finished. <code>poster</code> (video only): the image shown before playing.</li>
        <li><code>&lt;track&gt;</code> adds captions, so deaf users and people watching without sound can follow along.</li>
      </ul>
      <p class="tip">💡 With several <code>&lt;source&gt;</code> elements, the browser plays the first format it supports.</p>`,
  },
  {
    id: 'html-4-06', level: 4, topic: 'Embedding with <iframe>',
    question: `<p>You embed a map from another site with an <code>&lt;iframe&gt;</code>. Which attribute gives the frame an <strong>accessible name</strong> that screen readers announce?</p>`,
    options: ['alt', 'label', 'title', 'name'],
    correctIndex: 2,
    hint: 'It is a global attribute that, on an iframe, describes what the frame contains.',
    lesson: `
      <h3>The &lt;iframe&gt; element</h3>
      <p>An <code>&lt;iframe&gt;</code> shows another web page inside yours: maps, videos, forms.</p>
      <pre><code>&lt;iframe
  src="https://maps.example.com/embed?shop=42"
  title="Map showing the location of our shop"
  width="600" height="400"
  loading="lazy"&gt;
&lt;/iframe&gt;</code></pre>
      <ul>
        <li><code>title</code> names the frame for screen-reader users ("Map showing…").</li>
        <li><code>alt</code> and <code>label</code> are not iframe attributes. <code>name</code> exists, but only to target the frame from links and forms.</li>
        <li><code>loading="lazy"</code> delays loading until the frame is near the screen.</li>
        <li><code>sandbox</code> restricts what the embedded page may do (scripts, forms, pop-ups). Use it for content you don't fully trust.</li>
      </ul>
      <p class="tip">⚠️ Many sites refuse to be framed for security reasons. If a frame stays blank, look for the site's official "Embed" or "Share" code.</p>`,
  },
]
