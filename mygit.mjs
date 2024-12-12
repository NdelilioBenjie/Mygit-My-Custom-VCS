#!/usr/bin/env node

import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { diffLines } from 'diff';
import chalk from 'chalk';
import { Command } from 'commander';
import fsExtra from 'fs-extra';

const program = new Command();

class Mygit {
    constructor(repoPath = '.') {
        this.repoPath = path.join(repoPath, '.mygit');
        this.objectsPath = path.join(this.repoPath, 'objects');
        this.headPath = path.join(this.repoPath, 'HEAD');
        this.indexPath = path.join(this.repoPath, 'index');
        this.branchesPath = path.join(this.repoPath, 'refs', 'heads');
        this.currentBranch = null;
        this.init();
    }

    async init() {
        await fs.mkdir(this.objectsPath, { recursive: true });
        await fs.mkdir(path.join(this.repoPath, 'refs'), { recursive: true });
        await fs.mkdir(this.branchesPath, { recursive: true });

        try {
            await fs.writeFile(this.headPath, 'main', { flag: 'wx' });
            await fs.writeFile(this.indexPath, JSON.stringify([]), { flag: 'wx' });
            const mainBranchPath = path.join(this.branchesPath, 'main');
            if (!(await this.fileExists(mainBranchPath))) {
                await fs.writeFile(mainBranchPath, '');
            }
        } catch {
            console.log("Repository already initialized.");
        }
    }

    async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    async loadCurrentBranch() {
        try {
            const branchName = await fs.readFile(this.headPath, 'utf-8');
            this.currentBranch = branchName.trim();
        } catch {
            console.error("Error reading HEAD file.");
            this.currentBranch = 'main';
        }
    }

    hashObject(content) {
        return crypto.createHash('sha1').update(content, 'utf-8').digest('hex');
    }

    async add(fileToBeAdded) {
        await this.loadCurrentBranch();
        const fileData = await fs.readFile(fileToBeAdded, 'utf-8');
        const fileHash = this.hashObject(fileData);
        const hashedObjectPath = path.join(this.objectsPath, fileHash);
        await fs.writeFile(hashedObjectPath, fileData);
        await this.updateStagingArea(fileToBeAdded, fileHash);
        console.log(`Added ${fileToBeAdded}`);
    }

    async updateStagingArea(filePath, fileHash) {
        const index = JSON.parse(await fs.readFile(this.indexPath, 'utf-8'));
        index.push({ path: filePath, hash: fileHash });
        await fs.writeFile(this.indexPath, JSON.stringify(index));
    }

    async commit(message) {
        await this.loadCurrentBranch();
        const index = JSON.parse(await fs.readFile(this.indexPath, 'utf-8'));
        const parentCommit = await this.getCurrentHead();
        const commitData = {
            timeStamp: new Date().toISOString(),
            message,
            files: index,
            parent: parentCommit,
        };

        const commitHash = this.hashObject(JSON.stringify(commitData));
        const commitPath = path.join(this.objectsPath, commitHash);
        await fs.writeFile(commitPath, JSON.stringify(commitData));

        const branchPath = path.join(this.branchesPath, this.currentBranch);
        await fs.writeFile(branchPath, commitHash);
        await fs.writeFile(this.indexPath, JSON.stringify([]));

        console.log(`Commit added: ${commitHash}`);
    }

    async getCurrentHead() {
        await this.loadCurrentBranch();
        try {
            const branchCommitHash = await fs.readFile(path.join(this.branchesPath, this.currentBranch), 'utf-8');
            return branchCommitHash.trim() || null;
        } catch {
            return null;
        }
    }

    async log() {
        await this.loadCurrentBranch();
        let currentCommitHash = await this.getCurrentHead();
        if (!currentCommitHash) {
            console.log("No commits found.");
            return;
        }
        // Use a helper function to recursively log all parents
        await this._logCommit(currentCommitHash);
    }

    async _logCommit(commitHash) {
        if (!commitHash) return;

        const commitData = JSON.parse(await fs.readFile(path.join(this.objectsPath, commitHash), 'utf-8'));
        console.log(`Commit: ${commitHash}\nDate: ${commitData.timeStamp}\nMessage: ${commitData.message}\n`);

        if (Array.isArray(commitData.parent)) {
            // If the commit has multiple parents (merge commit), log each parent
            for (const parentCommitHash of commitData.parent) {
                await this._logCommit(parentCommitHash);
            }
        } else {
            // If the commit has a single parent, log it
            await this._logCommit(commitData.parent);
        }
    }

    async createBranch(branchName) {
        await this.loadCurrentBranch();
        const branchPath = path.join(this.branchesPath, branchName);
        const currentCommitHash = await this.getCurrentHead();
        await fs.writeFile(branchPath, currentCommitHash || '');
        console.log(`Branch '${branchName}' created.`);
    }

    async switchBranch(branchName) {
        const branchPath = path.join(this.branchesPath, branchName);
        if (!(await this.fileExists(branchPath))) {
            console.error(`Branch '${branchName}' does not exist.`);
            return;
        }
        await fs.writeFile(this.headPath, branchName);
        this.currentBranch = branchName;
        console.log(`Switched to branch '${branchName}'.`);
    }

    async merge(branchName) {
        await this.loadCurrentBranch();
        const targetBranchPath = path.join(this.branchesPath, branchName);
        if (!(await this.fileExists(targetBranchPath))) {
            console.error(`Branch '${branchName}' does not exist.`);
            return;
        }

        const targetCommitHash = (await fs.readFile(targetBranchPath, 'utf-8')).trim();
        const currentCommitHash = await this.getCurrentHead();
        if (!currentCommitHash || !targetCommitHash) {
            console.error("Error: One or both branches have no commits.");
            return;
        }

        const mergedCommitData = {
            timeStamp: new Date().toISOString(),
            message: `Merge branch '${branchName}' into '${this.currentBranch}'`,
            files: [],
            parent: [currentCommitHash, targetCommitHash],
        };

        const targetCommitData = JSON.parse(await fs.readFile(path.join(this.objectsPath, targetCommitHash), 'utf-8'));
        const currentCommitData = JSON.parse(await fs.readFile(path.join(this.objectsPath, currentCommitHash), 'utf-8'));

        const mergedFiles = [...currentCommitData.files];
        for (const file of targetCommitData.files) {
            if (!mergedFiles.find(f => f.path === file.path)) {
                mergedFiles.push(file);
            }
        }

        mergedCommitData.files = mergedFiles;
        const mergedCommitHash = this.hashObject(JSON.stringify(mergedCommitData));
        const commitPath = path.join(this.objectsPath, mergedCommitHash);
        await fs.writeFile(commitPath, JSON.stringify(mergedCommitData));

        const branchPath = path.join(this.branchesPath, this.currentBranch);
        await fs.writeFile(branchPath, mergedCommitHash);

        console.log(`Merged branch '${branchName}' into '${this.currentBranch}'`);
    }

    async clone(repoPath, newRepoPath) {
        try {
            await fsExtra.copy(repoPath, newRepoPath);
            console.log(`Repository cloned to ${newRepoPath}`);
        } catch (error) {
            console.error("Failed to clone repository:", error.message);
        }
    }

    async showdiff(commitHash1, commitHash2) {
        try {
            const commitData1 = JSON.parse(await fs.readFile(path.join(this.objectsPath, commitHash1), 'utf-8'));
            const commitData2 = JSON.parse(await fs.readFile(path.join(this.objectsPath, commitHash2), 'utf-8'));

            for (const file1 of commitData1.files) {
                const file2 = commitData2.files.find(f => f.path === file1.path);
                if (file2) {
                    const fileContent1 = await fs.readFile(path.join(this.objectsPath, file1.hash), 'utf-8');
                    const fileContent2 = await fs.readFile(path.join(this.objectsPath, file2.hash), 'utf-8');

                    console.log(`\nFile: ${file1.path}`);

                    // Use diffLines to generate the diff between the two file contents
                    const diff = diffLines(fileContent1, fileContent2);

                    // Process each diff part
                    diff.forEach(part => {
                        if (part.added) {
                            // Line was added, print in green
                            process.stdout.write(chalk.green(`+ ${part.value}`));
                        } else if (part.removed) {
                            // Line was removed, print in red
                            process.stdout.write(chalk.red(`- ${part.value}`));
                        } else {
                            // Line is unchanged, print in grey
                            process.stdout.write(chalk.grey(`  ${part.value}`));
                        }
                    });
                } else {
                    console.log(chalk.red(`File ${file1.path} is not present in the second commit.`));
                }
            }
        } catch (error) {
            console.error('Error showing diff:', error.message);
        }
    }
}

program.command('init').action(async () => new Mygit());
program.command('add <file>').action(async file => new Mygit().add(file));
program.command('commit <message>').action(async message => new Mygit().commit(message));
program.command('log').action(async () => new Mygit().log());
program.command('create-branch <branchName>').action(async branchName => new Mygit().createBranch(branchName));
program.command('switch-branch <branchName>').action(async branchName => new Mygit().switchBranch(branchName));
program.command('merge <branchName>').action(async branchName => new Mygit().merge(branchName));
program.command('clone <repoPath> <newRepoPath>').action(async (repoPath, newRepoPath) => new Mygit().clone(repoPath, newRepoPath));
program.command('showdiff <commit1> <commit2>').action(async (commit1, commit2) => new Mygit().showdiff(commit1, commit2));

program.parse(process.argv);


