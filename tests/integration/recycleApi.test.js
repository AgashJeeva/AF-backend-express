import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';

// Create mock functions at top level
const findByIdMock = jest.fn();
const findMock = jest.fn();
const saveMock = jest.fn();
const findByIdAndDeleteMock = jest.fn();

// Mock models BEFORE importing app
jest.unstable_mockModule('../../models/RecycleRequest.js', () => ({
    default: jest.fn().mockImplementation((data) => ({
        ...data,
        save: saveMock
    }))
}));

// Add static methods to RecycleRequest mock
const { default: RecycleRequestMock } = await import('../../models/RecycleRequest.js');
RecycleRequestMock.findById = findByIdMock;
RecycleRequestMock.find = findMock;
RecycleRequestMock.findByIdAndDelete = findByIdAndDeleteMock;

jest.unstable_mockModule('../../models/providerProfile.js', () => ({
    default: {
        findById: jest.fn()
    }
}));

const { default: ProviderProfileMock } = await import('../../models/providerProfile.js');
const app = (await import('../../index.js')).default;
const { generateTestToken } = await import('../testHelper.js');

describe('Recycle API Integration Tests', () => {
    let mockUserToken;

    beforeEach(() => {
        jest.clearAllMocks();
        mockUserToken = generateTestToken('user-123', 'customer');
    });

    describe('POST /api/recycling', () => {
        it('should create a new recycling request', async () => {
            const mockProviderProfile = { _id: 'provider-id', userId: 'provider-userId' };
            ProviderProfileMock.findById.mockResolvedValue(mockProviderProfile);
            
            saveMock.mockResolvedValue({
                _id: 'recycle-123',
                productName: 'Old Phone',
                status: 'Pending'
            });

            const response = await request(app)
                .post('/api/recycling')
                .set('Authorization', `Bearer ${mockUserToken}`)
                .send({
                    productName: 'Old Phone',
                    category: 'Phone',
                    description: 'Battery swollen',
                    quantity: 1,
                    provider: 'provider-id'
                });

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('productName', 'Old Phone');
        });
    });

    describe('GET /api/recycling', () => {
        it('should list recycling requests for the logged in user', async () => {
            findMock.mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockResolvedValue([{ productName: 'Old Phone' }])
            });

            const response = await request(app)
                .get('/api/recycling')
                .set('Authorization', `Bearer ${mockUserToken}`);

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
        });
    });

    describe('DELETE /api/recycling/:id', () => {
        it('should allow user to delete their own request', async () => {
            const mockRequest = {
                _id: 'recycle-123',
                user: 'user-123',
                toString: () => 'user-123'
            };
            findByIdMock.mockResolvedValue(mockRequest);
            findByIdAndDeleteMock.mockResolvedValue(true);

            const response = await request(app)
                .delete('/api/recycling/recycle-123')
                .set('Authorization', `Bearer ${mockUserToken}`);

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Recycling request deleted successfully');
        });
    });
});
