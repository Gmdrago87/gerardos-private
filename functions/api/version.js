/**
 * Version Handler
 * Returns application version information
 */

import { jsonResponse } from "../_shared/http.js";

// Version information - can be updated via CI/CD
const VERSION_INFO = {
    version: "1.2.0",
    fullSha: process.env.CF_PAGES_COMMIT_SHA || null,
    buildDate: process.env.BUILD_DATE || new Date().toISOString(),
    environment: process.env.NODE_ENV || "development"
};

export async function onRequestGet(context) {
    return jsonResponse(VERSION_INFO);
}
