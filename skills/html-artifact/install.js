#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const os = require('os');
const { getEnabledTargets, getFiles, extractSkillName, detectInstallLocation } = require('./utils');

function installToTarget(target, config) {
  console.log(`\nInstalling to ${target.name}...`);
  const isGlobal = process.env.npm_config_global === 'true';
  const location = detectInstallLocation(target.paths, isGlobal);
  const skillName = extractSkillName(config.name);
  const targetDir = path.join(location.base, skillName);
  const altTargetDir = path.join(location.base, config.name);
  console.log(`  Type: ${location.type}${isGlobal ? ' (global)' : ' (project)'}`);
  console.log(`  Directory: ${targetDir}`);
  // Clean up alternative path format
  if (fs.existsSync(altTargetDir) && altTargetDir !== targetDir) {
    fs.rmSync(altTargetDir, { recursive: true, force: true });
  }
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  // Copy SKILL.md (required)
  const skillMdSource = path.join(__dirname, 'SKILL.md');
  if (!fs.existsSync(skillMdSource)) {
    throw new Error('SKILL.md is required but not found');
  }
  fs.copyFileSync(skillMdSource, path.join(targetDir, 'SKILL.md'));
  console.log('  Copied SKILL.md');
  // Copy other files
  const files = getFiles(config);
  if (files) {
    Object.entries(files).forEach(([source, dest]) => {
      const sourcePath = path.join(__dirname, source);
      if (!fs.existsSync(sourcePath)) {
        console.warn(`  Warning: ${source} not found, skipping`);
        return;
      }
      const destPath = path.join(targetDir, dest);
      if (fs.statSync(sourcePath).isDirectory()) {
        copyDir(sourcePath, destPath);
        console.log(`  Copied directory: ${source}`);
      } else {
        const destDir = path.dirname(destPath);
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }
        fs.copyFileSync(sourcePath, destPath);
        console.log(`  Copied file: ${source}`);
      }
    });
  }
  // Update manifest
  updateManifest(location.base, config, target.name);
  // Run postinstall hooks
  if (config.hooks && config.hooks.postinstall) {
    console.log('  Running postinstall hook...');
    const { execSync } = require('child_process');
    try {
      execSync(config.hooks.postinstall, { cwd: targetDir, stdio: 'pipe' });
      console.log('  Postinstall hook completed');
    } catch (error) {
      console.warn('  Warning: postinstall hook failed');
    }
  }
  console.log(`  Installed to ${target.name}`);
  return targetDir;
}

function installSkill() {
  console.log('Installing agent skill...\n');
  const configPath = path.join(__dirname, '.claude-skill.json');
  if (!fs.existsSync(configPath)) {
    throw new Error('.claude-skill.json not found');
  }
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const enabledTargets = getEnabledTargets(config);
  if (enabledTargets.length === 0) {
    console.warn('No targets enabled in configuration');
    return;
  }
  console.log(`Installing skill "${config.name}" to ${enabledTargets.length} target(s):`);
  enabledTargets.forEach(target => console.log(`  - ${target.name}`));
  const installedPaths = [];
  for (const target of enabledTargets) {
    try {
      const installPath = installToTarget(target, config);
      installedPaths.push({ target: target.name, path: installPath });
    } catch (error) {
      console.error(`\nFailed to install to ${target.name}:`, error.message);
    }
  }
  console.log('\nInstallation Complete!');
  if (installedPaths.length > 0) {
    console.log('\nInstalled to:');
    installedPaths.forEach(({ target, path: installPath }) => {
      console.log(`  - ${target}: ${installPath}`);
    });
  }
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function updateManifest(skillsDir, config, targetName) {
  const manifestPath = path.join(skillsDir, '.skills-manifest.json');
  let manifest = { skills: {} };
  if (fs.existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch (error) {
      manifest = { skills: {} };
    }
  }
  const skillName = extractSkillName(config.name);
  manifest.skills[config.name] = {
    version: config.version,
    installedAt: new Date().toISOString(),
    package: config.package || config.name,
    path: path.join(skillsDir, skillName),
    target: targetName
  };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
}

try {
  installSkill();
} catch (error) {
  console.error('\nFailed to install skill:', error.message);
  process.exit(1);
}
