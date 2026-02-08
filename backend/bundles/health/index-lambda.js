"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
/**
 * Health check endpoint handler
 * Returns status of the application and its dependencies
 */
const handler = async (event, context) => {
    try {
        console.log('Health check request received:', {
            requestId: context.awsRequestId,
            path: event.path,
            method: event.httpMethod,
            timestamp: new Date().toISOString(),
        });
        // Get basic health information
        const healthStatus = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            service: 'sharespace-api',
            version: '0.1.0',
            environment: process.env.ENVIRONMENT || 'unknown',
            requestId: context.awsRequestId,
            uptime: process.uptime(),
            memory: {
                used: process.memoryUsage().heapUsed,
                limit: context.memoryLimitInMB,
            },
        };
        console.log('Health check response:', healthStatus);
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
            },
            body: JSON.stringify(healthStatus),
        };
    }
    catch (error) {
        console.error('Health check error:', error);
        const errorResponse = {
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown error',
            requestId: context.awsRequestId,
        };
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify(errorResponse),
        };
    }
};
exports.handler = handler;
//# sourceMappingURL=index.js.map