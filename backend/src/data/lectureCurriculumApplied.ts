import { SOURCE, type DomainSpec, type LessonSpec, type LessonSourceSpec } from './lectureCurriculumTypes.js';

const review = 'review_required' as const;

function lesson(
  spec: Omit<LessonSpec, 'status' | 'sources'> & { sources: LessonSourceSpec[] },
): LessonSpec {
  return { ...spec, status: review };
}

export const softwareDomain: DomainSpec = {
  id: 'software-development',
  name: 'Software Development',
  description: 'Version control workflows synthesized from Cheatography Git HTML (including draft sheets).',
  sortOrder: 2,
  subjects: [
    {
      id: 'git',
      domainId: 'software-development',
      name: 'Git',
      description: 'Command lists from mitcht’s Unix/git/SQL draft and DaveChild’s unfinished Git draft (stash / assume-unchanged only).',
      sortOrder: 1,
      modules: [
        {
          id: 'git-basics',
          subjectId: 'git',
          name: 'Repository basics',
          description: 'Create, inspect, stage, and commit.',
          sortOrder: 1,
          lessons: [
            lesson({
              id: 'git-repository-basics',
              moduleId: 'git-basics',
              title: 'Create, status, stage, and commit',
              overview: 'mitcht’s draft lists the everyday Git commands for starting a repo and recording snapshots. The sheet is marked DRAFT and unfinished.',
              difficulty: 'Beginner',
              technologyVersion: 'Git — version not specified; source marked DRAFT',
              sortOrder: 1,
              learningObjectives: [
                'Initialize or clone a repository.',
                'Inspect status and diffs.',
                'Stage, unstage, commit, and remove files as listed.',
              ],
              content: {
                explanation:
                  'Listed commands: git init; git clone [url]; git status; git add [file]; git reset [file]; git diff; git diff --staged; git commit -m "message"; git rm [file].',
                keyConcepts: [
                  { title: 'Repository', definition: 'Created with git init or copied with git clone [url].', purpose: 'Hold history locally.' },
                  { title: 'Staging', definition: 'git add [file] stages; git reset [file] unstages on this list.', purpose: 'Choose what the next commit contains.' },
                  { title: 'Diff', definition: 'git diff vs git diff --staged.', purpose: 'See unstaged vs staged changes.' },
                ],
                commands: [
                  { command: 'git init', meaning: 'Start a repository.' },
                  { command: 'git clone [url]', meaning: 'Copy a remote repository.' },
                  { command: 'git status', meaning: 'Show working tree status.' },
                  { command: 'git add [file]', meaning: 'Stage a file.' },
                  { command: 'git reset [file]', meaning: 'Unstage a file (as listed).' },
                  { command: 'git diff', meaning: 'Show unstaged differences.' },
                  { command: 'git diff --staged', meaning: 'Show staged differences.' },
                  { command: 'git commit -m "message"', meaning: 'Record a snapshot with a message.' },
                  { command: 'git rm [file]', meaning: 'Remove a tracked file.' },
                ],
                practicalApplications: ['Start a project with init or clone.', 'Review changes before commit.', 'Keep commits labeled with -m.'],
                commonMistakes: ['Treating this draft as a complete Git manual — merge, remotes, and reset --hard appear in other sections of the same list.', 'Using git reset [file] as a synonym for discarding all work; the sheet only lists it beside add.'],
                relatedConcepts: ['Branching and remotes', 'Stash and assume-unchanged'],
              },
              revisionNotes: {
                keyTerms: ['init', 'clone', 'status', 'add', 'commit', 'diff'],
                remember: ['add stages; commit records.', 'diff vs diff --staged.'],
                importantSyntax: ['git commit -m "message"', 'git clone [url]'],
                commonMistakes: ['Committing without status/diff.'],
              },
              sources: [SOURCE.gitUnixSql],
            }),
            lesson({
              id: 'git-branching-remotes',
              moduleId: 'git-basics',
              title: 'Branches, merge, and remotes',
              overview: 'The same draft list continues into branch names, merge, fetch/push/pull, and a hard reset.',
              difficulty: 'Intermediate',
              technologyVersion: 'Git — version not specified; source marked DRAFT; git checkout is listed with no arguments',
              sortOrder: 2,
              learningObjectives: [
                'Create and list branches.',
                'Describe fetch, merge of alias/branch, push, and pull as listed.',
                'Treat git reset --hard as a listed command that discards work — the sheet does not add a warning.',
              ],
              content: {
                explanation:
                  'Commands: git branch; git branch [branch name]; git checkout; git merge [branch]; git log [branchB..branchA]; git remote add [alias] [url]; git fetch [alias]; git merge [alias]/[branch]; git push [alias] [branch]; git pull; git reset --hard. git checkout is printed without a branch operand.',
                keyConcepts: [
                  { title: 'Branch', definition: 'git branch lists; git branch [name] creates (as listed).', purpose: 'Isolate work.' },
                  { title: 'Remote', definition: 'git remote add [alias] [url] then fetch/push/pull.', purpose: 'Collaborate.' },
                  { title: 'Merge', definition: 'git merge [branch] locally; git merge [alias]/[branch] after fetch.', purpose: 'Combine histories.' },
                ],
                commands: [
                  { command: 'git branch', meaning: 'List branches.' },
                  { command: 'git branch [branch name]', meaning: 'Create a branch name.' },
                  { command: 'git checkout', meaning: 'Listed with no extra arguments on the draft sheet.' },
                  { command: 'git merge [branch]', meaning: 'Merge a branch.' },
                  { command: 'git log [branchB..branchA]', meaning: 'Log commits reachable as written.' },
                  { command: 'git remote add [alias] [url]', meaning: 'Register a remote.' },
                  { command: 'git fetch [alias]', meaning: 'Download remote refs.' },
                  { command: 'git merge [alias]/[branch]', meaning: 'Merge a fetched remote branch.' },
                  { command: 'git push [alias] [branch]', meaning: 'Upload a branch.' },
                  { command: 'git pull', meaning: 'Listed without extra operands.' },
                  { command: 'git reset --hard', meaning: 'Listed with no extra explanation.' },
                ],
                practicalApplications: ['Feature branches.', 'Push to origin.', 'Integrate fetched work with merge.'],
                commonMistakes: ['Running reset --hard from the list without understanding it discards uncommitted changes — the draft does not say so.', 'Expecting git checkout <branch> because the sheet omits the operand.'],
                relatedConcepts: ['Create, status, stage, and commit'],
              },
              revisionNotes: {
                keyTerms: ['branch', 'merge', 'remote', 'fetch', 'push', 'pull'],
                remember: ['remote add then fetch/push.', 'reset --hard is listed without a safety note.'],
                importantSyntax: ['git remote add [alias] [url]', 'git merge [alias]/[branch]'],
                commonMistakes: ['Hard reset as everyday undo.'],
              },
              sources: [SOURCE.gitUnixSql],
            }),
          ],
        },
        {
          id: 'git-advanced',
          subjectId: 'git',
          name: 'Stash and skip-worktree style ignore',
          description: 'Only the coherent sections of DaveChild’s Git DRAFT were imported. A junk “teety” table was skipped.',
          sortOrder: 2,
          lessons: [
            lesson({
              id: 'git-stash-assume-unchanged',
              moduleId: 'git-advanced',
              title: 'Stash and assume-unchanged',
              overview: 'DaveChild’s Git sheet is an unfinished draft. Usable sections cover ignoring local edits to a tracked file and the stash stack. A nonsensical “teety” table was not imported.',
              difficulty: 'Advanced',
              technologyVersion: 'Git — version not specified; source marked DRAFT and incomplete',
              sortOrder: 1,
              learningObjectives: [
                'Toggle assume-unchanged on a file.',
                'Stash, list, apply, drop, and pop.',
                'Know this sheet is unfinished.',
              ],
              content: {
                explanation:
                  'Ignore local edits: git update-index --assume-unchanged <file>; undo with --no-assume-unchanged; git ls-files -v | grep \'^h\' to show ignored files (sheet wording: “Show ignored files”). Stash: git stash; git stash list; git stash apply; git stash apply stash@{2}; git stash drop; git stash drop stash@{2}; git stash pop (apply and drop in one step, can be used with a named stash).',
                keyConcepts: [
                  { title: 'assume-unchanged', definition: 'Tell the index to ignore local changes to a tracked file.', purpose: 'Keep a local tweak out of status (as listed).' },
                  { title: 'stash', definition: 'A stack of stored changes with apply/drop/pop.', purpose: 'Set work aside temporarily.' },
                ],
                commands: [
                  { command: 'git update-index --assume-unchanged <file>', meaning: 'Ignore changes to file.' },
                  { command: 'git update-index --no-assume-unchanged <file>', meaning: 'Stop ignoring changes.' },
                  { command: "git ls-files -v | grep '^h'", meaning: 'Show ignored files (sheet caption).' },
                  { command: 'git stash', meaning: 'Store changes.' },
                  { command: 'git stash list', meaning: 'Show stashed changes.' },
                  { command: 'git stash apply', meaning: 'Apply most recently stashed change.' },
                  { command: 'git stash apply stash@{2}', meaning: 'Apply named stash.' },
                  { command: 'git stash drop', meaning: 'Drop most recently stashed change.' },
                  { command: 'git stash pop', meaning: 'Apply and drop in one step.' },
                ],
                practicalApplications: ['Park in-progress work with stash.', 'Keep a local config file tracked but locally modified using assume-unchanged as listed.'],
                commonMistakes: ['Importing the draft “teety” table (tddrtd / dfgdfgdfg) — skipped as non-educational.', 'Confusing assume-unchanged with .gitignore; the sheet is about a versioned file.'],
                relatedConcepts: ['Create, status, stage, and commit'],
              },
              revisionNotes: {
                keyTerms: ['stash', 'stash@{n}', 'assume-unchanged', 'update-index'],
                remember: ['pop = apply + drop.', 'This Git sheet is a draft.'],
                importantSyntax: ['git stash apply stash@{2}', 'git update-index --assume-unchanged <file>'],
                commonMistakes: ['Using assume-unchanged instead of a clean ignore file when that is what you meant.'],
              },
              sources: [SOURCE.gitDave],
            }),
          ],
        },
      ],
    },
  ],
};

export const osDomain: DomainSpec = {
  id: 'operating-systems',
  name: 'Operating Systems',
  description: 'Linux and Bash references from DaveChild, with comment disagreements preserved.',
  sortOrder: 3,
  subjects: [
    {
      id: 'linux',
      domainId: 'operating-systems',
      name: 'Linux command line',
      description: 'Commands DaveChild uses most, with man-page links on the original page.',
      sortOrder: 1,
      modules: [
        {
          id: 'linux-files',
          subjectId: 'linux',
          name: 'Files and directories',
          description: 'Navigation, listing, and permissions.',
          sortOrder: 1,
          lessons: [
            lesson({
              id: 'linux-directories-listing',
              moduleId: 'linux-files',
              title: 'Directories and ls options',
              overview: 'Where you are, how you move, and how ls can sort and format listings.',
              difficulty: 'Beginner',
              technologyVersion: 'Linux/Bash — version not specified',
              sortOrder: 1,
              learningObjectives: [
                'Use pwd, mkdir, cd, and ls.',
                'Combine ls flags from the sheet.',
                'Note commenter-requested flags that are not on the table.',
              ],
              content: {
                explanation:
                  'Directory operations: pwd current directory; mkdir dir; cd dir; cd ..; ls. ls options: -a all including hidden; -R recursive; -r reverse order; -t sort by last modified; -S sort by file size; -l long listing; -1 one file per line; -m comma-separated; -Q quoted. Comments mention ls -h human-readable (Tanner, 7 Mar 2012; jt, 22 Jul 2015) and combinations such as -alhS or -ltr — those flags are not in the original table.',
                keyConcepts: [
                  { title: 'Working directory', definition: 'pwd shows it; cd changes it; cd .. goes up.', purpose: 'Know where commands run.' },
                  { title: 'ls flags', definition: 'Single-letter options that change which files appear and how.', purpose: 'Inspect files quickly.' },
                ],
                commands: [
                  { command: 'pwd', meaning: 'Show current directory.' },
                  { command: 'mkdir dir', meaning: 'Make directory dir.' },
                  { command: 'cd dir', meaning: 'Change directory.' },
                  { command: 'cd ..', meaning: 'Go up one directory.' },
                  { command: 'ls', meaning: 'List files.', options: '-a hidden, -R recursive, -r reverse, -t mtime, -S size, -l long, -1 one per line, -m comma, -Q quoted' },
                ],
                practicalApplications: ['Create a project folder.', 'List hidden dotfiles with -a.', 'Find recently changed files with -t.'],
                commonMistakes: ['Mixing -r reverse with -R recursive.', 'Expecting -h sizes; commenters wanted it, the table omits it.'],
                relatedConcepts: ['File operations', 'Permissions'],
              },
              revisionNotes: {
                keyTerms: ['pwd', 'cd', 'mkdir', 'ls', 'hidden files'],
                remember: ['-a includes hidden.', '-t vs -S sort keys.'],
                importantSyntax: ['ls -l', 'ls -R', 'cd ..'],
                commonMistakes: ['-r vs -R.'],
              },
              sources: [SOURCE.linux],
            }),
            lesson({
              id: 'linux-file-operations',
              moduleId: 'linux-files',
              title: 'File operations and search',
              overview: 'Create, view, copy, and search files. Comments correct find glob quoting.',
              difficulty: 'Beginner',
              technologyVersion: 'Linux/Bash — version not specified',
              sortOrder: 2,
              learningObjectives: [
                'Copy, move, remove, and view files.',
                'Search with grep flags from the sheet.',
                'Quote find -name patterns as the commenter demonstrated.',
              ],
              content: {
                explanation:
                  'File operations: touch file1; cat file1 file2; less file1; file file1; cp file1 file2; mv file1 file2; rm file1; head file1 first 10 lines; tail file1 last 10; tail -F follow. Search: grep pattern files; grep -i case insensitive; -r recursive; -v inverted; -o matched part only; find /dir/ -name name*; find /dir/ -user name; find /dir/ -mmin num; whereis command; locate file. Bill (17 Feb 2014) shows that find . -name name* can break because the shell expands the glob, and find . -name "name*" works as intended. Eric (7 Aug 2012) pipes tail into head to take a window of lines. Damien (23 Jul 2014) suggests mkdir -p (not on the original table).',
                keyConcepts: [
                  { title: 'grep', definition: 'Search file contents for a pattern, with -i/-r/-v/-o.', purpose: 'Find text.' },
                  { title: 'find', definition: 'Search the tree by name, owner, or age in minutes.', purpose: 'Locate files.' },
                ],
                commands: [
                  { command: 'cp file1 file2', meaning: 'Copy.' },
                  { command: 'mv file1 file2', meaning: 'Move/rename.' },
                  { command: 'rm file1', meaning: 'Delete.' },
                  { command: 'head file1 / tail file1', meaning: 'First or last 10 lines.' },
                  { command: 'grep pattern files', meaning: 'Search files.', options: '-i -r -v -o' },
                  { command: 'find /dir/ -name name*', meaning: 'Find files starting with name (sheet text).' },
                ],
                practicalApplications: ['Follow a log with tail -F.', 'Find files owned by a user.', 'Extract only the matching text with grep -o (added after a comment).'],
                commonMistakes: ['Unquoted find -name globs.', 'Using rm without checking the path.'],
                relatedConcepts: ['Directories and ls', 'Redirection and pipes'],
                conflicts: [
                  {
                    topic: 'find -name glob quoting',
                    claims: [
                      { source: 'DaveChild Linux Command Line Cheat Sheet', statement: 'find /dir/ -name name* — Find files starting with name in dir.' },
                      { source: 'Bill comment, 17 Feb 2014', statement: 'Without quotes the shell expands *; use find . -name "name*".' },
                    ],
                  },
                ],
              },
              revisionNotes: {
                keyTerms: ['cp', 'mv', 'rm', 'grep', 'find', 'tail -F'],
                remember: ['head/tail default 10 lines.', 'Quote find name patterns.'],
                importantSyntax: ['grep -r', 'find /dir/ -mmin num', 'tail -F file1'],
                commonMistakes: ['Shell glob vs find -name.'],
              },
              sources: [SOURCE.linux],
            }),
            lesson({
              id: 'linux-permissions',
              moduleId: 'linux-files',
              title: 'File permissions',
              overview: 'chmod digits 4/2/1 and chown. A comment argues against numeric recursive chmod.',
              difficulty: 'Intermediate',
              technologyVersion: 'Linux — version not specified',
              sortOrder: 3,
              learningObjectives: [
                'Compute a mode from read 4, write 2, execute 1.',
                'Read owner/group/everyone as three digits.',
                'Preserve the numeric vs symbolic chmod disagreement.',
              ],
              content: {
                explanation:
                  'chmod 775 file changes mode to 775. chmod -R 600 folder recursively chmods folder to 600. chown user:group file changes owner and group. Digits: first owner, second group, third everyone. 4 read, 2 write, 1 execute. PierreBdR (9 Feb 2013) prefers symbolic forms such as chmod -R u+rw folder, chmod -R og-rwx, chmod -R og=u-w folder, and warns that chmod -R 600 folder can lock you out and strip executable bits.',
                keyConcepts: [
                  { title: 'Mode digit', definition: 'Sum of 4+2+1 for rwx.', purpose: 'Encode permissions compactly.' },
                  { title: 'chown', definition: 'user:group on a file.', purpose: 'Change ownership.' },
                ],
                commands: [
                  { command: 'chmod 775 file', meaning: 'Set mode 775.' },
                  { command: 'chmod -R 600 folder', meaning: 'Recursive 600 as listed on the sheet.' },
                  { command: 'chown user:group file', meaning: 'Change owner and group.' },
                ],
                practicalApplications: ['Make a script executable by adding 1 for the needed class.', 'Transfer ownership after copying files.'],
                commonMistakes: ['Recursive 600 on directories (commenter warning).', 'Forgetting execute bit on directories.'],
                relatedConcepts: ['Directories and ls'],
                conflicts: [
                  {
                    topic: 'Numeric vs symbolic chmod',
                    claims: [
                      { source: 'DaveChild Linux Command Line Cheat Sheet', statement: 'Shows chmod 775 and chmod -R 600 folder.' },
                      { source: 'PierreBdR comment, 9 Feb 2013', statement: 'Avoid numeric recursive chmod; use symbolic u+rw / og-rwx / og=u-w; 600 recursive can lock you out and drop execute bits.' },
                    ],
                  },
                ],
              },
              revisionNotes: {
                keyTerms: ['chmod', 'chown', 'read 4', 'write 2', 'execute 1'],
                remember: ['Three digits: owner, group, others.', 'Commenters prefer symbolic recursive chmod.'],
                importantSyntax: ['chmod 775 file', 'chown user:group file'],
                commonMistakes: ['chmod -R 600 on a tree of directories.'],
              },
              sources: [SOURCE.linux],
            }),
          ],
        },
        {
          id: 'linux-shell',
          subjectId: 'linux',
          name: 'Shell composition',
          description: 'Redirection, pipes, jobs, and shortcuts.',
          sortOrder: 2,
          lessons: [
            lesson({
              id: 'linux-redirection-pipes',
              moduleId: 'linux-shell',
              title: 'Redirection, pipes, and command lists',
              overview: 'How standard streams connect to files and other commands.',
              difficulty: 'Intermediate',
              technologyVersion: 'Bash — version not specified',
              sortOrder: 1,
              learningObjectives: [
                'Redirect stdin, stdout, and stderr as listed.',
                'Pipe stdout or stdout+stderr.',
                'Sequence commands with ; && || and background &.',
              ],
              content: {
                explanation:
                  'Redirection: cmd < file; cmd1 <(cmd2); cmd > file; cmd > /dev/null; cmd >> file; cmd 2> file; cmd 1>&2; cmd 2>&1; cmd &> file. Pipes: cmd1 | cmd2; cmd1 |& cmd2 (stderr of cmd1 to cmd2). Lists: cmd1 ; cmd2; cmd1 && cmd2 if successful; cmd1 || cmd2 if not successful; cmd & run in a subshell (sheet wording). Comments add 2>/dev/null or 2>&- to ignore errors (jim, 30 Nov 2011). Wane (21 Mar 2012) notes Ctrl shortcuts are emacs-mode, not vim-mode.',
                keyConcepts: [
                  { title: 'stdout vs stderr', definition: '> vs 2> vs &> as listed.', purpose: 'Separate or merge logs and errors.' },
                  { title: 'Pipe', definition: 'stdout of one command becomes stdin of the next.', purpose: 'Build pipelines.' },
                ],
                syntax: ['cmd > file', 'cmd >> file', 'cmd 2> file', 'cmd &> file', 'cmd1 | cmd2', 'cmd1 && cmd2', 'cmd1 || cmd2'],
                practicalApplications: ['Save output to a log.', 'Hide errors when searching files you cannot read.', 'Run a second command only if the first succeeds.'],
                commonMistakes: ['Overwriting with > when >> append was intended.', 'Forgetting stderr still prints when only stdout is redirected.'],
                relatedConcepts: ['File operations and search', 'Process management'],
              },
              revisionNotes: {
                keyTerms: ['stdin', 'stdout', 'stderr', 'pipe', '&&', '||'],
                remember: ['2> is stderr.', '| & pipe includes stderr on this sheet.'],
                importantSyntax: ['cmd > /dev/null', 'cmd 2>&1', 'cmd &'],
                commonMistakes: ['Mixing 1>&2 and 2>&1.'],
              },
              sources: [SOURCE.linux],
            }),
            lesson({
              id: 'linux-processes-env',
              moduleId: 'linux-shell',
              title: 'Processes, environment, and bash shortcuts',
              overview: 'Jobs, variables, and line-editing keys. Comments disagree about $SHELL.',
              difficulty: 'Beginner',
              technologyVersion: 'Bash — version not specified',
              sortOrder: 2,
              learningObjectives: [
                'Inspect and stop processes with ps, top, kill, pkill, killall.',
                'Read and export environment variables from the sheet.',
                'Record both claims about $SHELL.',
              ],
              content: {
                explanation:
                  'Processes: ps snapshot; top real time; kill pid; pkill name; killall names beginning name. Environment: env; echo $NAME; export NAME=value; $PATH; $HOME; $SHELL current shell (sheet). Alex (28 Sep 2015) says echo $SHELL prints the default shell and ps -p $$ prints the current shell. Shortcuts: CTRL-c stop; CTRL-z sleep; CTRL-a start of line; CTRL-e end; CTRL-u cut from start; CTRL-k cut to end; CTRL-r history search; !! repeat last; !abc last command starting with abc; !$ last argument; ALT-. last argument; !* all arguments; ^abc^123 replace in previous command. russ (22 Oct 2012) notes CTRL-Z stops a process and fg brings it back. daveydave400 asks for CTRL-y paste of cut text.',
                keyConcepts: [
                  { title: 'Process id', definition: 'kill pid targets a number from ps/top.', purpose: 'Stop a program.' },
                  { title: 'Environment', definition: 'Named values such as PATH and HOME.', purpose: 'Configure programs.' },
                ],
                commands: [
                  { command: 'ps', meaning: 'Snapshot of processes.' },
                  { command: 'top', meaning: 'Real-time processes.' },
                  { command: 'kill pid', meaning: 'Kill process id.' },
                  { command: 'export NAME=value', meaning: 'Set $NAME.' },
                  { command: 'echo $NAME', meaning: 'Print a variable.' },
                ],
                practicalApplications: ['Stop a runaway process.', 'Add a directory to PATH.', 'Replay the last command with !!.'],
                commonMistakes: ['killall matching more processes than intended.', 'Assuming $SHELL is always the running shell.'],
                relatedConcepts: ['Redirection and pipes'],
                conflicts: [
                  {
                    topic: 'Meaning of $SHELL',
                    claims: [
                      { source: 'DaveChild Linux Command Line Cheat Sheet', statement: '$SHELL — Current shell.' },
                      { source: 'Alex comment, 28 Sep 2015', statement: 'echo $SHELL prints the default shell; ps -p $$ prints the current shell.' },
                    ],
                  },
                ],
              },
              revisionNotes: {
                keyTerms: ['ps', 'top', 'kill', 'PATH', '!!', 'CTRL-r'],
                remember: ['CTRL-z sleeps a job.', 'Comments disagree on $SHELL.'],
                importantSyntax: ['export NAME=value', 'killall name', 'pkill name'],
                commonMistakes: ['Using $SHELL as proof of the active shell.'],
              },
              sources: [SOURCE.linux],
            }),
          ],
        },
      ],
    },
  ],
};

export const devopsDomain: DomainSpec = {
  id: 'devops',
  name: 'DevOps',
  description: 'Container tooling from pratikshahp’s Docker sheet, including source typos and contradictory systemctl captions.',
  sortOrder: 4,
  subjects: [
    {
      id: 'docker',
      domainId: 'devops',
      name: 'Docker',
      description: 'Images, containers, volumes, networks, Compose, and cleanup.',
      sortOrder: 1,
      modules: [
        {
          id: 'docker-core',
          subjectId: 'docker',
          name: 'Engine and images',
          description: 'Install captions, objects, and image workflow.',
          sortOrder: 1,
          lessons: [
            lesson({
              id: 'docker-engine-images',
              moduleId: 'docker-core',
              title: 'Engine, images, and containers',
              overview: 'Install/service rows, management verbs, and the pull/build/run/commit/push path. Several systemctl captions contradict the command names.',
              difficulty: 'Beginner',
              technologyVersion: 'Docker — version not specified; Compose install URL uses 1.27.4; Ubuntu apt docker.io',
              sortOrder: 1,
              learningObjectives: [
                'List docker image vs container vs volume vs network.',
                'Pull, build, run, commit, and push as listed.',
                'Flag the systemctl start/stop/restart rows that all say “Stop docker services”.',
              ],
              content: {
                explanation:
                  'Install table: apt update; apt install docker.io -y (Ubuntu); systemctl start docker captioned “Stop docker services”; systemctl stop docker also “Stop docker services”; systemctl restart docker “Stop and start docker services”; systemctl status docker checks status. Management: docker version, info, login, logout, inspect, --help, and docker image|container|volume|network [option]. Images: docker search nginx; docker image pull nginx; pull from a private registry; a Dockerfile example written “vim Dokerfile FROM alpine RUN date > /data”; docker image build -t php/alpine:dockerfile . ; run and commit a container; docker image push. Container operations include create/start/stop/run, attach, logs, exec, --rm, -w, --env, Ctrl+p Ctrl+q detach. List: docker image ls; container ls / ls -a / ls -q; volume ls; network ls.',
                keyConcepts: [
                  { title: 'Image vs container', definition: 'Images are listed and pulled; containers are created and run.', purpose: 'Separate blueprint from process.' },
                  { title: 'commit', definition: 'docker container commit myimage php/alpine:test saves a running container as an image.', purpose: 'Capture local changes (as listed).' },
                ],
                commands: [
                  { command: 'docker image pull nginx', meaning: 'Pull from Docker Hub.' },
                  { command: 'docker image build -t php/alpine:dockerfile .', meaning: 'Build from a Dockerfile.' },
                  { command: 'docker container run -it --name myweb alpine sh', meaning: 'Create and start interactively.' },
                  { command: 'docker container exec myalpine [command]', meaning: 'Run a process in a running container.' },
                  { command: 'docker container ls -a', meaning: 'List all containers.' },
                ],
                practicalApplications: ['Pull nginx for a local test.', 'Build from a Dockerfile.', 'Exec a shell in a running container.'],
                commonMistakes: ['Trusting the start docker caption that says Stop.', 'Copying the sheet’s “Dokerfile” filename spelling.'],
                relatedConcepts: ['Volumes, networks, and resources', 'Compose and cleanup'],
                conflicts: [
                  {
                    topic: 'systemctl start docker caption',
                    claims: [
                      { source: 'pratikshahp Docker Cheat Sheet, start row', statement: 'systemctl start docker | Stop docker services' },
                      { source: 'pratikshahp Docker Cheat Sheet, stop row', statement: 'systemctl stop docker | Stop docker services' },
                      { source: 'pratikshahp Docker Cheat Sheet, restart row', statement: 'systemctl restart docker | Stop and start docker services' },
                    ],
                  },
                ],
              },
              revisionNotes: {
                keyTerms: ['image', 'container', 'pull', 'build', 'commit', 'exec'],
                remember: ['ls -a shows stopped containers.', 'Sheet misspells Dockerfile in one example.'],
                importantSyntax: ['docker container run -it --rm alpine sh', 'docker image ls --digests'],
                commonMistakes: ['systemctl start described as stop.'],
              },
              sources: [SOURCE.docker],
            }),
            lesson({
              id: 'docker-volumes-networks',
              moduleId: 'docker-core',
              title: 'Volumes, networks, and resource limits',
              overview: 'Mounts, published ports, network modes, and CPU/memory/ulimit examples.',
              difficulty: 'Intermediate',
              technologyVersion: 'Docker — version not specified',
              sortOrder: 2,
              learningObjectives: [
                'Create and mount a named volume.',
                'Publish ports with -p and -P.',
                'State none/host/container/user-defined network modes from the sheet.',
              ],
              content: {
                explanation:
                  'Volumes: docker container run -itv /data --name myvol alpine sh creates a host directory mounted at /data; docker volume create --name myvolume; docker container run -itv myvolume:/data --name cmyvol alpine sh; docker system df. Networking: -p 8080:80; -P random host port; --network=none; --network=host; --network=container:myweb1; docker network create mynetwork; attach with --network=mynetwork; docker network connect/disconnect. Resources: --ulimit nproc=10; --cpuset-cpus="0"; --memory "200m".',
                keyConcepts: [
                  { title: 'Volume', definition: 'Named or bind data that outlives a container (as used on the sheet).', purpose: 'Keep /data files.' },
                  { title: 'Published port', definition: '-p host:container or -P random.', purpose: 'Reach nginx from the host.' },
                ],
                commands: [
                  { command: 'docker volume create --name myvolume', meaning: 'Create a named volume.' },
                  { command: 'docker container run -d --name myweb -p 8080:80 nginx', meaning: 'Publish port 80 to 8080.' },
                  { command: 'docker network create mynetwork', meaning: 'User-defined network.' },
                  { command: 'docker container run -d --name memlimit --memory "200m" alpine top', meaning: 'Cap memory.' },
                ],
                practicalApplications: ['Share data between containers with a named volume.', 'Put two containers on mynetwork.', 'Limit a noisy container’s memory.'],
                commonMistakes: ['Using --network=host without understanding it shares the host network namespace (sheet description).', 'Typos in -itv flag as printed; confirm docker run -v syntax in current Docker docs when implementing.'],
                relatedConcepts: ['Engine, images, and containers'],
              },
              revisionNotes: {
                keyTerms: ['volume', '-p', '-P', 'user-defined network', 'ulimit', 'memory'],
                remember: ['-P maps to a random host port.', 'none/host/container network modes are listed.'],
                importantSyntax: ['--network=none', 'docker network connect mynetwork web'],
                commonMistakes: ['Publishing the wrong host port.'],
              },
              sources: [SOURCE.docker],
            }),
            lesson({
              id: 'docker-compose-cleanup',
              moduleId: 'docker-core',
              title: 'Compose and cleanup',
              overview: 'Legacy docker-compose 1.27.4 install URL, wordpress folder workflow, and prune/rm commands.',
              difficulty: 'Intermediate',
              technologyVersion: 'docker-compose install example uses release 1.27.4; date not stated on the sheet',
              sortOrder: 3,
              learningObjectives: [
                'Start and stop a Compose app with up/up -d/ps/stop.',
                'Remove images, containers, networks, and volumes as listed.',
                'Treat the curl install URL as version-pinned historical source text.',
              ],
              content: {
                explanation:
                  'Compose: curl GitHub docker/compose releases download 1.27.4 into /usr/local/bin/docker-compose; chmod +x; mkdir wordpress; vim docker-compose.yaml; docker-compose up; up -d; ps; stop. Cleanup: docker image rm; image prune; container rm -f; container prune; network rm/prune; volume rm/prune; docker-compose rm; docker-compose down -v; docker system prune.',
                keyConcepts: [
                  { title: 'Compose project', definition: 'A yaml file plus up/stop/ps.', purpose: 'Run multi-container apps.' },
                  { title: 'prune', definition: 'Delete unused or stopped objects.', purpose: 'Free disk (sheet: system prune removes unused images, stopped containers, unused networks).' },
                ],
                commands: [
                  { command: 'docker-compose up -d', meaning: 'Start in the background.' },
                  { command: 'docker-compose ps', meaning: 'List project containers.' },
                  { command: 'docker system prune', meaning: 'Remove unused images, stopped containers, unused networks.' },
                  { command: 'docker-compose down -v', meaning: 'Delete the application with containers, networks, volumes and images (sheet wording).' },
                ],
                practicalApplications: ['Bring up a local wordpress folder as in the example.', 'Reclaim disk with prune.', 'Force-remove a running container with rm -f.'],
                commonMistakes: ['Installing Compose 1.27.4 today because the sheet’s URL pins that version.', 'system prune without reading that it deletes unused images and networks.'],
                relatedConcepts: ['Engine, images, and containers'],
              },
              revisionNotes: {
                keyTerms: ['docker-compose up', 'prune', 'down -v'],
                remember: ['up -d is background.', 'Compose install example is 1.27.4.'],
                importantSyntax: ['docker container prune', 'docker volume prune'],
                commonMistakes: ['down -v deleting volumes unexpectedly.'],
              },
              sources: [SOURCE.docker],
            }),
          ],
        },
      ],
    },
  ],
};

export const databaseDomain: DomainSpec = {
  id: 'databases',
  name: 'Databases',
  description: 'SQL clause order from mitcht’s draft and MySQL types/functions from DaveChild.',
  sortOrder: 5,
  subjects: [
    {
      id: 'sql',
      domainId: 'databases',
      name: 'SQL and MySQL',
      description: 'Query structure plus MySQL types and function catalogs. VARCHAR length and TIMESTAMP format follow the sheets, not modern manuals.',
      sortOrder: 1,
      modules: [
        {
          id: 'sql-queries',
          subjectId: 'sql',
          name: 'Queries',
          description: 'SELECT building blocks.',
          sortOrder: 1,
          lessons: [
            lesson({
              id: 'sql-query-structure',
              moduleId: 'sql-queries',
              title: 'SELECT clause order and predicates',
              overview: 'mitcht’s DRAFT Unix/git/SQL sheet stacks SELECT pieces, JOIN, CASE, and LIKE/IN/BETWEEN.',
              difficulty: 'Beginner',
              technologyVersion: 'SQL dialect not specified; source marked DRAFT; some lines are incomplete fragments',
              sortOrder: 1,
              learningObjectives: [
                'Order SELECT, FROM, WHERE, GROUP BY, HAVING, ORDER BY as listed.',
                'Use LEFT JOIN ... ON, LIKE, IN, BETWEEN.',
                'Name COUNT/AVG/MIN/MAX/SUM from the same block.',
              ],
              content: {
                explanation:
                  'The draft prints: CREATE TABLE table AS then SELECT, DISTINCT column*, SUM(col) AS alias, FROM table, WHERE cond, GROUP BY var, HAVING cond, ORDER BY col [DESC], LEFT JOIN tbl ON criteria. Also CASE WHEN cond then 0 ELSE 1 END AS variable; WHERE xx [NOT] LIKE pattern; [NOT] IN list; BETWEEN low AND high. Aggregates COUNT(*), AVG(), MIN(), MAX(), SUM(), abs(), round(), floor(), ceiling(). Strings substring(), lower(), upper(), ltrim(). Dates dayname(), monthname(), dayofweek(). Several SELECT lines are fragments (for example “SELECT , DISTINCT”).',
                keyConcepts: [
                  { title: 'Filter vs group filter', definition: 'WHERE vs HAVING as listed.', purpose: 'Restrict rows before or after grouping.' },
                  { title: 'LEFT JOIN', definition: 'LEFT JOIN tbl ON criteria.', purpose: 'Keep left rows when the right side is missing.' },
                ],
                syntax: [
                  'SELECT ... FROM table WHERE cond GROUP BY var HAVING cond ORDER BY col [DESC]',
                  'LEFT JOIN tbl ON criteria',
                  'WHERE xx [NOT] LIKE pattern',
                  'WHERE xx BETWEEN low AND high',
                  'CASE WHEN cond THEN 0 ELSE 1 END',
                ],
                practicalApplications: ['Filter then aggregate.', 'Join a related table.', 'Case-insensitive text with lower/upper as listed.'],
                commonMistakes: ['Copying the broken “SELECT , DISTINCT column*” fragment as valid SQL.', 'Treating this draft as a complete JOIN tutorial — only LEFT JOIN appears.'],
                relatedConcepts: ['MySQL data types', 'MySQL functions'],
              },
              revisionNotes: {
                keyTerms: ['SELECT', 'WHERE', 'GROUP BY', 'HAVING', 'ORDER BY', 'LEFT JOIN'],
                remember: ['HAVING is listed after GROUP BY.', 'The mitcht sheet is a draft with incomplete tokens.'],
                importantSyntax: ['SUM(col) AS alias', '[NOT] IN list'],
                commonMistakes: ['Validating SQL using the truncated SELECT line.'],
              },
              sources: [SOURCE.gitUnixSql],
            }),
          ],
        },
        {
          id: 'mysql-reference',
          subjectId: 'sql',
          name: 'MySQL reference',
          description: 'Types and function names from DaveChild.',
          sortOrder: 2,
          lessons: [
            lesson({
              id: 'mysql-data-types',
              moduleId: 'mysql-reference',
              title: 'MySQL data types and conversion',
              overview: 'String, numeric, date, ENUM/SET types, unsigned integer note, and CAST/CONVERT/BINARY.',
              difficulty: 'Beginner',
              technologyVersion: 'MySQL — version not specified (sheet updated 25 Feb 2020). CHAR/VARCHAR listed as 0–255.',
              sortOrder: 1,
              learningObjectives: [
                'Pick CHAR/VARCHAR/TEXT/BLOB families from the size rows.',
                'Explain UNSIGNED integers starting at 0.',
                'Name BINARY, CAST, and CONVERT.',
              ],
              content: {
                explanation:
                  'Strings: CHAR, VARCHAR, TINYTEXT (0–255); TEXT/BLOB (0–65535); MEDIUMTEXT/MEDIUMBLOB (0–16777215); LONGTEXT/LONGBLOB (0–4294967295). Integers marked x: TINYINT, SMALLINT, MEDIUMINT, INT, BIGINT with signed ranges; UNSIGNED uses the same width from 0. FLOAT precise to 23 digits; DOUBLE 24 to 53 digits; DECIMAL is “DOUBLE stored as string”. Dates: DATE YYYY-MM-DD; DATETIME YYYY-MM-DD HH:MM:SS; TIMESTAMP YYYYMMDDHHMMSS; TIME HH:MM:SS. ENUM one of preset options; SET selection of preset options. Conversion: BINARY \'string\'; CAST (expression AS datatype); CONVERT (expression, datatype).',
                keyConcepts: [
                  { title: 'Variable vs fixed string', definition: 'CHAR and VARCHAR both listed 0–255 on this sheet.', purpose: 'Store short text as the sheet describes.' },
                  { title: 'UNSIGNED', definition: 'Same bit width, range starts at 0 (TINYINT 0–255 example).', purpose: 'Non-negative integers.' },
                ],
                syntax: ["BINARY 'string'", 'CAST (expression AS datatype)', 'CONVERT (expression, datatype)'],
                practicalApplications: ['Choose INT vs BIGINT from the listed ranges.', 'Store timestamps.', 'Force a binary comparison with BINARY.'],
                commonMistakes: ['Assuming VARCHAR(255) is the modern maximum because the sheet says 0–255.', 'Reading TIMESTAMP as DATETIME’s dashed format — the sheet prints TIMESTAMP as YYYYMMDDHHMMSS.'],
                relatedConcepts: ['SELECT clause order', 'MySQL functions'],
                conflicts: [
                  {
                    topic: 'VARCHAR maximum length',
                    claims: [
                      { source: 'DaveChild MySQL Cheat Sheet', statement: 'VARCHAR — String (0–255).' },
                      { source: 'LectureToLife curator note', statement: 'The sheet does not mention later MySQL VARCHAR limits; do not silently modernize the number.' },
                    ],
                  },
                ],
              },
              revisionNotes: {
                keyTerms: ['CHAR', 'VARCHAR', 'TEXT', 'INT', 'UNSIGNED', 'ENUM', 'CAST'],
                remember: ['UNSIGNED TINYINT 0–255 example.', 'TIMESTAMP format on the sheet has no dashes.'],
                importantSyntax: ['CAST (expression AS datatype)', 'DECIMAL described as DOUBLE stored as string'],
                commonMistakes: ['Mixing DATETIME and TIMESTAMP formats from the table.'],
              },
              sources: [SOURCE.mysql],
            }),
            lesson({
              id: 'mysql-functions',
              moduleId: 'mysql-reference',
              title: 'MySQL functions catalog',
              overview: 'Grouping, math, string, date, control flow, and miscellaneous function names. Some crypto names are historical.',
              difficulty: 'Intermediate',
              technologyVersion: 'MySQL — version not specified; PASSWORD/OLD_PASSWORD/ENCRYPT listed',
              sortOrder: 2,
              learningObjectives: [
                'Find AVG, COUNT, SUM, MIN, MAX, GROUP_CONCAT.',
                'Locate CONCAT, SUBSTRING, DATE_FORMAT, NOW.',
                'Treat PASSWORD/OLD_PASSWORD as source-listed names, not a security lesson.',
              ],
              content: {
                explanation:
                  'Grouping: AVG, MAX, BIT_AND, STD, BIT_OR, STDDEV, COUNT, SUM, GROUP_CONCAT, VARIANCE, MIN. Math includes ABS, SIGN, MOD, FLOOR, CEILING, ROUND, DIV, EXP, LN, LOG/LOG2/LOG10, POW/POWER, SQRT, PI, trig functions, RAND, LEAST, GREATEST, TRUNCATE. Strings: ASCII through QUOTE including CONCAT, CONCAT_WS, LENGTH, CHAR_LENGTH, LOCATE, LEFT/RIGHT, TRIM family, REPLACE, LCASE/UCASE. Dates: DAYOFWEEK through DATE_ADD/DATE_SUB, DATE_FORMAT, CURRENT_DATE/TIME, NOW, UNIX_TIMESTAMP, and others. Control flow: IF, NULLIF, IFNULL. Miscellaneous includes DATABASE, USER, LAST_INSERT_ID, VERSION, MD5, SHA1, AES encrypt/decrypt, PASSWORD, OLD_PASSWORD, ENCRYPT, DES encrypt/decrypt, GET_LOCK. This lesson catalogs names; it does not teach cryptography.',
                keyConcepts: [
                  { title: 'Aggregate', definition: 'COUNT, SUM, AVG, MIN, MAX, GROUP_CONCAT.', purpose: 'Summarize groups.' },
                  { title: 'NOW / CURRENT_*', definition: 'Current date/time helpers.', purpose: 'Default timestamps.' },
                ],
                practicalApplications: ['GROUP_CONCAT for a comma list.', 'CONCAT_WS to join with a separator.', 'LAST_INSERT_ID after an insert.'],
                commonMistakes: ['Using PASSWORD() because it appears on a cheat sheet — the sheet does not discuss deprecation.', 'Confusing LENGTH with CHAR_LENGTH; both are listed without a comparison.'],
                relatedConcepts: ['MySQL data types', 'SELECT clause order'],
              },
              revisionNotes: {
                keyTerms: ['COUNT', 'GROUP_CONCAT', 'CONCAT_WS', 'NOW', 'IFNULL', 'LAST_INSERT_ID'],
                remember: ['Control flow: IF, IFNULL, NULLIF.', 'Crypto-related names are listed without guidance.'],
                importantSyntax: ['DATE_FORMAT', 'UNIX_TIMESTAMP', 'CAST still in the types lesson'],
                commonMistakes: ['Picking MD5 from the misc list as a password scheme.'],
              },
              sources: [SOURCE.mysql],
            }),
          ],
        },
      ],
    },
  ],
};

export const extraDomains: DomainSpec[] = [softwareDomain, osDomain, devopsDomain, databaseDomain];
