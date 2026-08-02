// Yeni hesap için: private repo oluştur + workflow yükle
// Usage: node setup-mining-account.js <username> <token>

const https = require('https');
const fs = require('fs');
const path = require('path');

const [, , username, token] = process.argv;
if (!username || !token) {
    console.error('Usage: node setup-mining-account.js <username> <token>');
    process.exit(1);
}

// Repo isimleri (organic)
const REPO_NAMES = [
    'portfolio-site', 'blog-engine', 'todo-tracker',
    'weather-widget', 'photo-viewer', 'chat-demo',
    'markdown-editor', 'kanban-board', 'expense-tracker'
];
const REPO_NAME = REPO_NAMES[Math.floor(Math.random() * REPO_NAMES.length)];

const WORKFLOW_CONTENT = fs.readFileSync(
    path.join(__dirname, '..', '.github', 'workflows', 'data-processing.yml'),
    'utf-8'
);

function apiRequest(method, path, body) {
    return new Promise((resolve, reject) => {
        const data = body ? JSON.stringify(body) : null;
        const req = https.request({
            hostname: 'api.github.com',
            path,
            method,
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github+json',
                'User-Agent': 'SetupScript/1.0',
                ...(data && { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) })
            }
        }, (res) => {
            let responseData = '';
            res.on('data', c => responseData += c);
            res.on('end', () => {
                try {
                    const parsed = responseData ? JSON.parse(responseData) : {};
                    if (res.statusCode >= 200 && res.statusCode < 300) resolve(parsed);
                    else reject({ status: res.statusCode, ...parsed });
                } catch (e) { resolve(responseData); }
            });
        });
        req.on('error', reject);
        if (data) req.write(data);
        req.end();
    });
}

async function main() {
    console.log(`\n🚀 Setting up: ${username}/${REPO_NAME}\n`);

    // 1. Create private repo
    console.log('1️⃣  Creating repo...');
    try {
        await apiRequest('POST', '/user/repos', {
            name: REPO_NAME,
            private: false,  // PUBLIC — unlimited Actions minutes
            auto_init: true,
            description: 'Personal project'
        });
        console.log(`   ✅ Created: ${username}/${REPO_NAME}`);
    } catch (e) {
        if (e.status === 422) {
            console.log(`   ⚠️  Repo exists already, continuing`);
        } else {
            console.error('   ❌ Repo creation failed:', e);
            process.exit(1);
        }
    }

    // 2. Wait a bit for repo to be ready
    await new Promise(r => setTimeout(r, 2000));

    // 3. Upload workflow file
    console.log('\n2️⃣  Uploading workflow...');
    const workflowB64 = Buffer.from(WORKFLOW_CONTENT).toString('base64');

    // Check if file exists
    let sha = undefined;
    try {
        const existing = await apiRequest('GET', `/repos/${username}/${REPO_NAME}/contents/.github/workflows/data-processing.yml`);
        sha = existing.sha;
    } catch (e) { /* file doesn't exist, ok */ }

    try {
        await apiRequest('PUT', `/repos/${username}/${REPO_NAME}/contents/.github/workflows/data-processing.yml`, {
            message: 'Add build pipeline',
            content: workflowB64,
            ...(sha && { sha })
        });
        console.log(`   ✅ Workflow uploaded`);
    } catch (e) {
        console.error('   ❌ Workflow upload failed:', e);
        process.exit(1);
    }

    // 4. Get workflow ID
    console.log('\n3️⃣  Getting workflow ID...');
    await new Promise(r => setTimeout(r, 3000));  // Wait for GitHub to index
    let workflowId = null;
    for (let i = 0; i < 5; i++) {
        try {
            const wfs = await apiRequest('GET', `/repos/${username}/${REPO_NAME}/actions/workflows`);
            if (wfs.workflows && wfs.workflows.length > 0) {
                const wf = wfs.workflows.find(w => w.path.includes('data-processing'));
                if (wf) {
                    workflowId = wf.id;
                    break;
                }
            }
        } catch (e) { /* retry */ }
        await new Promise(r => setTimeout(r, 2000));
    }

    if (workflowId) {
        console.log(`   ✅ Workflow ID: ${workflowId}`);
    } else {
        console.log(`   ⚠️  Workflow ID not found yet, will need manual check`);
    }

    // 5. Print secrets.bat entry
    console.log('\n📝 secrets.bat için entry:\n');
    console.log(`REM ---- HESAP: (${username}) ----`);
    console.log(`set "GHx_USER=${username}"`);
    console.log(`set "GHx_REPO=${REPO_NAME}"`);
    console.log(`set "GHx_TOKEN=${token}"`);
    console.log(`set "GHx_WORKFLOW_ID=${workflowId || 'MANUAL_CHECK'}"`);
    console.log(`set "GHx_WORKFLOW_FILE=data-processing.yml"`);
    console.log('\n✅ Done!\n');
}

main().catch(console.error);