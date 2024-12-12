# MyGit: A Simple Git-like Version Control System

## Introduction

**MyGit** is a minimalistic, custom-built version control system written in Node.js that mimics basic Git functionality. It allows you to initialize a repository, track changes to files, commit those changes, switch between branches, and more. The purpose of this project is to understand the internal workings of version control systems, especially how Git stores and manages data.

This version control system includes features like staging files for commits, logging commit history, switching branches, merging branches, viewing diffs between commits, and even cloning repositories. While this system may not have all the features of Git, it provides a good foundation for learning and experimenting with version control concepts.


## Prerequisites

Before running **MyGit**, you must have the following installed:

- **Node.js**: MyGit is built using Node.js. You can download and install it from [Node.js Official Website](https://nodejs.org/).
  - MyGit is compatible with Node.js version 12.x or higher.
- **npm**: npm is the default package manager for Node.js, and it comes installed with Node.js.
- **Git (optional)**: While MyGit is a standalone version control system, Git is useful for comparison and testing. You can install Git from [Git Official Website](https://git-scm.com/).

Once these prerequisites are installed, you can proceed with the installation and setup of **MyGit**.

## Installation


1. Clone the repository or download the code.
2. Ensure that Node.js is installed on your machine.'
3. Run the command **npm install**
4. Make the script executable: **chmod +x mygit.mjs**


## Usage

Once **MyGit** is installed and set up, you can use it via the command line. You can run the commands either using `node mygit.js <command>` or by making the script executable and running it with `./mygit.js <command>`.

### Commands

Here is a list of the available commands in **MyGit**:

- `init`: Initializes a new **MyGit** repository.
- `add <file>`: Stages a file for commit.
- `commit <message>`: Commits staged changes with a message.
- `log`: Displays the commit history.
- `create-branch <branchName>`: Creates a new branch.
- `switch-branch <branchName>`: Switches to an existing branch.
- `merge <branchName>`: Merges the specified branch into the current branch.
- `clone <repoPath> <newRepoPath>`: Clones a repository to a new location.
- `showdiff <commit1> <commit2>`: Shows the differences between two commits.

### Functionality Details

Below is a detailed description of how the commands work in **MyGit**:

#### `init`

- Initializes a **MyGit** repository in the current directory by creating a `.mygit` directory to store version control data.
- The repository is set up with default files, such as `HEAD` for tracking the current branch and `index` for tracking staged files.

#### `add <file>`

- Stages a file for commit. It reads the file's contents, calculates a SHA-1 hash, and stores the file content in the `.mygit/objects` directory.
- Updates the `index` file to track the file for future commits.

#### `commit <message>`

- Commits the staged changes with a message. It creates a commit object containing metadata (timestamp, message) and the list of staged files.
- The commit is stored in `.mygit/objects`, and the current branch is updated to point to the new commit.

#### `log`

- Displays the commit history for the current branch, starting from the latest commit.
- Shows the commit hash, timestamp, and message.

#### `create-branch <branchName>`

- Creates a new branch by storing the current commit hash under `refs/heads/<branchName>`.
- The branch is created in the `.mygit/refs/heads/` directory.

#### `switch-branch <branchName>`

- Switches to the specified branch by updating the `HEAD` file to point to the new branch.
- The working directory will be updated to reflect the latest commit from the new branch.

#### `merge <branchName>`

- Merges the changes from the specified branch into the current branch.
- The commit history from both branches is combined, and the resulting commit is created with files from both branches.

#### `clone <repoPath> <newRepoPath>`

- Clones an existing **MyGit** repository to a new location.
- Copies all the repository's files, including `.mygit/` objects, branches, and commits, to the new path.

#### `showdiff <commit1> <commit2>`

- Displays the differences between two commits by comparing the files in those commits.
- Shows added lines in green, removed lines in red, and unchanged lines in grey.


## **Contributing**

Contributions are welcome! If you have ideas for optimization or additional features, feel free to fork the repository and submit a pull request.

---

## **License**

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

