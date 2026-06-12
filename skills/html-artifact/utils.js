const fs = require('fs');
const path = require('path');
const os = require('os');
const CWD = process.env.INIT_CWD || process.cwd();

const DEFAULT_TARGETS = {
  'claude-code': {
    enabled: true,
    paths: { global: '.claude/skills', project: '.claude/skills' }
  },
  cursor: {
    enabled: true,
    paths: { global: '.cursor/skills', project: '.cursor/skills' }
  },
  windsurf: {
    enabled: true,
    paths: { global: '.windsurf/skills', project: '.windsurf/skills' }
  },
  aider: {
    enabled: true,
    paths: { global: '.aider/skills', project: '.aider/skills' }
  },
  custom: {
    enabled: true,
    paths: { global: '.ai-skills', project: '.ai-skills' }
  },
  agents: {
    enabled: true,
    paths: { global: '.agents/skills', project: '.agents/skills' }
  }
};

const DEFAULT_FILES = {
  'SKILL.md': 'SKILL.md',
  scripts: 'scripts/'
};

function getEnabledTargets(config) {
  const targets = config.targets || DEFAULT_TARGETS;
  // Support array format: [{ tool, path }]
  if (Array.isArray(targets)) {
    return targets.map(target => ({
      name: target.tool || 'claude-code',
      paths: {
        global: target.path || '.claude/skills',
        project: target.path || '.claude/skills'
      }
    }));
  }
  // Support object format: { name: { enabled, paths } }
  return Object.entries(targets)
    .filter(([_, target]) => target.enabled)
    .map(([name, target]) => ({
      name,
      paths: target.paths
    }));
}

function getFiles(config) {
  return config.files || DEFAULT_FILES;
}

function extractSkillName(packageName) {
  return packageName.startsWith('@') ?
    packageName.split('/')[1] || packageName :
    packageName;
}

function detectInstallLocation(targetPaths, isGlobal) {
  if (isGlobal) {
    return {
      type: 'personal',
      base: path.join(os.homedir(), targetPaths.global)
    };
  }
  let projectRoot = CWD;
  while (projectRoot !== path.dirname(projectRoot)) {
    const hasPackageJson = fs.existsSync(path.join(projectRoot, 'package.json'));
    const hasGit = fs.existsSync(path.join(projectRoot, '.git'));
    const isInNodeModules = projectRoot.includes('/node_modules/') ||
                           path.basename(projectRoot) === 'node_modules';
    if ((hasPackageJson || hasGit) && !isInNodeModules) {
      break;
    }
    projectRoot = path.dirname(projectRoot);
  }
  const finalIsInNodeModules = projectRoot.includes('/node_modules/') ||
                              path.basename(projectRoot) === 'node_modules';
  if (finalIsInNodeModules) {
    console.warn('Warning: Could not find project root directory, using current directory');
    projectRoot = CWD;
  }
  return {
    type: 'project',
    base: path.join(projectRoot, targetPaths.project)
  };
}

module.exports = {
  DEFAULT_TARGETS,
  DEFAULT_FILES,
  getEnabledTargets,
  getFiles,
  extractSkillName,
  detectInstallLocation
};
