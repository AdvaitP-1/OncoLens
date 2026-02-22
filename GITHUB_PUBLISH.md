# Publish to GitHub

Your repo is ready to push. The 6GB HAM10000 dataset is **not** included (excluded via `.gitignore`).

## Step 1: Log in to GitHub (if needed)

```bash
gh auth login
```

Follow the prompts (browser or token).

## Step 2: Create the repo and push

```bash
cd /Users/advaitpandey/Documents/oncolensHackUNCP

# Create repo on your GitHub and push (replace YOUR_USERNAME with your GitHub username)
gh repo create oncolensHackUNCP --public --source=. --remote=origin --push
```

Or, if you prefer to create the repo manually on github.com:

1. Go to https://github.com/new
2. Name it `oncolensHackUNCP` (or any name)
3. Create the repo **without** initializing (no README, .gitignore, or license)
4. Then run:

```bash
cd /Users/advaitpandey/Documents/oncolensHackUNCP
git remote add origin https://github.com/YOUR_USERNAME/oncolensHackUNCP.git
git push -u origin main
```

## Excluded from repo

- `backend/data/ham_index.json` (generated, machine-specific)
- `node_modules/`, `.next/`, `.env`, `.env.local`
- HAM10000 images (~6GB) – downloaded via kagglehub when you run `build_ham_index.py`
