const { readFile, writeFile } = require('fs').promises;

const USERNAME = 'GerardMaestre';

const mapUser = ({ login, name, avatar_url, html_url, followers, following }) => ({
    login,
    name,
    avatar_url,
    html_url,
    followers,
    following
});

const mapRepo = ({ id, name, description, html_url, clone_url, homepage, language, stargazers_count, forks_count, pushed_at, default_branch, topics }) => ({
    id,
    name,
    description,
    html_url,
    clone_url,
    homepage,
    language,
    stargazers_count,
    forks_count,
    pushed_at,
    default_branch,
    topics: topics || []
});

async function saveDatabase(user, repos) {
    const data = {
        last_updated: new Date().toISOString(),
        user: mapUser(user),
        repos: repos.map(mapRepo)
    };
    
    // Minificar JSON para minimizar el peso del payload hacia el cliente
    await writeFile('public/database.json', JSON.stringify(data));
    console.log('✅ public/database.json actualizado con éxito (payload minificado).');
    
    // Actualizar nombre de cache dinámicamente en sw.js
    try {
        const swPath = 'public/sw.js';
        const swContent = await readFile(swPath, 'utf8');
        const timestamp = Date.now();
        const updatedSw = swContent.replace(/const CACHE_NAME = 'gerardos-[^']+';/, `const CACHE_NAME = 'gerardos-v${timestamp}';`);
        await writeFile(swPath, updatedSw);
        console.log(`✅ Cache en sw.js actualizada a gerardos-v${timestamp}`);
    } catch (e) {
        console.error('⚠️ No se pudo actualizar sw.js:', e.message);
    }
}

async function updatePortfolio() {
    console.log(`🤖 Iniciando actualización automática para @${USERNAME}...`);
    try {
        const headers = {
            'User-Agent': 'GerardOS-BuildScript/1.0',
            ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {})
        };
        
        const [userRes, reposRes] = await Promise.all([
            fetch(`https://api.github.com/users/${USERNAME}`, { headers }),
            fetch(`https://api.github.com/users/${USERNAME}/repos?per_page=100&sort=updated`, { headers })
        ]);
        
        if (!userRes.ok || !reposRes.ok) {
            throw new Error(`API Fetch error: User (${userRes.status}), Repos (${reposRes.status})`);
        }
        
        const [user, repos] = await Promise.all([userRes.json(), reposRes.json()]);
        await saveDatabase(user, repos);
    } catch (error) {
        console.error('❌ Error en la actualización:', error.message);
        process.exit(1);
    }
}

updatePortfolio();

