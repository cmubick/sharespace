"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const uuid_1 = require("uuid");
const utils_1 = require("../../shared/utils");
// AWS clients
const s3Client = new client_s3_1.S3Client({
    region: process.env.AWS_REGION || 'us-west-2',
});
const dynamoDb = lib_dynamodb_1.DynamoDBDocumentClient.from(new client_dynamodb_1.DynamoDBClient({
    region: process.env.AWS_REGION || 'us-west-2',
}));
const MEDIA_BUCKET = process.env.MEDIA_BUCKET || 'sharespace-media';
const MEDIA_TABLE = process.env.MEDIA_TABLE || 'sharespace-media-table';
const MAX_UPLOAD_SIZE = 25 * 1024 * 1024; // 25MB default
const PRESIGNED_URL_EXPIRY = 3600; // 1 hour
/**
 * Generate pre-signed S3 upload URL and store metadata in DynamoDB
 * Accepts: filename, fileType, uploaderName, caption (optional), year (optional)
 * Returns: mediaId, s3Key, presignedUrl, expiresIn, uploadSizeLimit
 */
const handler = async (event, context) => {
    try {
        console.log('Upload initiation request:', {
            requestId: context.awsRequestId,
            path: event.path,
            method: event.httpMethod,
        });
        // Parse request body
        let uploadRequest;
        try {
            uploadRequest = JSON.parse(event.body || '{}');
        }
        catch (err) {
            console.error('Failed to parse request body:', err);
            return (0, utils_1.createErrorResponse)(new Error('Invalid JSON in request body'), 400);
        }
        // Validate required fields
        const missingFields = (0, utils_1.validateRequiredFields)(uploadRequest, [
            'filename',
            'fileType',
            'uploaderName',
        ]);
        if (missingFields.length > 0) {
            return (0, utils_1.createErrorResponse)(new Error(`Missing required fields: ${missingFields.join(', ')}`), 400);
        }
        const { filename, fileType, uploaderName, caption, year } = uploadRequest;
        // Validate filename
        if (typeof filename !== 'string' || filename.trim().length === 0) {
            return (0, utils_1.createErrorResponse)(new Error('Filename must be a non-empty string'), 400);
        }
        // Validate fileType
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'application/pdf'];
        if (!allowedTypes.includes(fileType)) {
            return (0, utils_1.createErrorResponse)(new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`), 400);
        }
        // Validate uploaderName
        if (typeof uploaderName !== 'string' || uploaderName.trim().length === 0) {
            return (0, utils_1.createErrorResponse)(new Error('Uploader name must be a non-empty string'), 400);
        }
        // Validate optional year
        if (year !== undefined && (typeof year !== 'number' || year < 1900 || year > 2100)) {
            return (0, utils_1.createErrorResponse)(new Error('Year must be between 1900 and 2100'), 400);
        }
        // Generate unique media ID and S3 object key
        const mediaId = (0, uuid_1.v4)();
        const timestamp = new Date().toISOString();
        const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
        const s3Key = `uploads/${mediaId}/${sanitizedFilename}`;
        console.log('Generating pre-signed URL:', {
            mediaId,
            s3Key,
            fileType,
            uploaderName,
        });
        // Generate pre-signed PUT URL
        const putCommand = new client_s3_1.PutObjectCommand({
            Bucket: MEDIA_BUCKET,
            Key: s3Key,
            ContentType: fileType,
            Metadata: {
                'upload-limit': MAX_UPLOAD_SIZE.toString(),
                'media-id': mediaId,
                'uploader': uploaderName,
            },
        });
        const presignedUrl = await (0, s3_request_presigner_1.getSignedUrl)(s3Client, putCommand, {
            expiresIn: PRESIGNED_URL_EXPIRY,
        });
        // Store metadata in DynamoDB
        const mediaMetadata = {
            id: mediaId,
            filename,
            uploader: uploaderName,
            uploadTimestamp: timestamp,
            mediaType: fileType,
            s3Key,
            ...(caption && { caption }),
            ...(year && { year }),
        };
        console.log('Storing metadata in DynamoDB:', mediaMetadata);
        await dynamoDb.send(new lib_dynamodb_1.PutCommand({
            TableName: MEDIA_TABLE,
            Item: mediaMetadata,
        }));
        const response = {
            mediaId,
            s3Key,
            presignedUrl,
            expiresIn: PRESIGNED_URL_EXPIRY,
            uploadSizeLimit: MAX_UPLOAD_SIZE,
        };
        console.log('Upload URL generated successfully:', {
            mediaId,
            expiresIn: PRESIGNED_URL_EXPIRY,
        });
        return (0, utils_1.createSuccessResponse)(response);
    }
    catch (error) {
        console.error('Upload initiation error:', error);
        return (0, utils_1.createErrorResponse)(error instanceof Error ? error : new Error('Failed to generate upload URL'), 500);
    }
};
exports.handler = handler;
//# sourceMappingURL=upload.js.map