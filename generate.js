const fs = require('fs');

const USERNAME = 'GerardMaestre';

function mapUser(user) {
    return {
        login: user.login,
        name: user.name,
        avatar_url: user.avatar_url,
        html_url: user.html_url,
        followers: user.followers,
        following: user.following
    };
}

function mapRepo(repo) {
    return {
        id: repo.id,
        name: repo.name,
        description: repo.description,
        html_url: repo.html_url,
        clone_url: repo.clone_url,
        homepage: repo.homepage,
        language: repo.language,
        stargazers_count: repo.stargazers_count,
        forks_count: repo.forks_count,
        pushed_at: repo.pushed_at,
        default_branch: repo.default_branch,
        topics: repo.topics || []
    };
}

function saveDatabase(user, repos) {
    const data = {
        last_updated: new Date().toISOString(),
        user: mapUser(user),
        repos: repos.map(mapRepo)
    };
    fs.writeFileSync('database.json', JSON.stringify(data, null, 2));
    console.log('✅ database.json actualizado con éxito.');
}

async function updatePortfolio() {
    console.log(`🤖 Iniciando actualización automática para @${USERNAME}...`);
    try {
        const [userRes, reposRes] = await Promise.all([
            fetch(`https://api.github.com/users/${USERNAME}`),
            fetch(`https://api.github.com/users/${USERNAME}/repos?per_page=100&sort=updated`)
        ]);
        if (!userRes.ok || !reposRes.ok) throw new Error('API fetch failed');
        const user = await userRes.json();
        const repos = await reposRes.json();
        saveDatabase(user, repos);
    } catch (error) {
        console.error('❌ Error en la actualización:', error);
        process.exit(1);
    }
}

updatePortfolio();
