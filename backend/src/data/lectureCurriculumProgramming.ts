import { SOURCE, type DomainSpec, type LessonSpec, type LessonSourceSpec } from './lectureCurriculumTypes.js';

const review = 'review_required' as const;

function lesson(
  spec: Omit<LessonSpec, 'status' | 'sources'> & { sources: LessonSourceSpec[] },
): LessonSpec {
  return { ...spec, status: review };
}

export const programmingDomain: DomainSpec = {
  id: 'programming',
  name: 'Programming',
  description: 'Language syntax, libraries, and pattern languages extracted from Cheatography HTML references.',
  sortOrder: 1,
  subjects: [
    {
      id: 'python',
      domainId: 'programming',
      name: 'Python',
      description: 'Core Python names and methods from DaveChild’s Python reference. Language version is not specified on the source.',
      sortOrder: 1,
      modules: [
        {
          id: 'python-fundamentals',
          subjectId: 'python',
          name: 'Fundamentals',
          description: 'Sequences, strings, and files.',
          sortOrder: 1,
          lessons: [
            lesson({
              id: 'python-indexes-slices',
              moduleId: 'python-fundamentals',
              title: 'Indexes and slices',
              overview: 'Python sequences are addressed with zero-based indexes and slice notation. DaveChild’s sheet demonstrates this on a six-element sequence named a.',
              difficulty: 'Beginner',
              technologyVersion: 'Python — version not specified by the source (sheet updated 21 Nov 2022)',
              sortOrder: 1,
              learningObjectives: [
                'Explain zero-based and negative indexing.',
                'Read slice results for start, stop, and step.',
                'Describe a[:] as a shallow copy.',
              ],
              content: {
                explanation:
                  'On the source sheet, len(a) is 6. a[0] is the first item (0) and a[5] is the last (5). Negative indexes count from the end: a[-1] is 5 and a[-2] is 4. Slices take the form a[start:stop] or a[start:stop:step], where stop is exclusive in the listed results.',
                keyConcepts: [
                  { title: 'Index', definition: 'A position in a sequence. 0 is the first item.', purpose: 'Read or replace a single element.' },
                  { title: 'Slice', definition: 'A subsequence taken with start, stop, and optional step.', purpose: 'Copy parts of a list or reverse it.' },
                  { title: 'Shallow copy', definition: 'b=a[:] is listed as a shallow copy of a.', purpose: 'Get a new list object with the same items.' },
                ],
                syntax: ['len(a)', 'a[i]', 'a[-i]', 'a[start:stop]', 'a[start:stop:step]', 'b = a[:]'],
                examples: [
                  {
                    title: 'Results listed for a six-item sequence',
                    code: 'len(a)      # 6\na[0]        # 0\na[5]        # 5\na[-1]       # 5\na[1:]       # [1, 2, 3, 4, 5]\na[:5]       # [0, 1, 2, 3, 4]\na[:-2]      # [0, 1, 2, 3]\na[1:3]      # [1, 2]\na[1:-1]     # [1, 2, 3, 4]\na[::-1]     # [5, 4, 3, 2, 1]\na[::-2]     # [5, 3, 1]\nb = a[:]    # shallow copy of a',
                    explanation: 'These outcomes are the table on DaveChild’s Python cheat sheet. A comment by Stan (7 Nov 2014) notes reversing a string the same way: \'hello world\'[::-1] yields \'dlrow olleh\'.',
                  },
                ],
                rules: ['Stop indexes in the listed slices do not include the stop position.', 'A step of -1 walks the sequence backwards.'],
                practicalApplications: ['Take a prefix or suffix of a list.', 'Reverse a sequence without calling reverse in place.', 'Copy a list before mutating it.'],
                commonMistakes: ['Treating a[:5] as including index 5 — the sheet’s result stops at 4.', 'Expecting a[:] to deep-copy nested objects; the source calls it a shallow copy.'],
                relatedConcepts: ['List methods', 'String methods', 'len()'],
              },
              revisionNotes: {
                keyTerms: ['index', 'slice', 'step', 'shallow copy'],
                remember: ['Indexes start at 0.', 'Negative indexes count from the end.', 'a[:] copies the list shallowly.'],
                importantSyntax: ['a[1:3]', 'a[::-1]', 'b = a[:]'],
                commonMistakes: ['Off-by-one on the stop index.'],
              },
              sources: [SOURCE.python],
            }),
            lesson({
              id: 'python-list-methods',
              moduleId: 'python-fundamentals',
              title: 'List methods',
              overview: 'DaveChild lists the mutating and query methods commonly used on lists. The sheet is a method index, not a full tutorial.',
              difficulty: 'Beginner',
              technologyVersion: 'Python — version not specified by the source',
              sortOrder: 2,
              learningObjectives: [
                'Name the list methods on the reference.',
                'Distinguish methods that add items from methods that remove them.',
                'State that reverse() and sort() are listed without arguments.',
              ],
              content: {
                explanation:
                  'The Python sheet’s “List Methods” table contains append(item), count(item), extend(list), index(item), insert(position, item), pop(position), remove(item), reverse(), and sort(). Comments on the page note that dictionary methods and comprehensions are missing; those topics are not invented here.',
                keyConcepts: [
                  { title: 'append', definition: 'append(item) adds one item to a list.', purpose: 'Grow a list one value at a time.' },
                  { title: 'extend', definition: 'extend(list) adds all items from another list.', purpose: 'Concatenate in place.' },
                  { title: 'insert', definition: 'insert(position, item) places an item at an index.', purpose: 'Insert rather than append.' },
                  { title: 'pop / remove', definition: 'pop(position) removes by index; remove(item) removes a value.', purpose: 'Delete items.' },
                  { title: 'count / index', definition: 'count(item) tallies occurrences; index(item) finds a position.', purpose: 'Search a list.' },
                ],
                syntax: [
                  'list.append(item)',
                  'list.extend(other)',
                  'list.insert(position, item)',
                  'list.pop(position)',
                  'list.remove(item)',
                  'list.count(item)',
                  'list.index(item)',
                  'list.reverse()',
                  'list.sort()',
                ],
                practicalApplications: ['Build a result list in a loop with append.', 'Merge two lists with extend.', 'Sort or reverse in place when the sheet’s no-argument forms are enough.'],
                commonMistakes: [
                  'Confusing pop(position) with remove(item).',
                  'Assuming sort() or reverse() return a new list — the sheet only lists the method names, not return values.',
                ],
                relatedConcepts: ['Indexes and slices', 'String methods'],
              },
              revisionNotes: {
                keyTerms: ['append', 'extend', 'insert', 'pop', 'remove', 'sort', 'reverse'],
                remember: ['append adds one item; extend adds many.', 'pop uses a position; remove uses a value.'],
                importantSyntax: ['insert(position, item)', 'pop(position)'],
                commonMistakes: ['Using remove when you have an index, or pop when you have a value.'],
              },
              sources: [SOURCE.python],
            }),
            lesson({
              id: 'python-string-methods',
              moduleId: 'python-fundamentals',
              title: 'String methods',
              overview: 'The Python sheet catalogs string methods, including locale-dependent ones marked with an asterisk for 8-bit strings.',
              difficulty: 'Beginner',
              technologyVersion: 'Python — version not specified; decode() appears, which is a Python 2-era API',
              sortOrder: 3,
              learningObjectives: [
                'Locate case, search, split, and strip methods on the reference.',
                'Explain the asterisk note about locale-dependent 8-bit strings.',
                'Treat decode() as source-listed, not as current Python 3 str API.',
              ],
              content: {
                explanation:
                  'Listed methods include capitalize, center(width), count(sub, start, end), decode, encode, endswith(sub), expandtabs, find/index variants, several is* tests, join, ljust/rjust, lower/upper/swapcase/title, partition/rpartition, replace(old, new), split/rsplit/splitlines, strip/lstrip/rstrip, startswith, translate(table), and zfill(width). Methods marked * are described as locale dependent for 8-bit strings.',
                keyConcepts: [
                  { title: 'Search', definition: 'find, index, rfind, rindex, startswith, endswith, count take substring arguments, often with start and end.', purpose: 'Locate text inside a string.' },
                  { title: 'Split and join', definition: 'split(sep), rsplit(sep), splitlines(), join().', purpose: 'Break and rebuild strings.' },
                  { title: 'Strip', definition: 'strip, lstrip, rstrip remove edges.', purpose: 'Clean whitespace.' },
                  { title: 'Case helpers', definition: 'lower, upper, title, capitalize, swapcase, and islower/isupper/istitle.', purpose: 'Normalize display or tests.' },
                ],
                syntax: ['s.find(sub, start, end)', 's.replace(old, new)', 's.split(sep)', 's.strip()', 'sep.join(parts)'],
                rules: ['Asterisk methods are locale dependent for 8-bit strings, per the sheet.', 'decode() is listed; Python 3 str objects do not use decode() the same way. The source does not state a language version.'],
                practicalApplications: ['Normalize user text with lower/strip.', 'Parse CSV-like lines with split.', 'Pad numbers with zfill(width) or ljust/rjust.'],
                commonMistakes: ['Calling decode() on a Python 3 str because the cheat sheet lists it.', 'Ignoring the locale note on isalnum/isalpha and similar starred methods.'],
                relatedConcepts: ['List methods', 'Regular expressions', 'Datetime formatting'],
                conflicts: [
                  {
                    topic: 'Python 2 vs 3 string APIs',
                    claims: [
                      { source: 'DaveChild Python Cheat Sheet', statement: 'Lists decode() among string methods and does not label a Python version.' },
                      { source: 'LectureToLife curator note', statement: 'No silent rewrite: treat decode() as source text, not as guaranteed Python 3 syntax.' },
                    ],
                  },
                ],
              },
              revisionNotes: {
                keyTerms: ['find', 'split', 'strip', 'join', 'replace', 'locale-dependent'],
                remember: ['Starred methods depend on locale for 8-bit strings.', 'decode() is on the sheet; version is unspecified.'],
                importantSyntax: ['count(sub, start, end)', 'replace(old, new)', 'zfill(width)'],
                commonMistakes: ['Using decode() as if every Python str supports it.'],
              },
              sources: [SOURCE.python],
            }),
            lesson({
              id: 'python-file-methods',
              moduleId: 'python-fundamentals',
              title: 'File methods',
              overview: 'The sheet lists methods on file objects: read/write, seek/tell, and lifecycle helpers such as close and flush.',
              difficulty: 'Beginner',
              technologyVersion: 'Python — version not specified; next() on files is a Python 2 iterator name',
              sortOrder: 4,
              learningObjectives: [
                'List read, write, and seek operations from the reference.',
                'Explain close, flush, and fileno at a high level.',
                'Note that next() is listed without Python 3 iterator context.',
              ],
              content: {
                explanation:
                  'File methods on the sheet: close(), flush(), fileno(), isatty(), next(), read(size), readline(size), readlines(size), seek(offset), tell(), truncate(size), write(string), writelines(list).',
                keyConcepts: [
                  { title: 'Read family', definition: 'read, readline, and readlines optionally take a size.', purpose: 'Load file contents.' },
                  { title: 'Write family', definition: 'write(string) and writelines(list).', purpose: 'Send text to a file.' },
                  { title: 'Position', definition: 'seek(offset) moves; tell() reports the position; truncate(size) shortens.', purpose: 'Random access and shrinking.' },
                ],
                syntax: ['f.read(size)', 'f.readline(size)', 'f.write(string)', 'f.seek(offset)', 'f.tell()', 'f.close()'],
                practicalApplications: ['Read a config file.', 'Append log lines with write.', 'Jump inside a file with seek.'],
                commonMistakes: ['Leaving files open — close() is listed for a reason.', 'Assuming next() is the Python 3 iterator protocol; the source only names the method.'],
                relatedConcepts: ['os variables', 'String methods'],
              },
              revisionNotes: {
                keyTerms: ['read', 'write', 'seek', 'tell', 'flush', 'close'],
                remember: ['readline vs readlines.', 'seek/tell control position.'],
                importantSyntax: ['read(size)', 'writelines(list)', 'truncate(size)'],
                commonMistakes: ['Forgetting close().'],
              },
              sources: [SOURCE.python],
            }),
          ],
        },
        {
          id: 'python-stdlib',
          subjectId: 'python',
          name: 'Standard library names',
          description: 'sys, os, and datetime identifiers from the same sheet.',
          sortOrder: 2,
          lessons: [
            lesson({
              id: 'python-sys-os',
              moduleId: 'python-stdlib',
              title: 'sys and os variables',
              overview: 'The sheet enumerates process and platform names on sys and path-related strings on os.',
              difficulty: 'Intermediate',
              technologyVersion: 'Python — version not specified; sys.checkinterval and OS names such as mac/os2/riscos appear',
              sortOrder: 1,
              learningObjectives: [
                'Use sys.argv as shown for a sample command line.',
                'Identify sys.path, platform, and stdin/stdout/stderr.',
                'Name os path separators and the listed registered OS names.',
              ],
              content: {
                explanation:
                  'sys entries include argv, builtin_module_names, byteorder, checkinterval, exec_prefix, executable, exitfunc, modules, path, platform, stdin/stdout/stderr, version_info, and winver. For `$ python foo.py bar -c qux --h`, the sheet maps sys.argv[0] to foo.py through argv[4] to --h. os entries include altsep, curdir, defpath, devnull, extsep, linesep, name, pardir, pathsep, and sep. Registered OS names listed: posix, nt, mac, os2, ce, java, riscos. A comment by Brian (7 Nov 2014) says pathsep is the search-path separator (colon on POSIX, semicolon on Windows), not a “patch” separator.',
                keyConcepts: [
                  { title: 'sys.argv', definition: 'Command-line arguments; index 0 is the script name in the example.', purpose: 'Read flags passed to a program.' },
                  { title: 'sys.path', definition: 'Search path for modules.', purpose: 'Understand where imports are found.' },
                  { title: 'os.sep / os.pathsep', definition: 'sep is the path separator; pathsep separates PATH components (clarified in comments).', purpose: 'Build portable paths.' },
                ],
                examples: [
                  {
                    title: 'sys.argv mapping from the sheet',
                    code: '# $ python foo.py bar -c qux --h\nsys.argv[0]  # foo.py\nsys.argv[1]  # bar\nsys.argv[2]  # -c\nsys.argv[3]  # qux\nsys.argv[4]  # --h',
                    explanation: 'Copied from the “Python sys.argv” table.',
                  },
                ],
                practicalApplications: ['Parse CLI arguments.', 'Print sys.platform when debugging.', 'Join paths with os.sep.'],
                commonMistakes: ['Using argv[0] as the first user argument — the example treats it as the script name.', 'Reading os.pathsep as a typo for path separator; Brian’s comment distinguishes it from os.sep.'],
                relatedConcepts: ['File methods', 'Linux command line'],
              },
              revisionNotes: {
                keyTerms: ['argv', 'sys.path', 'platform', 'os.sep', 'os.pathsep'],
                remember: ['argv[0] is the script in the example.', 'Registered OS names include historic values such as riscos.'],
                importantSyntax: ['sys.argv', 'os.sep', 'os.pathsep'],
                commonMistakes: ['Mixing sep and pathsep.'],
              },
              sources: [SOURCE.python],
            }),
            lesson({
              id: 'python-datetime',
              moduleId: 'python-stdlib',
              title: 'Datetime methods and strftime codes',
              overview: 'Construction helpers, time methods, and a table of % format codes including footnotes about week numbering and leap seconds.',
              difficulty: 'Intermediate',
              technologyVersion: 'Python — version not specified by the source',
              sortOrder: 2,
              learningObjectives: [
                'Name datetime constructors listed (today, now, utcnow, fromtimestamp, strptime).',
                'Apply common strftime codes such as %Y, %m, %d, %H, %M, %S.',
                'Repeat the sheet’s footnotes on week numbers and %S range.',
              ],
              content: {
                explanation:
                  'Datetime methods: today(), now(timezoneinfo), utcnow(), fromtimestamp(timestamp), utcfromtimestamp(timestamp), fromordinal(ordinal), combine(date, time), strptime(date, format). Time methods: replace(), isoformat(), __str__(), strftime(format), utcoffset(), dst(), tzname(). Format codes include %a/%A weekdays, %b/%B months, %d day, %H 24-hour, %I 12-hour, %p AM/PM, %M minute, %S second, %Y year, %Z timezone, %% literal percent. Footnotes: %U weeks start Sunday and pre-first-Sunday days are week 0; %w 0 is Sunday; %W weeks start Monday; %S range is 00 to 61 to allow leap and double-leap seconds — the sheet says this is not a mistake.',
                keyConcepts: [
                  { title: 'strftime / strptime', definition: 'strftime formats a time; strptime parses a date string with a format.', purpose: 'Convert between objects and strings.' },
                  { title: 'Week codes', definition: '%U Sunday-start weeks; %W Monday-start weeks; both can show week 0.', purpose: 'Avoid off-by-one week numbers.' },
                ],
                syntax: ['datetime.today()', 'datetime.now(timezoneinfo)', 'datetime.strptime(date, format)', 'time.strftime(format)', '%Y-%m-%d %H:%M:%S'],
                practicalApplications: ['Log timestamps.', 'Parse a date the user typed.', 'Display localized weekday names with %A.'],
                commonMistakes: ['Assuming %S only goes to 59; the sheet documents 00 to 61.', 'Mixing %U and %W week numbering.'],
                relatedConcepts: ['String methods', 'sys.version_info'],
              },
              revisionNotes: {
                keyTerms: ['strftime', 'strptime', '%Y', '%U', '%W', 'leap second'],
                remember: ['%S may be 00–61 on this sheet.', 'Week 0 exists before the first Sunday or Monday.'],
                importantSyntax: ['strptime(date, format)', '%Y', '%m', '%d'],
                commonMistakes: ['Wrong week-start code.'],
              },
              sources: [SOURCE.python],
            }),
          ],
        },
        {
          id: 'python-oop',
          subjectId: 'python',
          name: 'Object-oriented names',
          description: 'Special methods listed on the Python sheet.',
          sortOrder: 3,
          lessons: [
            lesson({
              id: 'python-special-methods',
              moduleId: 'python-oop',
              title: 'Class special methods',
              overview: 'Dunder names for construction, display, comparison, hashing, attributes, and calling instances.',
              difficulty: 'Intermediate',
              technologyVersion: 'Python — version not specified; __cmp__ and __nonzero__ are historical names',
              sortOrder: 1,
              learningObjectives: [
                'Map __init__, __str__, and __repr__ to construction and display.',
                'Recognize rich comparison names __lt__ through __ne__.',
                'Flag __cmp__ and __nonzero__ as listed without a Python 3 replacement note on the sheet.',
              ],
              content: {
                explanation:
                  'Listed: __new__(cls), __init__(self, args), __del__(self), __repr__(self), __str__(self), __cmp__(self, other), __index__(self), __hash__(self), __getattr__, __getattribute__, __setattr__(self, name, attr), __delattr__, __call__(self, args, kwargs), __lt__/__le__/__gt__/__ge__/__eq__/__ne__, __nonzero__(self). Page comments (Samantha Atkins, 30 May 2014) ask for with, comprehensions, generators, and decorators — those are not on the sheet.',
                keyConcepts: [
                  { title: '__init__ / __new__', definition: '__new__ creates; __init__ initializes.', purpose: 'Construct objects.' },
                  { title: '__str__ / __repr__', definition: 'User-facing vs developer-facing text.', purpose: 'Print and debug.' },
                  { title: 'Comparisons', definition: '__lt__, __le__, __gt__, __ge__, __eq__, __ne__, and also __cmp__ on the sheet.', purpose: 'Sort and equality tests.' },
                ],
                syntax: ['__init__(self, args)', '__str__(self)', '__repr__(self)', '__eq__(self, other)', '__call__(self, args, kwargs)'],
                practicalApplications: ['Custom print for a class.', 'Make an instance callable with __call__.', 'Control attribute access with __getattr__/__setattr__.'],
                commonMistakes: ['Implementing only __cmp__ on Python 3 because the sheet lists it.', 'Using __nonzero__ instead of checking the version-appropriate truthiness hook.'],
                relatedConcepts: ['List methods', 'Boolean expressions'],
                conflicts: [
                  {
                    topic: 'Comparison and truthiness dunders',
                    claims: [
                      { source: 'DaveChild Python Cheat Sheet', statement: 'Includes __cmp__ and __nonzero__ with no version label.' },
                      { source: 'LectureToLife curator note', statement: 'These names are historical; the sheet does not mention __bool__.' },
                    ],
                  },
                ],
              },
              revisionNotes: {
                keyTerms: ['__init__', '__str__', '__repr__', '__eq__', '__call__'],
                remember: ['__new__ vs __init__.', '__cmp__/__nonzero__ are on the sheet without a 3.x note.'],
                importantSyntax: ['__setattr__(self, name, attr)', '__call__(self, args, kwargs)'],
                commonMistakes: ['Copying __cmp__ into new Python 3 code without checking current docs.'],
              },
              sources: [SOURCE.python],
            }),
          ],
        },
      ],
    },
    {
      id: 'javascript',
      domainId: 'programming',
      name: 'JavaScript',
      description: 'Core objects, events, and regex-related string methods from DaveChild’s JavaScript sheet (updated 11 May 2016).',
      sortOrder: 2,
      modules: [
        {
          id: 'js-core',
          subjectId: 'javascript',
          name: 'Core objects',
          description: 'Arrays, strings, dates, and global functions.',
          sortOrder: 1,
          lessons: [
            lesson({
              id: 'js-arrays',
              moduleId: 'js-core',
              title: 'Array methods',
              overview: 'Mutating and converting methods listed for JavaScript arrays.',
              difficulty: 'Beginner',
              technologyVersion: 'JavaScript — version not specified (sheet updated 11 May 2016); toSource() is non-standard',
              sortOrder: 1,
              learningObjectives: [
                'Name push, pop, shift, unshift, splice, and slice.',
                'Contrast slice (listed) with splice.',
                'Note toSource() as a sheet entry, not a portable standard.',
              ],
              content: {
                explanation:
                  'Array methods on the sheet: concat(), join(), length, pop(), push(), reverse(), shift(), slice(), sort(), splice(), toSource(), toString(), unshift(), valueOf(). map/filter/reduce are not listed.',
                keyConcepts: [
                  { title: 'Stack/queue ends', definition: 'push/pop at the end; unshift/shift at the front.', purpose: 'Add or remove items.' },
                  { title: 'slice vs splice', definition: 'Both names appear; the sheet does not explain the difference.', purpose: 'Copy versus change in place — confirm in a language manual when implementing.' },
                ],
                syntax: ['arr.push(item)', 'arr.pop()', 'arr.shift()', 'arr.unshift(item)', 'arr.slice()', 'arr.splice()', 'arr.concat(other)', 'arr.join(sep)'],
                practicalApplications: ['Build a list of results.', 'Serialize with join or toString.', 'Sort in place with sort().'],
                commonMistakes: ['Assuming modern iteration helpers are on this reference — they are not.', 'Relying on toSource() outside engines that implement it.'],
                relatedConcepts: ['JavaScript strings', 'JavaScript dates'],
              },
              revisionNotes: {
                keyTerms: ['push', 'pop', 'shift', 'unshift', 'slice', 'splice'],
                remember: ['length is listed as an array property/method row.', 'toSource() is on the sheet.'],
                importantSyntax: ['concat()', 'join()', 'sort()'],
                commonMistakes: ['Expecting map/filter here.'],
              },
              sources: [SOURCE.javascript],
            }),
            lesson({
              id: 'js-strings',
              moduleId: 'js-core',
              title: 'String methods and regex hooks',
              overview: 'String API plus methods marked x that support regular expressions: split, match, replace, search.',
              difficulty: 'Beginner',
              technologyVersion: 'JavaScript — version not specified',
              sortOrder: 2,
              learningObjectives: [
                'Use indexOf, slice, substring/substr, and case converters.',
                'Identify which string methods the sheet marks as regex-capable.',
                'Connect those methods to the regex lesson.',
              ],
              content: {
                explanation:
                  'Methods: charAt, charCodeAt, concat, fromCharCode, indexOf, lastIndexOf, length, localeCompare, match (x), replace (x), search (x), slice, split (x), substr, substring, toLowerCase, toUpperCase, locale case variants, toSource, valueOf. The sheet says methods marked x support regular expressions.',
                keyConcepts: [
                  { title: 'Position', definition: 'indexOf and lastIndexOf find substrings; charAt reads one character.', purpose: 'Search and extract.' },
                  { title: 'Regex-aware', definition: 'match, replace, search, and split are flagged with x.', purpose: 'Pattern matching on strings.' },
                ],
                syntax: ['s.indexOf(sub)', 's.slice()', 's.split()', 's.match()', 's.replace()', 's.search()'],
                practicalApplications: ['Validate a pattern with search/match.', 'Replace using a regex.', 'Split on a delimiter that may be a regex.'],
                commonMistakes: ['Using substr and substring interchangeably without checking current docs — both are listed, not compared.', 'Forgetting that only x-marked methods are called out as regex-capable on this sheet.'],
                relatedConcepts: ['Regular expressions', 'JavaScript RegExp object'],
              },
              revisionNotes: {
                keyTerms: ['indexOf', 'slice', 'split', 'match', 'replace', 'search'],
                remember: ['x means regex support on this sheet.'],
                importantSyntax: ['charAt()', 'charCodeAt()', 'fromCharCode()'],
                commonMistakes: ['Ignoring the x flag.'],
              },
              sources: [SOURCE.javascript],
            }),
            lesson({
              id: 'js-dates',
              moduleId: 'js-core',
              title: 'Date getters and setters',
              overview: 'Local and UTC date methods. A 2016 comment records missing Date.now() and incomplete parentheses on some names.',
              difficulty: 'Intermediate',
              technologyVersion: 'JavaScript — version not specified; getYear is listed',
              sortOrder: 3,
              learningObjectives: [
                'Distinguish getFullYear from getYear as both appearing on the sheet.',
                'Use UTC getters/setters listed alongside local ones.',
                'Record the comment that Date.now() is absent.',
              ],
              content: {
                explanation:
                  'The date table includes Date(), getDate/getDay/getMonth/getFullYear/getYear, time component getters, getTimezoneOffset, a full UTC get/set family, parse(), UTC(), setDate and other setters, toGMTString, toUTCString, toLocaleString, toString, toSource, valueOf. Michael Pohoreski (16 Sep 2016) comments that dates are not alphabetized, some functions miss parentheses, and Date.now() is missing.',
                keyConcepts: [
                  { title: 'Local vs UTC', definition: 'Parallel getUTC* and setUTC* names.', purpose: 'Avoid timezone confusion.' },
                  { title: 'getYear vs getFullYear', definition: 'Both are listed; the sheet does not explain the two-digit vs four-digit distinction.', purpose: 'Prefer checking current language docs before using getYear.' },
                ],
                practicalApplications: ['Format a timestamp with toLocaleString.', 'Adjust hours with setHours/setUTCHours.', 'Parse a date string with parse().'],
                commonMistakes: ['Using getYear because it is on the sheet without reading current Date behaviour.', 'Assuming Date.now() is documented here — a comment says it is missing.'],
                relatedConcepts: ['JavaScript numbers and Math', 'Python datetime'],
                conflicts: [
                  {
                    topic: 'Date.now() and getYear',
                    claims: [
                      { source: 'DaveChild JavaScript Cheat Sheet', statement: 'Lists getYear and omits Date.now().' },
                      { source: 'Michael Pohoreski comment, 16 Sep 2016', statement: 'Missing Date.now(); some date functions missing parentheses; ordering issues.' },
                    ],
                  },
                ],
              },
              revisionNotes: {
                keyTerms: ['getFullYear', 'getYear', 'getUTCDate', 'toUTCString', 'parse'],
                remember: ['UTC variants exist for most getters/setters.', 'Date.now() is not on the sheet.'],
                importantSyntax: ['getTimezoneOffset()', 'toGMTString()', 'UTC()'],
                commonMistakes: ['Treating getYear as the full-year API.'],
              },
              sources: [SOURCE.javascript],
            }),
            lesson({
              id: 'js-global-functions',
              moduleId: 'js-core',
              title: 'Global functions',
              overview: 'URI encoding, number parsing, eval, and legacy escape/unescape.',
              difficulty: 'Beginner',
              technologyVersion: 'JavaScript — version not specified; escape/unescape are listed',
              sortOrder: 4,
              learningObjectives: [
                'Choose encodeURI vs encodeURIComponent from the names listed.',
                'Parse numbers with parseInt and parseFloat.',
                'Treat escape/unescape as source-listed legacy names.',
              ],
              content: {
                explanation:
                  'Functions: decodeURI, decodeURIComponent, encodeURI, encodeURIComponent, escape, eval, isFinite, isNaN, Number, parseFloat, parseInt, String, unescape. Comments ask where alert() and prompt() are — they are not on this list. typeof is also requested in comments and is not listed (comment writes typof()).',
                keyConcepts: [
                  { title: 'URI codecs', definition: 'encodeURI/decodeURI vs encodeURIComponent/decodeURIComponent.', purpose: 'Safe URLs vs component encoding.' },
                  { title: 'Parsing', definition: 'parseInt, parseFloat, Number, isNaN, isFinite.', purpose: 'Turn text into numbers and test them.' },
                ],
                syntax: ['parseInt(text)', 'parseFloat(text)', 'isNaN(value)', 'encodeURIComponent(text)', 'eval(code)'],
                practicalApplications: ['Read a numeric form field.', 'Build query strings.', 'Detect NaN results.'],
                commonMistakes: ['Using escape/unescape in new code because they appear here.', 'Relying on eval() from the list without considering safety — the sheet does not discuss risk.'],
                relatedConcepts: ['JavaScript strings', 'HTTP and APIs'],
              },
              revisionNotes: {
                keyTerms: ['parseInt', 'encodeURIComponent', 'isNaN', 'eval', 'escape'],
                remember: ['alert/prompt/typeof are not on the sheet.', 'escape and unescape are listed.'],
                importantSyntax: ['decodeURIComponent()', 'isFinite()'],
                commonMistakes: ['Calling escape instead of encodeURIComponent.'],
              },
              sources: [SOURCE.javascript],
            }),
            lesson({
              id: 'js-events',
              moduleId: 'js-core',
              title: 'Event handler names',
              overview: 'DOM-style on* handler names. A comment says they should be all lowercase.',
              difficulty: 'Beginner',
              technologyVersion: 'JavaScript — version not specified (includes ondragdrop)',
              sortOrder: 5,
              learningObjectives: [
                'Recognize common on* names for click, keyboard, and form events.',
                'Note ondragdrop and onmove as listed.',
                'Record Dave Lampton’s comment that handlers should be all lowercase.',
              ],
              content: {
                explanation:
                  'Handlers: onabort, onblur, onchange, onclick, ondblclick, ondragdrop, onerror, onfocus, onkeydown, onkeypress, onkeyup, onload, onmousedown, onmousemove, onmouseout, onmouseover, onmouseup, onmove, onreset, onresize, onselect, onsubmit, onunload. Dave Lampton (26 Mar 2013) comments that event handlers should be all lowercase.',
                keyConcepts: [
                  { title: 'Handler name', definition: 'An on* identifier associated with a user or document event.', purpose: 'Wire UI behaviour in older DOM style.' },
                ],
                practicalApplications: ['onclick for buttons.', 'onsubmit for forms.', 'onload for page start.'],
                commonMistakes: ['Mixing camelCase with the sheet’s mostly lowercase names.', 'Assuming addEventListener is documented here — it is not.'],
                relatedConcepts: ['HTML forms', 'JavaScript functions'],
              },
              revisionNotes: {
                keyTerms: ['onclick', 'onchange', 'onsubmit', 'onload', 'onkeydown'],
                remember: ['Comment: keep handler names lowercase.', 'addEventListener is not on this sheet.'],
                importantSyntax: ['onmouseover', 'onmouseout', 'onunload'],
                commonMistakes: ['Looking for modern event APIs on this reference.'],
              },
              sources: [SOURCE.javascript],
            }),
          ],
        },
      ],
    },
    {
      id: 'regex',
      domainId: 'programming',
      name: 'Regular expressions',
      description: 'DaveChild’s regex reference plus JavaScript regex overlap. Flavor is not named on the sheet.',
      sortOrder: 3,
      modules: [
        {
          id: 'regex-core',
          subjectId: 'regex',
          name: 'Pattern language',
          description: 'Anchors, classes, quantifiers, groups.',
          sortOrder: 1,
          lessons: [
            lesson({
              id: 'regex-anchors-classes',
              moduleId: 'regex-core',
              title: 'Anchors and character classes',
              overview: 'Where a match can sit in a string, and shorthand classes for digits, words, and space.',
              difficulty: 'Beginner',
              technologyVersion: 'Regex flavor not specified by the source',
              sortOrder: 1,
              learningObjectives: [
                'Define ^, $, \\A, \\Z, and word boundaries.',
                'Use \\d, \\w, \\s and their uppercase negations.',
                'State that POSIX classes such as [:digit:] appear on the sheet.',
              ],
              content: {
                explanation:
                  'Anchors: ^ start of string or start of line in a multi-line pattern; \\A start of string; $ end of string or end of line in multi-line; \\Z end of string; \\b word boundary; \\B not word boundary; \\< start of word; \\> end of word. Character classes: \\c control, \\s/\\S space, \\d/\\D digit, \\w/\\W word, \\x hexadecimal digit, \\O octal digit. POSIX: [:upper:], [:lower:], [:alpha:], [:alnum:], [:digit:], [:xdigit:], [:punct:], [:blank:], [:space:], [:cntrl:], [:graph:], [:print:], [:word:]. An early comment mixed up ^ and $; DaveChild clarified that ^ is start and $ is end.',
                keyConcepts: [
                  { title: 'Anchor', definition: 'A zero-width assertion about position.', purpose: 'Match at start, end, or word edges.' },
                  { title: 'Shorthand class', definition: '\\d, \\w, \\s and negations.', purpose: 'Avoid long character ranges.' },
                ],
                syntax: ['^', '$', '\\b', '\\d', '\\w', '\\s', '[[:digit:]]'],
                practicalApplications: ['Match a whole line with ^ and $.', 'Find integers with \\d.', 'Skip spaces with \\s.'],
                commonMistakes: ['Reversing ^ and $ — a commenter did this; the author kept start vs end as listed.', 'Assuming every engine implements \\< and POSIX classes — the sheet does not name engines here.'],
                relatedConcepts: ['Quantifiers and groups', 'JavaScript strings'],
              },
              revisionNotes: {
                keyTerms: ['anchor', 'word boundary', '\\d', '\\w', '\\s', 'POSIX class'],
                remember: ['^ start, $ end (including optional line mode).', '\\A/\\Z are string-only starts/ends on this sheet.'],
                importantSyntax: ['\\b', '\\D', '[:alnum:]'],
                commonMistakes: ['Confusing \\A with ^ in multi-line mode.'],
              },
              sources: [SOURCE.regex],
            }),
            lesson({
              id: 'regex-quantifiers-groups',
              moduleId: 'regex-core',
              title: 'Quantifiers, groups, and assertions',
              overview: 'How many times something matches, capturing vs non-capturing groups, and lookahead/lookbehind tokens as printed.',
              difficulty: 'Intermediate',
              technologyVersion: 'Regex flavor not specified by the source',
              sortOrder: 2,
              learningObjectives: [
                'Use *, +, ?, {n}, {n,}, {n,m}.',
                'Write capturing (...), non-capturing (?:...), and ranges [abc]/[^abc].',
                'Repeat assertion tokens as the sheet prints them, including unclear cells.',
              ],
              content: {
                explanation:
                  'Quantifiers: * 0 or more, + 1 or more, ? 0 or 1, {3} exactly 3, {3,} 3 or more, {3,5} 3, 4 or 5. Groups and ranges: . any character except newline (\\n); (a|b) a or b; (...) group; (?:...) passive non-capturing group; [abc] a or b or c; [^abc] not those; [a-q]/[A-Q]/[0-7] inclusive ranges; \\x group/subpattern number x. Assertions table: ?= lookahead; ?! negative lookahead; ?<= lookbehind; a cell printed as “?!= or ?” for once-only subexpression; ?() condition if-then; ?()| if-then-else; ?# comment. Escape: \\ , \\Q begin literal, \\E end literal. Modifiers: g global; i, m, s, x, e, U marked * on the sheet. Replacement: $n nth non-passive group, $`, $\', $+, $&.',
                keyConcepts: [
                  { title: 'Quantifier', definition: 'A suffix that repeats the previous atom.', purpose: 'Match optional or repeated text.' },
                  { title: 'Capturing group', definition: '(...) records text; (?:...) does not.', purpose: 'Extract or isolate alternatives.' },
                  { title: 'Lookahead', definition: '?= and ?! as listed.', purpose: 'Test what follows without consuming it — engines vary.' },
                ],
                syntax: ['a*', 'a+', 'a?', 'a{3,5}', '(abc)', '(?:abc)', '[0-7]', '[^abc]', '\\Q...\\E'],
                rules: ['Ranges are inclusive.', 'The escape character is usually \\.', 'Pattern modifiers marked * are listed without saying which languages accept each flag.'],
                practicalApplications: ['Repeat digits with \\d+.', 'Optional prefix with ?.', 'Extract a group for $1 replacements where supported.'],
                commonMistakes: ['Treating . as matching newline; the sheet says except newline.', 'Trusting HTML-garbled assertion cells (?!=) without checking an engine manual.'],
                relatedConcepts: ['Anchors and character classes', 'JavaScript RegExp object'],
              },
              revisionNotes: {
                keyTerms: ['quantifier', 'capturing group', 'lookahead', '\\Q', '$n'],
                remember: ['{3,5} is 3 to 5.', '(?:...) is non-capturing.', 'Ranges include both ends.'],
                importantSyntax: ['(a|b)', '[a-q]', 'a{3,}'],
                commonMistakes: ['Using . to span lines without a modifier the engine supports.'],
              },
              sources: [SOURCE.regex, SOURCE.javascript],
            }),
            lesson({
              id: 'regex-flavor-conflicts',
              moduleId: 'regex-core',
              title: 'Flavor disagreements on the source page',
              overview: 'Comments on the regex sheet disagree about whether regex is language-neutral and which flavor the sheet describes.',
              difficulty: 'Advanced',
              technologyVersion: 'Not specified — this lesson records the disagreement',
              sortOrder: 3,
              learningObjectives: [
                'Explain that the sheet does not label BRE, ERE, or PCRE.',
                'Quote the conflicting comments rather than picking a winner.',
                'Use the JavaScript sheet’s regex table as a second, still unlabeled, view.',
              ],
              content: {
                explanation:
                  'David asked which language/flavor the sheet covers. Chris (7 Jun 2012) said regex is programming-language neutral except for escaping. BillSmith (30 Jan 2018) quoted regular-expressions.info listing distinct flavors (.NET, Java, JavaScript, Perl, PCRE, Python, Ruby). Travis (4 Oct 2012) said the sheet is pretty neutral and that PCRE is the most common flavor, with JavaScript close but less complete, and POSIX classes maybe unsupported in PHP. Roedy Green and hatelove asked for the dialect at the top. The JavaScript sheet repeats many of the same tokens and adds a{,6} “up to 6 of a”, POSIX [:punct:]/[:space:]/[:blank:], and a RegExp object with compile(), exec(), test(), flags, and lastIndex. Those two sheets are not fully aligned.',
                keyConcepts: [
                  { title: 'Flavor', definition: 'A regex engine’s dialect (PCRE, JS, POSIX, …).', purpose: 'Know why the same pattern can fail in another language.' },
                ],
                practicalApplications: ['Before trusting advanced tokens (lookbehind, POSIX classes, \\<), check the engine you actually use.', 'Prefer the JavaScript regex table when the host language is JS.'],
                commonMistakes: ['Declaring the DaveChild sheet to be “the” regex standard.', 'Copying POSIX [:digit:] into JavaScript because it appears on both sheets without a JS support note.'],
                relatedConcepts: ['Anchors and character classes', 'JavaScript strings'],
                conflicts: [
                  {
                    topic: 'Is regex language-neutral?',
                    claims: [
                      { source: 'Chris comment on DaveChild regex sheet, 7 Jun 2012', statement: 'Regex is language-neutral; watch escaping in the host language.' },
                      { source: 'BillSmith comment, 30 Jan 2018, citing regular-expressions.info', statement: 'Multiple named flavors and languages exist and are not identical.' },
                    ],
                  },
                  {
                    topic: 'What flavor is the sheet?',
                    claims: [
                      { source: 'DaveChild Regular Expressions Cheat Sheet', statement: 'Does not name a flavor in the extracted HTML.' },
                      { source: 'Travis comment, 4 Oct 2012', statement: 'Pretty neutral; most common flavor is PCRE; JS is close; POSIX classes maybe not in PHP.' },
                      { source: 'hatelove comment, 6 Jan 2017', statement: 'Asks whether the syntax is BRE, ERE, or PCRE.' },
                    ],
                  },
                  {
                    topic: 'Quantifier a{,6}',
                    claims: [
                      { source: 'DaveChild JavaScript Cheat Sheet', statement: 'Lists a{,6} as up to 6 of a.' },
                      { source: 'DaveChild Regular Expressions Cheat Sheet', statement: 'Lists {3}, {3,}, {3,5} but not {,6} in the extracted quantifier table.' },
                    ],
                  },
                ],
              },
              revisionNotes: {
                keyTerms: ['flavor', 'PCRE', 'POSIX', 'JavaScript RegExp'],
                remember: ['The primary sheet does not name a dialect.', 'Comments disagree; LectureToLife does not pick one.'],
                commonMistakes: ['Porting lookbehind or POSIX classes without checking the engine.'],
              },
              sources: [SOURCE.regex, SOURCE.javascript],
            }),
          ],
        },
      ],
    },
  ],
};
