import { generateAiResponse } from './ai.js';

export type WizardInput = {
  category: string;
  language: string;
  license: 'MIT' | 'GPL-3.0' | 'Apache-2.0' | 'NONE';
  visibility: 'public' | 'private';
  starterTemplate: 'WEB_APP' | 'MOBILE_APP' | 'DATA_ANALYSIS' | 'DOCUMENTATION' | 'IOT';
  problem: string;
  audience: string;
  goal: string;
};

export type GeneratedProject = {
  repoName: string;
  description: string;
  readme: string;
  contributing: string;
  licenseText?: string;
  files: Array<{ path: string; content: string }>;
  issues: Array<{ title: string; body: string }>;
};

const licenseText: Record<WizardInput['license'], string | undefined> = {
  MIT: 'MIT License\n\nCopyright (c) ' + new Date().getFullYear() + ' SynergySphere contributors\n\nPermission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions: The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED.',
  'Apache-2.0': 'Apache License\nVersion 2.0, January 2004\nhttp://www.apache.org/licenses/\n\nLicensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0.',
  'GPL-3.0': 'GNU GENERAL PUBLIC LICENSE\nVersion 3, 29 June 2007\n\nThis program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.',
  NONE: undefined,
};

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90) || 'community-project';
}

function fallback(input: WizardInput): GeneratedProject {
  const repoName = slug(input.goal.split(/[.!?]/)[0] || input.category);
  const ext = /python/i.test(input.language) ? 'py' : /java/i.test(input.language) ? 'java' : /c#|csharp/i.test(input.language) ? 'cs' : 'ts';
  const entry = input.starterTemplate === 'DOCUMENTATION' ? 'docs/overview.md' : `src/index.${ext}`;
  const code = input.starterTemplate === 'DOCUMENTATION'
    ? `# Project overview\n\n${input.goal}\n`
    : `/** Entry point for ${repoName}. */\nexport function describeProject() {\n  return ${JSON.stringify(input.goal)};\n}\n`;
  return {
    repoName,
    description: input.problem.slice(0, 160),
    readme: `# ${repoName}\n\n[![SynergySphere](https://img.shields.io/badge/SynergySphere-community-91db5e)](https://github.com)\n\n## About\n\n${input.goal}\n\n**Problem:** ${input.problem}\n\n**For:** ${input.audience}\n\n## Roadmap\n\n- [ ] Validate community needs\n- [ ] Deliver a useful first release\n- [ ] Measure impact and iterate\n\n## How to contribute\n\nRead [CONTRIBUTING.md](CONTRIBUTING.md), choose a good first issue, and open a focused pull request.\n\n## License\n\n${input.license === 'NONE' ? 'No license has been selected.' : `Distributed under the ${input.license} license.`}\n`,
    contributing: '# Contributing\n\nThank you for improving this project. Please discuss substantial changes in an issue, keep pull requests small, and include tests or clear manual verification steps.\n',
    licenseText: licenseText[input.license],
    files: [{ path: entry, content: code }, { path: '.gitignore', content: 'node_modules/\n.env\ndist/\n.expo/\n' }],
    issues: [
      { title: 'Good first issue: clarify the user journey', body: 'Document the first end-to-end journey for the people this project serves. Include assumptions and open questions.' },
      { title: 'Good first issue: add a contribution checklist', body: 'Add a concise pull request checklist covering tests, accessibility, and documentation.' },
      { title: 'Good first issue: create the first impact metric', body: 'Propose one measurable outcome and add it to the project roadmap with a simple collection method.' },
    ],
  };
}

function parseGenerated(raw: string, input: WizardInput): GeneratedProject | null {
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const data = JSON.parse(match[0]) as Partial<GeneratedProject>;
    if (!data.repoName || !data.description || !data.readme || !data.contributing || !Array.isArray(data.files) || !Array.isArray(data.issues)) return null;
    const files = data.files.filter((file): file is { path: string; content: string } => Boolean(file && typeof file.path === 'string' && typeof file.content === 'string') && /^[A-Za-z0-9._/-]{1,180}$/.test(file.path) && !file.path.includes('..')).slice(0, 35);
    const issues = data.issues.filter((issue): issue is { title: string; body: string } => Boolean(issue && typeof issue.title === 'string' && typeof issue.body === 'string')).slice(0, 5);
    if (!files.length || issues.length < 3) return null;
    return { repoName: slug(data.repoName), description: data.description.slice(0, 350), readme: data.readme.slice(0, 50_000), contributing: data.contributing.slice(0, 20_000), licenseText: input.license === 'NONE' ? undefined : (data.licenseText || licenseText[input.license]), files, issues };
  } catch { return null; }
}

export async function generateCommunityProject(input: WizardInput): Promise<GeneratedProject> {
  const prompt = [
    'Create a GitHub-ready starter repository from this community project questionnaire.',
    'Return ONLY valid JSON with repoName, description, readme, contributing, licenseText, files ([{path,content}]), and issues ([{title,body}]).',
    'Include README title, a SynergySphere badge, about, roadmap, how-to-contribute and license section. Include 3–5 concrete good-first issues.',
    'Generate no more than 25 small text files. Paths must be relative, safe, and never include .. .',
    JSON.stringify(input),
  ].join('\n');
  const raw = await generateAiResponse('You are a senior open-source maintainer. Return a complete, safe JSON repository scaffold.', prompt, [], () => JSON.stringify(fallback(input)));
  return parseGenerated(raw, input) || fallback(input);
}
