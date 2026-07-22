export async function onRequestGet(context) {
    const { env } = context;
    
    let sha = env.CF_PAGES_COMMIT_SHA || "";
    let branch = env.CF_PAGES_BRANCH || "main";
    
    // Fallback: If CF_PAGES_COMMIT_SHA is not injected (e.g. in dev), fetch latest commit from GitHub API
    if (!sha) {
        try {
            const ghRes = await fetch("https://api.github.com/repos/GerardMaestre/gerardos-privado/commits/main", {
                headers: {
                    "User-Agent": "GerardOS-Dashboard",
                    "Accept": "application/vnd.github.v3+json"
                }
            });
            if (ghRes.ok) {
                const ghData = await ghRes.json();
                sha = ghData.sha || "";
            }
        } catch (err) {
            console.error("Error fetching fallback commit from GitHub:", err);
        }
    }

    const shortSha = sha ? sha.substring(0, 7) : "latest";
    const fullSha = sha || "";
    const versionText = shortSha ? `v1.1.0 (${branch}@${shortSha})` : "v1.1.0";

    return new Response(JSON.stringify({
        sha: shortSha,
        fullSha: fullSha,
        branch: branch,
        version: versionText
    }), {
        status: 200,
        headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=60"
        }
    });
}
