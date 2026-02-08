"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
/**
 * List user's media files
 * Queries DynamoDB for user's media items
 * Implementation placeholder
 */
const handler = async (event, context) => {
    try {
        console.log('List media request received:', {
            requestId: context.awsRequestId,
            path: event.path,
            method: event.httpMethod,
            queryParams: event.queryStringParameters,
        });
        // Get userId from path or query params (in real implementation, from JWT)
        const userId = event.pathParameters?.userId || 'user123';
        const page = parseInt(event.queryStringParameters?.page || '1');
        const limit = parseInt(event.queryStringParameters?.limit || '20');
        // Validate pagination params
        if (page < 1 || limit < 1 || limit > 100) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({
                    error: 'Invalid pagination parameters',
                    details: 'page >= 1, 1 <= limit <= 100',
                }),
            };
        }
        console.log('Fetching media for user:', {
            userId,
            page,
            limit,
        });
        // TODO: Implement actual DynamoDB query
        // Query media table with userId as partition key
        // Use pagination with startKey and limit
        // Placeholder response
        const mockMedia = [
            {
                id: 'media-001',
                name: 'vacation-photo.jpg',
                type: 'image',
                size: 2048000,
                uploadedAt: new Date(Date.now() - 86400000).toISOString(),
                url: 'https://sharespace-media.s3.amazonaws.com/user123/media-001',
            },
            {
                id: 'media-002',
                name: 'family-video.mp4',
                type: 'video',
                size: 524288000,
                uploadedAt: new Date(Date.now() - 172800000).toISOString(),
                url: 'https://sharespace-media.s3.amazonaws.com/user123/media-002',
            },
        ];
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                items: mockMedia,
                pagination: {
                    page,
                    limit,
                    total: 2,
                    totalPages: 1,
                },
            }),
        };
    }
    catch (error) {
        console.error('List media error:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                error: 'Failed to list media',
                requestId: context.awsRequestId,
            }),
        };
    }
};
exports.handler = handler;
//# sourceMappingURL=list.js.map