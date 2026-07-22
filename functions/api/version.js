/**
 * Version Handler
 * Returns application version information
 * Enhanced with more details
 */

import { jsonResponse } from "../_shared/http.js";

// Version information - can be updated via CI/CD
const VERSION_INFO = {
    version: "1.3.0",
    name: "GerardOS Private",
    fullSha: process.env.CF_PAGES_COMMIT_SHA || null,
    shortSha: process.env.CF_PAGES_COMMIT_SHA ? process.env.CF_PAGES_COMMIT_SHA.substring(0, 7) : null,
    buildDate: process.env.BUILD_DATE || new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    nodeVersion: process.version,
    features: {
        authentication: true,
        privateRepos: true,
        fileEditor: true,
        rateLimiting: true,
        caching: true,
        serviceWorker: true,
        aiIntegration: false
    },
    security: {
        csp: true,
        hsts: true,
        csrfProtection: true,
        jwt: true,
        secureCookies: true
    }
};

export async function onRequestGet(context) {
    return jsonResponse(VERSION_INFO);
}
