import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';

// Create persistent mock functions
const findByIdMock = jest.fn();
const findMock = jest.fn();
const saveMock = jest.fn();
const productFindOneMock = jest.fn();

// Mock models BEFORE importing app
jest.unstable_mockModule('../../models/RepairRequest.js', () => ({
    default: jest.fn().mockImplementation((data) => ({
        ...data,
        save: saveMock
    }))
}));

jest.unstable_mockModule('../../models/product.js', () => ({
    default: {
        findOne: productFindOneMock
    }
}));

const { default: RepairRequestMock } = await import('../../models/RepairRequest.js');
RepairRequestMock.findById = findByIdMock;
RepairRequestMock.find = findMock;
RepairRequestMock.prototype.save = saveMock;

const { default: ProductMock } = await import('../../models/product.js');

jest.unstable_mockModule('../../models/providerProfile.js', () => ({
    default: {
        findById: jest.fn()
    }
}));

const { default: ProviderProfileMock } = await import('../../models/providerProfile.js');
const app = (await import('../../index.js')).default;
const { generateTestToken } = await import('../testHelper.js');

describe('Repair API Integration Tests', () => {
    let mockUserToken;
    let mockProviderToken;

    beforeEach(() => {
        jest.clearAllMocks();
        mockUserToken = generateTestToken('user-123', 'customer', 'test@example.com');
        mockProviderToken = generateTestToken('provider-456', 'provider', 'provider@example.com');
    });

    describe('POST /api/repairs', () => {
        it('should create a new repair request successfully', async () => {
            ProviderProfileMock.findById.mockResolvedValue({ _id: 'p1', userId: 'u1' });
            saveMock.mockResolvedValue({ _id: 'r1', productName: 'Laptop' });
            productFindOneMock.mockResolvedValue({ status: 'active', lifecycle: [], save: jest.fn() });

            const response = await request(app)
                .post('/api/repairs')
                .set('Authorization', `Bearer ${mockUserToken}`)
                .send({ productName: 'Laptop', provider: 'p1', productID: 'PRD-123' });

            expect(response.status).toBe(201);
        });
    });

    describe('GET /api/repairs', () => {
        it('should list repair requests', async () => {
            findMock.mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockResolvedValue([{ productName: 'Laptop' }])
            });

            const response = await request(app)
                .get('/api/repairs')
                .set('Authorization', `Bearer ${mockUserToken}`);

            expect(response.status).toBe(200);
        });
    });

    describe('PATCH /api/repairs/:id/status', () => {
        it('should update repair status and sync product lifecycle', async () => {
            const mockRequest = {
                _id: 'req-123',
                productID: 'PRD-123',
                status: 'Pending',
                save: jest.fn().mockResolvedValue(true)
            };
            findByIdMock.mockResolvedValue(mockRequest);

            const mockProduct = {
                productID: 'PRD-123',
                status: 'active',
                lifecycle: [],
                save: jest.fn().mockResolvedValue(true)
            };
            productFindOneMock.mockResolvedValue(mockProduct);

            const response = await request(app)
                .patch('/api/repairs/req-123/status')
                .set('Authorization', `Bearer ${mockProviderToken}`)
                .send({ status: 'Accepted', note: 'Fixing' });

            expect(response.status).toBe(200);
            expect(mockRequest.status).toBe('Accepted');
            // Verification: Check if the PRODUCT lifecycle was updated
            expect(mockProduct.lifecycle.length).toBeGreaterThan(0);
            expect(mockProduct.status).toBe('under repair');
        });
    });
});
