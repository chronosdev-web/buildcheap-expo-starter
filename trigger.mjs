import { queries, deductCreditAndCreateBuild } from './server/db.js';
import crypto from 'crypto';

const userId = 'eead491c-d5c8-4b23-a364-242c30b4ba31'; // CalSnap user
const projectId = 'c2a73dd9-dee3-4b8c-940d-544ed25c1d7c'; // CalSnap project ID
const platform = 'ios';
const buildId = crypto.randomUUID();
const buildNumber = queries.getNextBuildNumber.get(projectId).next;

try {
    deductCreditAndCreateBuild(userId, buildId, projectId, buildNumber, platform, 'HEAD', 'CalSnap build', 0);
    console.log('Build created:', buildId);
} catch (e) {
    console.error(e);
}
