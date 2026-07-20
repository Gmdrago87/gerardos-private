export async function onRequestGet(context) {
    const { env } = context;
    
    // Cloudflare Pages automatically injects CF_PAGES_COMMIT_SHA & CF_PAGES_BRANCH
    const sha = env.CF_PAGES_COMMIT_SHA || "";
    const branch = env.CF_PAGES_BRANCH || "main";
    const shortSha = sha ? sha.substring(0, 7) : "";
    
    const versionText = shortSha ? `v1.1.0 (${branch}@${shortSha})` : "v1.1.0 (dev)";

    return new Response(JSON.stringify({
        sha: shortSha,
        fullSha: sha,
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
