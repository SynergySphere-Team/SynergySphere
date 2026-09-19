import type { ExampleSnippet } from './types.js';

export function getNodeExample(title: string): ExampleSnippet {
  const t = title.toLowerCase();

  if (/home|intro|get started|requirements/.test(t)) {
    return {
      title: 'Node.js Get Started (Console Output)',
      language: 'javascript',
      code: 'console.log("Hello World from Node.js!");\nconsole.log("Node version:", process.version);',
      explanation: 'Node.js is an open source server environment that runs JavaScript code outside of a browser.\n\nExpected Output:\nHello World from Node.js!\nNode version: (active v20/v22 string)',
      syntax: ['node app.js', 'process.version']
    };
  }
  if (/browser vs node|vs browser/.test(t)) {
    return {
      title: 'Node.js vs Browser Environments',
      language: 'javascript',
      code: '// In Node.js, there is no window or document object\nconsole.log("Global object in Node.js:", typeof global);\nconsole.log("Process platform:", process.platform);\n// Window is undefined in Node:\nconsole.log("Window exists?", typeof window !== "undefined");',
      explanation: 'In the browser, JavaScript interacts with DOM and Window objects. In Node.js, it has access to filesystem, OS, and process globals.\n\nExpected Output:\nGlobal object in Node.js: object\nProcess platform: win32\nWindow exists? false',
      syntax: ['global', 'process']
    };
  }
  if (/command line|cli\b/.test(t)) {
    return {
      title: 'Node.js Command Line Arguments (process.argv)',
      language: 'javascript',
      code: 'process.argv.forEach((val, index) => {\n  console.log(`${index}: ${val}`);\n});\nconst args = process.argv.slice(2);\nconsole.log("User arguments:", args);',
      explanation: 'Node.js parses command line arguments passed when launching the process and makes them accessible in process.argv.\n\nExpected Output:\n0: node\n1: app.js\nUser arguments: []',
      syntax: ['process.argv.slice(2)']
    };
  }
  if (/error handling|uncaughtexception/.test(t)) {
    return {
      title: 'Node.js Error Handling',
      language: 'javascript',
      code: 'try {\n  throw new Error("Something went wrong on the server!");\n} catch (err) {\n  console.error("Caught error message:", err.message);\n}\n\nprocess.on("unhandledRejection", (reason, promise) => {\n  console.error("Unhandled Rejection at:", promise, "reason:", reason);\n});',
      explanation: 'Robust Node.js servers handle synchronous errors with try/catch blocks and asynchronous unhandled rejections using process events.\n\nExpected Output:\nCaught error message: Something went wrong on the server!',
      syntax: ['try { ... } catch (err) { ... }', 'process.on("unhandledRejection", handler)']
    };
  }
  if (/assert module|assert\b/.test(t)) {
    return {
      title: 'Node.js Assert Module',
      language: 'javascript',
      code: 'const assert = require("assert");\n\nassert.strictEqual(1 + 1, 2, "Math calculation should equal 2");\nconsole.log("Assertion passed: 1 + 1 === 2");\nassert.deepStrictEqual({ a: 1 }, { a: 1 });\nconsole.log("Deep strict equality passed.");',
      explanation: 'The assert module provides a set of assertion functions for verifying invariants in your code and unit testing.\n\nExpected Output:\nAssertion passed: 1 + 1 === 2\nDeep strict equality passed.',
      syntax: ['assert.strictEqual(actual, expected)', 'assert.deepStrictEqual(actual, expected)']
    };
  }
  if (/util module|util\b/.test(t)) {
    return {
      title: 'Node.js Util Module',
      language: 'javascript',
      code: 'const util = require("util");\n\nconst formatted = util.format("Hello %s, your user ID is %d", "Alice", 101);\nconsole.log(formatted);\n\nconst inspectOutput = util.inspect({ nested: { value: 42 } }, { depth: 2, colors: false });\nconsole.log("Inspected:", inspectOutput);',
      explanation: 'The util module is primarily designed to support the needs of Node.js own internal APIs, providing string formatting and object inspection.\n\nExpected Output:\nHello Alice, your user ID is 101\nInspected: { nested: { value: 42 } }',
      syntax: ['util.format(format, ...args)', 'util.promisify(fn)', 'util.inspect(obj)']
    };
  }
  if (/security/.test(t)) {
    return {
      title: 'Node.js Security Best Practices',
      language: 'javascript',
      code: '// Prevent injection and sanitize user input\nconst userInput = "<script>alert(1)</script>John";\nconst sanitized = userInput.replace(/<[^>]*>?/gm, "");\nconsole.log("Sanitized input:", sanitized);\nconsole.log("Security header guidance: set X-Content-Type-Options: nosniff");',
      explanation: 'Securing Node.js applications requires sanitizing inputs, using secure cookies, keeping npm packages updated, and adding security headers.\n\nExpected Output:\nSanitized input: alert(1)John\nSecurity header guidance: set X-Content-Type-Options: nosniff',
      syntax: ['helmet()', 'cors()']
    };
  }
  if (/deployment|ci\/cd|production/.test(t)) {
    return {
      title: 'Node.js Production Deployment Configuration',
      language: 'javascript',
      code: 'const isProduction = process.env.NODE_ENV === "production";\nconst port = process.env.PORT || 8080;\n\nconsole.log("Production mode enabled:", isProduction);\nconsole.log("Listening on assigned port:", port);',
      explanation: 'Deploying Node.js applications to cloud hosting requires reading runtime environment variables and binding to dynamic host ports.\n\nExpected Output:\nProduction mode enabled: false\nListening on assigned port: 8080',
      syntax: ['process.env.NODE_ENV === "production"']
    };
  }
  if (/logging|monitoring|performance/.test(t)) {
    return {
      title: 'Node.js Performance Monitoring & Logging',
      language: 'javascript',
      code: 'const { performance } = require("perf_hooks");\n\nconst start = performance.now();\n// Simulate database or computational work\nlet total = 0;\nfor (let i = 0; i < 100000; i++) total += i;\nconst duration = (performance.now() - start).toFixed(4);\n\nconsole.log(`Execution time: ${duration} ms, total: ${total}`);',
      explanation: 'Monitoring performance with perf_hooks allows tracking high-resolution execution time and identifying event loop bottlenecks.\n\nExpected Output:\nExecution time: 0.1250 ms, total: 4999950000',
      syntax: ['performance.now()']
    };
  }
  if (/test|testing/.test(t)) {
    return {
      title: 'Node.js Native Test Runner (node:test)',
      language: 'javascript',
      code: 'const test = require("node:test");\nconst assert = require("node:assert");\n\ntest("synchronous passing test", (t) => {\n  assert.strictEqual(1, 1);\n  console.log("Test unit passed successfully.");\n});',
      explanation: 'Node.js provides a built-in test runner module (node:test) with subtest support, assertions, and reporting.\n\nExpected Output:\nTest unit passed successfully.',
      syntax: ['test("test name", (t) => { ... })']
    };
  }
  if (/typescript|lint/.test(t)) {
    return {
      title: 'Node.js with TypeScript and Linting',
      language: 'typescript',
      code: 'interface UserProfile {\n  id: number;\n  name: string;\n  isActive: boolean;\n}\n\nconst user: UserProfile = { id: 1, name: "Alice", isActive: true };\nconsole.log(`User ${user.name} (ID: ${user.id}) is active: ${user.isActive}`);',
      explanation: 'TypeScript adds static type definitions to Node.js applications, catching errors during compilation.\n\nExpected Output:\nUser Alice (ID: 1) is active: true',
      syntax: ['interface TypeName { ... }']
    };
  }
  if (/event loop|architecture|v8/.test(t)) {
    return {
      title: 'Node.js Event Loop Execution Order',
      language: 'javascript',
      code: 'console.log("1. Synchronous script start");\n\nsetTimeout(() => {\n  console.log("4. setTimeout macrotask executed");\n}, 0);\n\nPromise.resolve().then(() => {\n  console.log("3. Promise microtask executed");\n});\n\nprocess.nextTick(() => {\n  console.log("2. process.nextTick priority callback");\n});',
      explanation: 'Node.js uses a single-threaded event loop that executes synchronous code first, followed by microtask queues and macrotasks.\n\nExpected Output:\n1. Synchronous script start\n2. process.nextTick priority callback\n3. Promise microtask executed\n4. setTimeout macrotask executed',
      syntax: ['process.nextTick(fn)', 'setTimeout(fn, 0)']
    };
  }
  if (/async\/await|promises|node async/.test(t)) {
    return {
      title: 'Node.js Promises and Async/Await',
      language: 'javascript',
      code: 'const fs = require("fs").promises;\n\nasync function readFileContent() {\n  try {\n    await fs.writeFile("async_demo.txt", "Asynchronous file write completed.");\n    const content = await fs.readFile("async_demo.txt", "utf8");\n    console.log("Read content:", content);\n  } catch (err) {\n    console.error("Async error:", err.message);\n  }\n}\n\nreadFileContent();',
      explanation: 'Node.js provides promise-based versions of built-in APIs via require("fs").promises, enabling async/await.\n\nExpected Output:\nRead content: Asynchronous file write completed.',
      syntax: ['const fs = require("fs").promises;', 'const data = await fs.readFile(path, "utf8");']
    };
  }
  if (/es modules/.test(t)) {
    return {
      title: 'Node.js ES Modules (import/export)',
      language: 'javascript',
      code: '// In mathHelper.mjs:\n// export const add = (a, b) => a + b;\n\n// In main.mjs:\n// import { add } from "./mathHelper.mjs";\n// console.log("Sum:", add(5, 7));\nconsole.log("ES Modules use import and export syntax with .mjs or \\"type\\": \\"module\\".");',
      explanation: 'Node.js supports ECMAScript modules natively using the .mjs extension or adding "type": "module" in package.json.\n\nExpected Output:\nES Modules use import and export syntax with .mjs or "type": "module".',
      syntax: ['import { fn } from "./module.mjs";', 'export const fn = () => { ... };']
    };
  }
  if (/package\.json|npm|dependencies/.test(t)) {
    return {
      title: 'Node.js package.json Configuration',
      language: 'json',
      code: '{\n  "name": "w3schools-demo-app",\n  "version": "1.0.0",\n  "description": "Node.js application guide",\n  "main": "index.js",\n  "scripts": {\n    "start": "node index.js",\n    "test": "node --test"\n  },\n  "dependencies": {\n    "express": "^4.19.2"\n  }\n}',
      explanation: 'The package.json file is the manifest of a project. It can contain project metadata, scripts, and dependencies.\n\nExpected Output:\n[Valid package.json configuration file]',
      syntax: ['npm init -y', 'npm install package_name']
    };
  }
  if (/https module|https/.test(t)) {
    return {
      title: 'Node.js HTTPS Client Request',
      language: 'javascript',
      code: 'const https = require("https");\n\nhttps.get("https://jsonplaceholder.typicode.com/todos/1", (resp) => {\n  let data = "";\n  resp.on("data", (chunk) => { data += chunk; });\n  resp.on("end", () => {\n    console.log("Received data:", JSON.parse(data).title);\n  });\n}).on("error", (err) => {\n  console.log("Error: " + err.message);\n});',
      explanation: 'The HTTPS module enables transmitting data over TLS/SSL using https.get() and https.request().\n\nExpected Output:\nReceived data: delectus aut autem',
      syntax: ['const https = require("https");', 'https.get(url, callback);']
    };
  }
  if (/http module|http\b/.test(t)) {
    return {
      title: 'Node.js HTTP Server',
      language: 'javascript',
      code: 'const http = require("http");\n\nconst server = http.createServer((req, res) => {\n  res.writeHead(200, { "Content-Type": "text/plain" });\n  res.end("Hello World from Node.js HTTP Server!\\n");\n});\n\nserver.listen(8080, () => {\n  console.log("Server listening at http://localhost:8080/");\n  server.close();\n});',
      explanation: 'Node.js has a built-in module called HTTP, which allows Node.js to transfer data over HTTP.\n\nExpected Output:\nServer listening at http://localhost:8080/',
      syntax: ['http.createServer((req, res) => { ... }).listen(port);']
    };
  }
  if (/file system|fs\b/.test(t)) {
    return {
      title: 'Node.js File System (fs module)',
      language: 'javascript',
      code: 'const fs = require("fs");\n\n// Write to file\nfs.writeFileSync("mynewfile.txt", "Hello from W3Schools Node.js tutorial!");\n\n// Read from file\nconst data = fs.readFileSync("mynewfile.txt", "utf8");\nconsole.log("File content:", data);',
      explanation: 'The Node.js file system module allows you to work with the file system on your computer (read, write, delete, rename).\n\nExpected Output:\nFile content: Hello from W3Schools Node.js tutorial!',
      syntax: ['fs.writeFileSync(path, content);', 'fs.readFileSync(path, encoding);']
    };
  }
  if (/path module|path\b/.test(t)) {
    return {
      title: 'Node.js Path Module',
      language: 'javascript',
      code: 'const path = require("path");\n\nconst filename = path.basename("/Users/Refsnes/demo_path.js");\nconst ext = path.extname("/Users/Refsnes/demo_path.js");\nconst joined = path.join("home", "user", "documents", "test.txt");\n\nconsole.log("Filename:", filename);\nconsole.log("Extension:", ext);\nconsole.log("Joined path:", joined);',
      explanation: 'The Path module provides a way of working with directories and file paths across Windows and POSIX systems.\n\nExpected Output:\nFilename: demo_path.js\nExtension: .js\nJoined path: home/user/documents/test.txt',
      syntax: ['path.join(...paths)', 'path.basename(path)', 'path.extname(path)']
    };
  }
  if (/os module|os\b/.test(t)) {
    return {
      title: 'Node.js OS Module',
      language: 'javascript',
      code: 'const os = require("os");\n\nconsole.log("Platform:", os.platform());\nconsole.log("Architecture:", os.arch());\nconsole.log("Total Memory:", (os.totalmem() / 1024 / 1024 / 1024).toFixed(2), "GB");\nconsole.log("CPUs count:", os.cpus().length);',
      explanation: "The OS module provides information about the computer's operating system and physical hardware.\n\nExpected Output:\nPlatform: win32\nArchitecture: x64\nTotal Memory: (amount) GB\nCPUs count: (count)",
      syntax: ['os.platform()', 'os.arch()', 'os.totalmem()']
    };
  }
  if (/url module|url\b/.test(t)) {
    return {
      title: 'Node.js URL Module',
      language: 'javascript',
      code: 'const url = require("url");\n\nconst adr = "http://localhost:8080/default.htm?year=2026&month=february";\nconst q = url.parse(adr, true);\n\nconsole.log("Host:", q.host);\nconsole.log("Pathname:", q.pathname);\nconsole.log("Query Year:", q.query.year);',
      explanation: 'The URL module splits up a web address into readable parts (protocol, host, pathname, query parameters).\n\nExpected Output:\nHost: localhost:8080\nPathname: /default.htm\nQuery Year: 2026',
      syntax: ['url.parse(address, true)']
    };
  }
  if (/events module|events\b/.test(t)) {
    return {
      title: 'Node.js Events and EventEmitter',
      language: 'javascript',
      code: 'const events = require("events");\nconst eventEmitter = new events.EventEmitter();\n\n// Create an event handler:\nconst myEventHandler = function (data) {\n  console.log("Event triggered with payload:", data);\n};\n\n// Assign handler to an event:\neventEmitter.on("dataProcessed", myEventHandler);\n\n// Fire the event:\neventEmitter.emit("dataProcessed", { id: 101, status: "SUCCESS" });',
      explanation: 'Much of the Node.js core API is built around an idiomatic asynchronous event-driven architecture with EventEmitter.\n\nExpected Output:\nEvent triggered with payload: { id: 101, status: \'SUCCESS\' }',
      syntax: ['emitter.on(eventName, handler);', 'emitter.emit(eventName, data);']
    };
  }
  if (/stream module|stream\b/.test(t)) {
    return {
      title: 'Node.js Streams and Piping',
      language: 'javascript',
      code: 'const fs = require("fs");\n\n// Create files for stream demonstration\nfs.writeFileSync("input.txt", "Stream content transferring from reader to writer.");\n\nconst readerStream = fs.createReadStream("input.txt");\nconst writerStream = fs.createWriteStream("output.txt");\n\n// Pipe the read and write operations\nreaderStream.pipe(writerStream);\n\nwriterStream.on("finish", () => {\n  console.log("Pipe write completed successfully.");\n});',
      explanation: 'Streams are objects that let you read data from a source or write data to a destination in continuous fashion without high memory usage.\n\nExpected Output:\nPipe write completed successfully.',
      syntax: ['readableStream.pipe(writableStream);']
    };
  }
  if (/buffer module|buffer\b/.test(t)) {
    return {
      title: 'Node.js Buffer Module',
      language: 'javascript',
      code: 'const buf1 = Buffer.from("Node.js");\nconst buf2 = Buffer.alloc(10);\nbuf2.write("Buffers");\n\nconsole.log("Buffer 1 (string):", buf1.toString());\nconsole.log("Buffer 1 (hex):", buf1.toString("hex"));\nconsole.log("Buffer 2 length:", buf2.length);',
      explanation: 'The Buffer class is used to handle raw binary data directly in memory, without requiring character encoding overhead.\n\nExpected Output:\nBuffer 1 (string): Node.js\nBuffer 1 (hex): 4e6f64652e6a73\nBuffer 2 length: 10',
      syntax: ['Buffer.from(string)', 'Buffer.alloc(size)']
    };
  }
  if (/crypto module|crypto\b/.test(t)) {
    return {
      title: 'Node.js Crypto Module (Hashing)',
      language: 'javascript',
      code: 'const crypto = require("crypto");\n\nconst secret = "my_secret_key";\nconst hash = crypto.createHmac("sha256", secret)\n                   .update("Password123")\n                   .digest("hex");\n\nconsole.log("SHA-256 HMAC Hash:", hash.substring(0, 32) + "...");',
      explanation: "The Crypto module provides cryptographic functionality that includes a set of wrappers for OpenSSL's hash, HMAC, cipher, decipher, sign, and verify functions.\n\nExpected Output:\nSHA-256 HMAC Hash: (hexadecimal string)...",
      syntax: ['crypto.createHmac("sha256", secret).update(data).digest("hex")']
    };
  }
  if (/timers module|timers\b/.test(t)) {
    return {
      title: 'Node.js Timers (setTimeout, setInterval)',
      language: 'javascript',
      code: 'console.log("Start");\n\nconst timer = setTimeout(() => {\n  console.log("Executed after 100 milliseconds");\n}, 100);\n\nsetImmediate(() => {\n  console.log("setImmediate executed in check phase");\n});\n\nconsole.log("End");',
      explanation: 'The Timers module contains functions that execute code after a specified period of time.\n\nExpected Output:\nStart\nEnd\nsetImmediate executed in check phase\nExecuted after 100 milliseconds',
      syntax: ['setTimeout(callback, ms);', 'setImmediate(callback);']
    };
  }
  if (/dns module|dns\b/.test(t)) {
    return {
      title: 'Node.js DNS Module',
      language: 'javascript',
      code: 'const dns = require("dns");\n\ndns.lookup("w3schools.com", (err, address, family) => {\n  if (err) throw err;\n  console.log("IP Address: %j, IPv%s", address, family);\n});',
      explanation: 'The DNS module contains functions to resolve domain names to IP addresses.\n\nExpected Output:\nIP Address: "(resolved IP)", IPv4',
      syntax: ['dns.lookup(hostname, callback);']
    };
  }
  if (/readline module|readline\b/.test(t)) {
    return {
      title: 'Node.js Readline Module',
      language: 'javascript',
      code: 'const readline = require("readline");\n\nconst rl = readline.createInterface({\n  input: process.stdin,\n  output: process.stdout\n});\n\nconsole.log("Readline interface created ready for interactive console input.");\nrl.close();',
      explanation: 'The Readline module provides an interface for reading data from a Readable stream (such as process.stdin) one line at a time.\n\nExpected Output:\nReadline interface created ready for interactive console input.',
      syntax: ['readline.createInterface({ input, output })']
    };
  }
  if (/express\.js|express|middleware|rest api|graphql/.test(t)) {
    return {
      title: 'Node.js Express REST API & Middleware',
      language: 'javascript',
      code: 'const express = require("express");\nconst app = express();\n\n// Built-in body parsing middleware\napp.use(express.json());\n\n// REST Endpoint\napp.get("/api/users", (req, res) => {\n  res.json([\n    { id: 1, name: "John Doe", role: "Developer" },\n    { id: 2, name: "Jane Smith", role: "Designer" }\n  ]);\n});\n\nconsole.log("Express REST API initialized with routes and JSON middleware.");',
      explanation: 'Express is a minimal and flexible Node.js web application framework that provides a robust set of features for web and mobile applications.\n\nExpected Output:\nExpress REST API initialized with routes and JSON middleware.',
      syntax: ['app.use(express.json());', 'app.get(path, (req, res) => { ... });']
    };
  }

  // Differentiate MySQL queries
  if (/mysql delete/.test(t)) {
    return {
      title: 'Node.js MySQL Delete Record',
      language: 'javascript',
      code: 'const mysql = require("mysql2");\nconst con = mysql.createConnection({ host: "localhost", user: "root", password: "", database: "mydb" });\nconst sql = "DELETE FROM customers WHERE address = \'Mountain 21\'";\ncon.query(sql, (err, result) => {\n  console.log("Number of records deleted:", result.affectedRows);\n});',
      explanation: 'Delete records from an existing table by using the "DELETE FROM" statement with a WHERE clause.\n\nExpected Output:\nNumber of records deleted: 1',
      syntax: ['con.query("DELETE FROM table WHERE ...", callback);']
    };
  }
  if (/mysql update/.test(t)) {
    return {
      title: 'Node.js MySQL Update Record',
      language: 'javascript',
      code: 'const mysql = require("mysql2");\nconst con = mysql.createConnection({ host: "localhost", user: "root", password: "", database: "mydb" });\nconst sql = "UPDATE customers SET address = \'Canyon 123\' WHERE address = \'Valley 345\'";\ncon.query(sql, (err, result) => {\n  console.log("Records updated:", result.affectedRows);\n});',
      explanation: 'Update existing records in a table by using the "UPDATE" statement in MySQL.\n\nExpected Output:\nRecords updated: 1',
      syntax: ['con.query("UPDATE table SET col = val WHERE ...", callback);']
    };
  }
  if (/mysql drop/.test(t)) {
    return {
      title: 'Node.js MySQL Drop Table',
      language: 'javascript',
      code: 'const mysql = require("mysql2");\nconst con = mysql.createConnection({ host: "localhost", user: "root", password: "", database: "mydb" });\nconst sql = "DROP TABLE IF EXISTS customers";\ncon.query(sql, (err, result) => {\n  console.log("Table deleted successfully.");\n});',
      explanation: 'Delete an existing table by using the "DROP TABLE" statement.\n\nExpected Output:\nTable deleted successfully.',
      syntax: ['con.query("DROP TABLE name", callback);']
    };
  }
  if (/mysql limit/.test(t)) {
    return {
      title: 'Node.js MySQL Limit Query',
      language: 'javascript',
      code: 'const mysql = require("mysql2");\nconst con = mysql.createConnection({ host: "localhost", user: "root", password: "", database: "mydb" });\nconst sql = "SELECT * FROM customers LIMIT 5 OFFSET 2";\ncon.query(sql, (err, result) => {\n  console.log("Fetched records count:", result.length);\n});',
      explanation: 'Use the "LIMIT" clause to limit the number of records returned from the query, with optional OFFSET.\n\nExpected Output:\nFetched records count: 5',
      syntax: ['con.query("SELECT * FROM table LIMIT 5", callback);']
    };
  }
  if (/mysql join/.test(t)) {
    return {
      title: 'Node.js MySQL JOIN Tables',
      language: 'javascript',
      code: 'const mysql = require("mysql2");\nconst con = mysql.createConnection({ host: "localhost", user: "root", password: "", database: "mydb" });\nconst sql = "SELECT users.name AS user, products.name AS favorite FROM users JOIN products ON users.favorite_product = products.id";\ncon.query(sql, (err, result) => {\n  console.log("Joined records result count:", result.length);\n});',
      explanation: 'A JOIN clause is used to combine rows from two or more tables, based on a related column between them.\n\nExpected Output:\nJoined records result count: 10',
      syntax: ['con.query("SELECT ... FROM t1 JOIN t2 ON ...", callback);']
    };
  }
  if (/mysql create database|mysql create table/.test(t)) {
    return {
      title: 'Node.js MySQL Create Table',
      language: 'javascript',
      code: 'const mysql = require("mysql2");\n\nconst con = mysql.createConnection({\n  host: "localhost",\n  user: "root",\n  password: "",\n  database: "mydb"\n});\n\nconst sql = "CREATE TABLE customers (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255), address VARCHAR(255))";\nconsole.log("SQL Prepared:", sql);',
      explanation: 'Use SQL queries inside con.query() to create databases and tables in MySQL using Node.js.\n\nExpected Output:\nSQL Prepared: CREATE TABLE customers (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255), address VARCHAR(255))',
      syntax: ['con.query("CREATE TABLE ...", callback);']
    };
  }
  if (/mysql insert into|mysql insert/.test(t)) {
    return {
      title: 'Node.js MySQL Insert Records',
      language: 'javascript',
      code: 'const mysql = require("mysql2");\nconst con = mysql.createConnection({ host: "localhost", user: "root", password: "", database: "mydb" });\n\nconst sql = "INSERT INTO customers (name, address) VALUES (\'Company Inc\', \'Highway 37\')";\nconsole.log("Insert query:", sql);',
      explanation: 'To fill a table in MySQL, use the "INSERT INTO" statement via the query() method.\n\nExpected Output:\nInsert query: INSERT INTO customers (name, address) VALUES (\'Company Inc\', \'Highway 37\')',
      syntax: ['con.query("INSERT INTO customers ...", callback);']
    };
  }
  if (/mysql select|mysql where|mysql order by|mysql/.test(t)) {
    return {
      title: 'Node.js MySQL SELECT Query',
      language: 'javascript',
      code: 'const mysql = require("mysql2");\nconst con = mysql.createConnection({ host: "localhost", user: "root", password: "", database: "mydb" });\n\nconst sql = "SELECT name, address FROM customers WHERE address LIKE \'S%\' ORDER BY name";\nconsole.log("Querying database:", sql);',
      explanation: 'To select data from a table in MySQL, use the "SELECT" statement in Node.js.\n\nExpected Output:\nQuerying database: SELECT name, address FROM customers WHERE address LIKE \'S%\' ORDER BY name',
      syntax: ['con.query("SELECT * FROM customers WHERE ...", callback);']
    };
  }

  // Differentiate MongoDB queries
  if (/mongodb delete/.test(t)) {
    return {
      title: 'Node.js MongoDB Delete Document',
      language: 'javascript',
      code: 'const { MongoClient } = require("mongodb");\nconst client = new MongoClient("mongodb://localhost:27017");\n\nasync function deleteItem() {\n  const db = client.db("mydb");\n  const result = await db.collection("customers").deleteOne({ address: "Mountain 21" });\n  console.log("Documents deleted:", result.deletedCount);\n}\ndeleteItem();',
      explanation: 'To delete a record or document from a collection in MongoDB, use deleteOne() or deleteMany().\n\nExpected Output:\nDocuments deleted: 1',
      syntax: ['db.collection("customers").deleteOne(query);']
    };
  }
  if (/mongodb update/.test(t)) {
    return {
      title: 'Node.js MongoDB Update Document',
      language: 'javascript',
      code: 'const { MongoClient } = require("mongodb");\nconst client = new MongoClient("mongodb://localhost:27017");\n\nasync function updateDoc() {\n  const db = client.db("mydb");\n  const query = { address: "Valley 345" };\n  const newvalues = { $set: { name: "Mickey", address: "Canyon 123" } };\n  const res = await db.collection("customers").updateOne(query, newvalues);\n  console.log("Documents updated:", res.modifiedCount);\n}\nupdateDoc();',
      explanation: 'Update a record, or document as it is called in MongoDB, by using the updateOne() or updateMany() method.\n\nExpected Output:\nDocuments updated: 1',
      syntax: ['db.collection("customers").updateOne(query, { $set: values });']
    };
  }
  if (/mongodb sort/.test(t)) {
    return {
      title: 'Node.js MongoDB Sort Query',
      language: 'javascript',
      code: 'const { MongoClient } = require("mongodb");\nconst client = new MongoClient("mongodb://localhost:27017");\n\nasync function sortCustomers() {\n  const db = client.db("mydb");\n  const mysort = { name: 1 }; // Ascending (1) or Descending (-1)\n  const result = await db.collection("customers").find().sort(mysort).toArray();\n  console.log("Sorted records count:", result.length);\n}\nsortCustomers();',
      explanation: 'Use the sort() method to sort the result in ascending or descending order.\n\nExpected Output:\nSorted records count: 14',
      syntax: ['db.collection("customers").find().sort({ field: 1 });']
    };
  }
  if (/mongodb limit/.test(t)) {
    return {
      title: 'Node.js MongoDB Limit Query',
      language: 'javascript',
      code: 'const { MongoClient } = require("mongodb");\nconst client = new MongoClient("mongodb://localhost:27017");\n\nasync function limitQuery() {\n  const db = client.db("mydb");\n  const result = await db.collection("customers").find().limit(5).toArray();\n  console.log("Limited items count:", result.length);\n}\nlimitQuery();',
      explanation: 'To limit the result in MongoDB, use the limit() method specifying how many documents to return.\n\nExpected Output:\nLimited items count: 5',
      syntax: ['db.collection("customers").find().limit(5);']
    };
  }
  if (/mongodb drop/.test(t)) {
    return {
      title: 'Node.js MongoDB Drop Collection',
      language: 'javascript',
      code: 'const { MongoClient } = require("mongodb");\nconst client = new MongoClient("mongodb://localhost:27017");\n\nasync function dropCol() {\n  const db = client.db("mydb");\n  const del = await db.collection("customers").drop();\n  console.log("Collection dropped:", del);\n}\ndropCol();',
      explanation: 'You can delete a table, or collection as it is called in MongoDB, by using the drop() method.\n\nExpected Output:\nCollection dropped: true',
      syntax: ['db.collection("customers").drop();']
    };
  }
  if (/mongodb join/.test(t)) {
    return {
      title: 'Node.js MongoDB Left Outer Join ($lookup)',
      language: 'javascript',
      code: 'const { MongoClient } = require("mongodb");\nconst client = new MongoClient("mongodb://localhost:27017");\n\nasync function joinCollections() {\n  const db = client.db("mydb");\n  const res = await db.collection("orders").aggregate([\n    { $lookup: { from: "products", localField: "product_id", foreignField: "_id", as: "orderdetails" } }\n  ]).toArray();\n  console.log("Joined aggregates returned:", res.length);\n}\njoinCollections();',
      explanation: 'MongoDB provides the $lookup stage in aggregation to perform left outer joins to another collection in the same database.\n\nExpected Output:\nJoined aggregates returned: 3',
      syntax: ['db.collection("name").aggregate([{ $lookup: { ... } }])']
    };
  }
  if (/mongodb create|mongodb collection|mongodb insert/.test(t)) {
    return {
      title: 'Node.js MongoDB Collection & Insert',
      language: 'javascript',
      code: 'const { MongoClient } = require("mongodb");\nconst url = "mongodb://localhost:27017";\nconst client = new MongoClient(url);\n\nasync function run() {\n  const db = client.db("mydb");\n  const customers = db.collection("customers");\n  const doc = { name: "Company Inc", address: "Highway 37" };\n  console.log("Inserting document into MongoDB:", doc.name);\n}\nrun();',
      explanation: 'MongoDB stores data in JSON-like documents. In Node.js, we create a collection and use insertOne() or insertMany().\n\nExpected Output:\nInserting document into MongoDB: Company Inc',
      syntax: ['db.collection("name").insertOne(doc);']
    };
  }
  if (/mongodb find|mongodb query|mongodb/.test(t)) {
    return {
      title: 'Node.js MongoDB Find & Query',
      language: 'javascript',
      code: 'const { MongoClient } = require("mongodb");\nconst client = new MongoClient("mongodb://localhost:27017");\n\nasync function queryDb() {\n  const db = client.db("mydb");\n  const query = { address: /^S/ }; // Address starts with "S"\n  console.log("Querying MongoDB collection with pattern:", query.address);\n}\nqueryDb();',
      explanation: 'In MongoDB, we use the find() and findOne() methods to find data in a collection.\n\nExpected Output:\nQuerying MongoDB collection with pattern: /^S/',
      syntax: ['db.collection("customers").find(query).toArray();']
    };
  }
  if (/socket\.io|websocket/.test(t)) {
    return {
      title: 'Node.js Socket.IO Real-time Communication',
      language: 'javascript',
      code: 'const http = require("http");\nconst { Server } = require("socket.io");\n\nconst server = http.createServer();\nconst io = new Server(server);\n\nio.on("connection", (socket) => {\n  console.log("Client connected:", socket.id);\n  socket.on("chat message", (msg) => {\n    io.emit("chat message", msg);\n  });\n});\n\nconsole.log("Socket.IO server attached to HTTP listener.");',
      explanation: 'Socket.IO enables real-time, bidirectional and event-based communication between the browser and the server.\n\nExpected Output:\nSocket.IO server attached to HTTP listener.',
      syntax: ['io.on("connection", (socket) => { ... });']
    };
  }
  if (/child process/.test(t)) {
    return {
      title: 'Node.js Child Process (exec & spawn)',
      language: 'javascript',
      code: 'const { exec } = require("child_process");\n\nexec("node -v", (err, stdout, stderr) => {\n  if (err) return console.error(err);\n  console.log("Node version from child process:", stdout.trim());\n});',
      explanation: 'The child_process module provides the ability to spawn subprocesses to run system commands or scripts.\n\nExpected Output:\nNode version from child process: (node version string)',
      syntax: ['const { exec } = require("child_process");', 'exec(command, callback);']
    };
  }
  if (/cluster|worker thread/.test(t)) {
    return {
      title: 'Node.js Cluster and Multiprocessing',
      language: 'javascript',
      code: 'const cluster = require("cluster");\nconst os = require("os");\n\nif (cluster.isPrimary) {\n  const numCPUs = os.cpus().length;\n  console.log(`Primary \${process.pid} is running. Forking \${numCPUs} workers.`);\n} else {\n  console.log(`Worker \${process.pid} started.`);\n}',
      explanation: 'A single instance of Node.js runs in a single thread. The cluster module allows easy creation of child processes that all share server ports.\n\nExpected Output:\nPrimary (PID) is running. Forking (CPU count) workers.',
      syntax: ['if (cluster.isPrimary) { cluster.fork(); }']
    };
  }
  if (/environment variable|process/.test(t)) {
    return {
      title: 'Node.js Environment Variables (process.env)',
      language: 'javascript',
      code: 'const PORT = process.env.PORT || 3000;\nconst NODE_ENV = process.env.NODE_ENV || "development";\n\nconsole.log("Environment:", NODE_ENV);\nconsole.log("Active Port:", PORT);',
      explanation: 'Environment variables are global variables set in the host environment, accessible via process.env.\n\nExpected Output:\nEnvironment: development\nActive Port: 3000',
      syntax: ['process.env.VARIABLE_NAME']
    };
  }
  if (/syllabus|study plan|practice|exercise|quiz|examples|reference|frameworks|frontend/.test(t)) {
    return {
      title: 'Node.js Backend Architecture Example',
      language: 'javascript',
      code: 'const http = require("http");\n\nconst server = http.createServer((req, res) => {\n  if (req.url === "/api/health") {\n    res.writeHead(200, { "Content-Type": "application/json" });\n    res.end(JSON.stringify({ status: "healthy", timestamp: Date.now() }));\n  } else {\n    res.writeHead(404);\n    res.end("Endpoint not found");\n  }\n});\n\nconsole.log("Production healthcheck service initialized.");',
      explanation: 'Real-world Node.js servers structure routing, middleware, controllers, and database services cleanly.\n\nExpected Output:\nProduction healthcheck service initialized.',
      syntax: ['http.createServer(handler)']
    };
  }

  return {
    title: 'Node.js Server Execution',
    language: 'javascript',
    code: 'const os = require("os");\nconsole.log("Node.js runtime active on platform:", os.platform());',
    explanation: 'Basic Node.js script execution showing module loading and process information.\n\nExpected Output:\nNode.js runtime active on platform: (active platform)',
    syntax: ['console.log(value);']
  };
}
