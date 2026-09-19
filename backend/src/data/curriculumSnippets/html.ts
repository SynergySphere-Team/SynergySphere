import type { ExampleSnippet } from './types.js';

export function getHtmlExample(title: string): ExampleSnippet {
  const t = title.toLowerCase();

  if (/table/.test(t)) {
    return {
      title: 'HTML Table Structure',
      language: 'html',
      code: '<table>\n  <tr>\n    <th>Company</th>\n    <th>Contact</th>\n    <th>Country</th>\n  </tr>\n  <tr>\n    <td>Alfreds Futterkiste</td>\n    <td>Maria Anders</td>\n    <td>Germany</td>\n  </tr>\n  <tr>\n    <td>Centro comercial Moctezuma</td>\n    <td>Francisco Chang</td>\n    <td>Mexico</td>\n  </tr>\n</table>',
      explanation: 'An HTML table is defined with the <table> tag. Each table row is defined with a <tr> tag. A table header is defined with a <th> tag.\n\nExpected Output:\n[Rendered Table with 2 data rows and 3 columns]',
      syntax: ['<table><tr><th>Header</th></tr><tr><td>Data</td></tr></table>']
    };
  }
  if (/form|input/.test(t)) {
    return {
      title: 'HTML Form and Inputs',
      language: 'html',
      code: '<form action="/action_page.php">\n  <label for="fname">First name:</label><br>\n  <input type="text" id="fname" name="fname" value="John"><br>\n  <label for="lname">Last name:</label><br>\n  <input type="text" id="lname" name="lname" value="Doe"><br><br>\n  <input type="submit" value="Submit">\n</form>',
      explanation: 'An HTML form is used to collect user input. The user input is most often sent to a server for processing.\n\nExpected Output:\n[Rendered Form with First Name, Last Name, and Submit button]',
      syntax: ['<form action="url"><input type="text" /></form>']
    };
  }
  if (/list/.test(t)) {
    return {
      title: 'HTML Unordered and Ordered Lists',
      language: 'html',
      code: '<h2>Unordered List</h2>\n<ul>\n  <li>Coffee</li>\n  <li>Tea</li>\n  <li>Milk</li>\n</ul>\n\n<h2>Ordered List</h2>\n<ol>\n  <li>First item</li>\n  <li>Second item</li>\n</ol>',
      explanation: 'HTML lists allow web developers to group a set of related items in lists (unordered <ul> or ordered <ol>).\n\nExpected Output:\n[Bullet list of beverages followed by numbered list]',
      syntax: ['<ul><li>Item</li></ul>', '<ol><li>Item</li></ol>']
    };
  }
  if (/link/.test(t)) {
    return {
      title: 'HTML Hyperlinks',
      language: 'html',
      code: '<a href="https://www.w3schools.com/" target="_blank">Visit W3Schools.com!</a>',
      explanation: 'HTML links are hyperlinks. You can click on a link and jump to another document using the <a> tag.\n\nExpected Output:\n[Clickable link text navigating to W3Schools.com]',
      syntax: ['<a href="url">link text</a>']
    };
  }
  if (/image/.test(t)) {
    return {
      title: 'HTML Images',
      language: 'html',
      code: '<img src="img_girl.jpg" alt="Girl in a jacket" width="500" height="600">',
      explanation: 'The HTML <img> tag is used to embed an image in an HTML page with src and alt attributes.\n\nExpected Output:\n[Rendered image with alt fallback text]',
      syntax: ['<img src="url" alt="description" width="w" height="h">']
    };
  }
  if (/heading/.test(t)) {
    return {
      title: 'HTML Headings',
      language: 'html',
      code: '<h1>Heading 1</h1>\n<h2>Heading 2</h2>\n<h3>Heading 3</h3>\n<h4>Heading 4</h4>\n<h5>Heading 5</h5>\n<h6>Heading 6</h6>',
      explanation: 'HTML headings are titles or subtitles that you want to display on a webpage, defined from <h1> to <h6>.\n\nExpected Output:\n[Headings rendered in decreasing sizes from 1 to 6]',
      syntax: ['<h1>Heading</h1>', '<h2>Subheading</h2>']
    };
  }

  return {
    title: 'HTML Document Structure',
    language: 'html',
    code: '<!DOCTYPE html>\n<html>\n<head>\n  <title>W3Schools Tutorial</title>\n</head>\n<body>\n  <h1>My First Heading</h1>\n  <p>My first paragraph in HTML.</p>\n</body>\n</html>',
    explanation: 'All HTML documents must start with a document type declaration: <!DOCTYPE html>. The visible part is between <body> and </body>.\n\nExpected Output:\n[HTML page with H1 heading and paragraph]',
    syntax: ['<!DOCTYPE html>', '<html><head></head><body></body></html>']
  };
}
