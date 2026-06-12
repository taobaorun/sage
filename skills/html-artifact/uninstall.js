#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { getEnabledTargets, extractSkillName, detectInstallLocation } = require('./utils');

function uninstallFromTarget(target, config) {
  console.log(`\nUninstalling from ${target.name}...`);
  const isGlobal = process.env.npm_config_global === 'true';
  const location = detectInstallLocation(target.paths, isGlobal);
  const skillName = extractSkillName(config.name);
  const skillNameTargetDir = path.join(location.base, skillName);
  const fullPackageNameTargetDir = path.join(location.base, config.name);
  let removed = false;
  if (fs.existsSync(skillNameTargetDir)) {
    fs.rmSync(skillNameTargetDir, { recursive: true, force: true });
    console.log(`  Removed skill directory: ${skillName}`);
    removed = true;
  }
  if (fs.existsSync(fullPackageNameTargetDir) && fullPackageNameTargetDir !== skillNameTargetDir) {
    fs.rmSync(fullPackageNameTargetDir, { recursive: true, force: true });
    console.log(`  Removed skill directory: ${config.name}`);
    removed = true;
  }
  // Update manifest
  const manifestPath = path.join(location.base, '.skills-manifest.json');
  if (fs.existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      if (manifest.skills && manifest.skills[config.name]) {
        delete manifest.skills[config.name];
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
        console.log('  Updated manifest');
      }
    } catch (error) {
      console.warn('  Warning: Could not update manifest:', error.message);
    }
  }
  if (removed) {
    console.log(`  Uninstalled from ${target.name}`);
    return true;
  } else {
    console.log(`  Skill was not installed in ${target.name}`);
    return false;
  }
}

function uninstallSkill() {
  console.log('Uninstalling agent skill...\n');
  const configPath = path.join(__dirname, '.claude-skill.json');
  if (!fs.existsSync(configPath)) {
    console.warn('Warning: .claude-skill.json not found, skipping cleanup');
    return;
  }
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const enabledTargets = getEnabledTargets(config);
  console.log(`Uninstalling skill "${config.name}" from ${enabledTargets.length} target(s):`);
  enabledTargets.forEach(target => console.log(`  - ${target.name}`));
  const uninstalledFrom = [];
  for (const target of enabledTargets) {
    try {
      const success = uninstallFromTarget(target, config);
      if (success) {
        uninstalledFrom.push(target.name);
      }
    } catch (error) {
      console.error(`\nFailed to uninstall from ${target.name}:`, error.message);
    }
  }
  if (uninstalledFrom.length > 0) {
    console.log('\nUninstallation Complete!');
    console.log('Uninstalled from:');
    uninstalledFrom.forEach(target => console.log(`  - ${target}`));
  } else {
    console.log('\nSkill was not installed');
  }
}

try {
  uninstallSkill();
} catch (error) {
  console.error('\nWarning during uninstall:', error.message);
}
