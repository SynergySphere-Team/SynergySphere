import type { ExampleSnippet } from './types.js';

export function getHtmlExample(title: string): ExampleSnippet {
  const t = title.toLowerCase();

  if (/table/.test(t)) {
    return {
      title: 'HTML Table Structure',
      language: 'html',
      code: `<table>
  <thead>
    <tr>
      <th>Company</th>
      <th>Contact</th>
      <th>Country</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Alfreds Futterkiste</td>
      <td>Maria Anders</td>
      <td>Germany</td>
    </tr>
    <tr>
      <td>Centro Moctezuma</td>
      <td>Francisco Chang</td>
      <td>Mexico</td>
    </tr>
  </tbody>
</table>`,
      explanation: 'HTML tables format tabular data into rows (<tr>), header cells (<th>), and data cells (<td>).\n\nExpected Output:\n[Rendered Table with 2 data rows and 3 columns]',
      syntax: [
        '<table><tr><th>Header</th></tr><tr><td>Data</td></tr></table>',
        '<td colspan="2">Merged across 2 columns</td>',
      ],
      rules: [
        'Always wrap header rows inside <thead> and data rows inside <tbody> for semantic accessibility.',
        'Use <th> for header cells so screen readers can announce column relationships.',
        'Use CSS for table layout, spacing, and borders rather than deprecated HTML attributes.',
      ],
      commonMistakes: [
        'Using <td> instead of <th> for table headers.',
        'Omitting table row (<tr>) tags around table cells.',
        'Using tables for page layout instead of CSS Flexbox or Grid.',
      ],
    };
  }

  if (/form|input/.test(t)) {
    return {
      title: 'HTML Form & Input Elements',
      language: 'html',
      code: `<form action="/submit-form" method="POST">
  <label for="username">Username:</label>
  <input type="text" id="username" name="username" placeholder="Enter username" required />

  <label for="email">Email Address:</label>
  <input type="email" id="email" name="email" required />

  <label for="role">Role:</label>
  <select id="role" name="role">
    <option value="student">Student</option>
    <option value="developer">Developer</option>
  </select>

  <button type="submit">Submit Registration</button>
</form>`,
      explanation: 'Forms collect user input via text inputs, select dropdowns, checkboxes, and buttons, transmitting data to a server.\n\nExpected Output:\n[Interactive form with username, email, role dropdown, and submit button]',
      syntax: [
        '<form action="url" method="POST"><input type="text" name="field" /></form>',
        '<label for="id">Label Text</label><input id="id" />',
      ],
      rules: [
        'Always connect <label> elements to inputs via matching for and id attributes for accessibility.',
        'Specify appropriate input type attributes (email, number, tel, date) for native validation and mobile keyboards.',
        'Always provide a name attribute on input elements so their values serialize during form submission.',
      ],
      commonMistakes: [
        'Missing name attribute on inputs, meaning submitted form payloads will omit that field.',
        'Failing to link labels to inputs with the for and id attributes.',
      ],
    };
  }

  if (/list/.test(t)) {
    return {
      title: 'HTML Lists (Unordered & Ordered)',
      language: 'html',
      code: `<h3>Core Web Skills (Unordered)</h3>
<ul>
  <li>HTML5 Semantic Markup</li>
  <li>CSS3 Responsive Layouts</li>
  <li>JavaScript Modern Features</li>
</ul>

<h3>Build Steps (Ordered)</h3>
<ol>
  <li>Initialize repository</li>
  <li>Install dependencies</li>
  <li>Deploy to production</li>
</ol>`,
      explanation: 'Use <ul> with <li> for bulleted lists where order does not matter; use <ol> with <li> when sequence is numbered and significant.\n\nExpected Output:\n[Bulleted list of skills followed by numbered sequence 1-3]',
      syntax: [
        '<ul><li>Bullet item</li></ul>',
        '<ol><li>Numbered item</li></ol>',
        '<dl><dt>Term</dt><dd>Definition</dd></dl>',
      ],
    };
  }

  if (/link|anchor|bookmark/.test(t)) {
    return {
      title: 'HTML Hyperlinks (<a> Tag)',
      language: 'html',
      code: `<!-- External link opening in a new browser tab -->
<a href="https://developer.mozilla.org" target="_blank" rel="noopener noreferrer">
  Visit MDN Web Docs
</a>

<!-- Internal anchor jump link -->
<a href="#section2">Jump to Section 2</a>`,
      explanation: 'Hyperlinks connect web pages or jump to internal page targets using the href attribute on anchor <a> elements.\n\nExpected Output:\n[Clickable hyperlinks navigating to external destinations or page anchors]',
      syntax: [
        '<a href="url" target="_blank" rel="noopener noreferrer">Link text</a>',
        '<a href="#section-id">Jump to section</a>',
      ],
    };
  }

  if (/image|img\b|picture|figure/.test(t)) {
    return {
      title: 'HTML Responsive Images (<img> Tag)',
      language: 'html',
      code: `<figure>
  <img 
    src="https://images.unsplash.com/photo-1517694712202-14dd9538aa97" 
    alt="Developer typing code on a laptop keyboard in a workspace" 
    width="600" 
    height="400" 
    loading="lazy" 
  />
  <figcaption>Modern developer workstation with code editor.</figcaption>
</figure>`,
      explanation: 'Images are embedded with the void <img> element. The alt attribute is mandatory for accessibility and SEO fallback.\n\nExpected Output:\n[Embedded image displaying laptop workstation with caption below]',
      syntax: [
        '<img src="image.jpg" alt="Description of image" width="600" height="400" loading="lazy" />',
        '<figure><img ... /><figcaption>Caption</figcaption></figure>',
      ],
    };
  }

  if (/heading|paragraph|text formatting/.test(t)) {
    return {
      title: 'HTML Headings & Paragraphs',
      language: 'html',
      code: `<h1>Main Page Title (H1)</h1>
<h2>Major Section Heading (H2)</h2>
<p>
  This is a regular paragraph of text. You can emphasize text using 
  <strong>strong importance</strong> or <em>idiomatic stress</em>.
</p>
<p>
  Code snippets can be formatted with <code>&lt;code&gt;</code> and 
  keyboard inputs with <kbd>Ctrl + S</kbd>.
</p>`,
      explanation: 'Headings range from <h1> (highest significance) down to <h6>. Paragraphs (<p>) encapsulate blocks of readable text.\n\nExpected Output:\n[Hierarchical headings followed by styled paragraph blocks]',
      syntax: [
        '<h1>Most Important Heading</h1>',
        '<p>Paragraph of text...</p>',
        '<strong>Bold text</strong> <em>Italic text</em>',
      ],
    };
  }

  if (/semantic|layout|header|footer|nav|article|section/.test(t)) {
    return {
      title: 'HTML5 Semantic Layout Structure',
      language: 'html',
      code: `<header>
  <h1>SynergySphere Campus</h1>
  <nav>
    <a href="/hub">Learning Hub</a> | <a href="/projects">Projects</a>
  </nav>
</header>

<main>
  <article>
    <h2>Understanding Semantic HTML</h2>
    <p>Semantic tags describe their meaning clearly to both browser and developer.</p>
  </article>
  <aside>
    <h3>Related Resources</h3>
    <p>Quick reference guides and tutorials.</p>
  </aside>
</main>

<footer>
  <p>&copy; 2026 SynergySphere. All rights reserved.</p>
</footer>`,
      explanation: 'HTML5 semantic elements (<header>, <nav>, <main>, <article>, <aside>, <footer>) provide accessible, readable page structure.\n\nExpected Output:\n[Structured webpage with distinct header, navigation, article, sidebar, and footer]',
      syntax: [
        '<header></header><nav></nav><main><article></article><aside></aside></main><footer></footer>',
      ],
    };
  }

  if (/canvas|svg|graphics/.test(t)) {
    return {
      title: 'HTML Graphics (SVG & Canvas)',
      language: 'html',
      code: `<!-- Vector Graphic: Scalable, Crisp at any resolution -->
<svg width="100" height="100">
  <circle cx="50" cy="50" r="40" stroke="#0284c7" stroke-width="4" fill="#38bdf8" />
</svg>

<!-- Raster Canvas: Pixel-based drawing surface via JavaScript -->
<canvas id="myCanvas" width="200" height="100" style="border:1px solid #ddd;"></canvas>
<script>
  const canvas = document.getElementById("myCanvas");
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#22c55e";
  ctx.fillRect(20, 20, 160, 60);
</script>`,
      explanation: 'SVG creates resolution-independent vector graphics using XML. Canvas provides a pixel drawing context driven by JavaScript.\n\nExpected Output:\n[Rendered blue SVG circle and green canvas rectangle]',
      syntax: [
        '<svg width="w" height="h"><circle cx="x" cy="y" r="r" /></svg>',
        '<canvas id="id" width="w" height="h"></canvas>',
      ],
    };
  }

  if (/video|audio|media/.test(t)) {
    return {
      title: 'HTML Media (<video> and <audio>)',
      language: 'html',
      code: `<video width="480" height="270" controls poster="poster.jpg">
  <source src="movie.mp4" type="video/mp4" />
  <source src="movie.webm" type="video/webm" />
  Your browser does not support the video tag.
</video>

<audio controls>
  <source src="audio.mp3" type="audio/mpeg" />
  Your browser does not support the audio element.
</audio>`,
      explanation: 'HTML5 native media elements (<video> and <audio>) embed playback with built-in user controls and fallback sources.\n\nExpected Output:\n[Interactive video player and audio player controls with play/pause/volume]',
      syntax: [
        '<video width="w" height="h" controls><source src="file.mp4" type="video/mp4" /></video>',
        '<audio controls><source src="sound.mp3" type="audio/mpeg" /></audio>',
      ],
    };
  }

  if (/api|geolocation|storage|worker/.test(t)) {
    return {
      title: 'HTML Web APIs (localStorage & Geolocation)',
      language: 'html',
      code: `<button onclick="saveTheme()">Save Dark Theme</button>
<button onclick="loadTheme()">Check Saved Theme</button>
<p id="output"></p>

<script>
  function saveTheme() {
    localStorage.setItem('theme', 'dark');
    document.getElementById('output').textContent = 'Saved theme: dark to localStorage!';
  }

  function loadTheme() {
    const saved = localStorage.getItem('theme') || 'default';
    document.getElementById('output').textContent = 'Loaded theme: ' + saved;
  }
</script>`,
      explanation: 'HTML Web APIs expose device capabilities and browser features, such as client-side persistent storage and geolocation.\n\nExpected Output:\n[Buttons saving and retrieving data from browser localStorage]',
      syntax: [
        'localStorage.setItem(key, value);',
        'const val = localStorage.getItem(key);',
        'navigator.geolocation.getCurrentPosition(successCallback);',
      ],
    };
  }

  return {
    title: `HTML ${title}`,
    language: 'html',
    code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} Tutorial</title>
</head>
<body>
  <header>
    <h1>${title} in HTML5</h1>
  </header>
  <main>
    <section>
      <p>Demonstrating standard markup, attributes, and browser rendering for ${title}.</p>
    </section>
  </main>
</body>
</html>`,
    explanation: `Demonstrates ${title} using valid HTML5 semantic tags, doctype declaration, and accessible structure.\n\nExpected Output:\n[Rendered HTML5 webpage with header, section, and formatted content]`,
    syntax: [
      '<!DOCTYPE html>',
      '<html lang="en"><head><title>Title</title></head><body>...</body></html>',
    ],
  };
}
