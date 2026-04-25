import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';

// Create mock functions
const repairCountMock = jest.fn();
const recycleCountMock = jest.fn();
const repairAggregateMock = jest.fn();
const recycleAggregateMock = jest.fn();
const repairFindMock = jest.fn();
const recycleFindMock = jest.fn();

// Mock models
jest.unstable_mockModule('../../models/RepairRequest.js', () => ({
    default: {
        countDocuments: repairCountMock,
        aggregate: repairAggregateMock,
        find: repairFindMock
    }
}));

jest.unstable_mockModule('../../models/RecycleRequest.js', () => ({
    default: {
        countDocuments: recycleCountMock,
        aggregate: recycleAggregateMock,
        find: recycleFindMock
    }
}));

const app = (await import('../../index.js')).default;
const { generateTestToken } = await import('../testHelper.js');

describe('Admin Report API Integration Tests', () => {
    let adminToken;
    let userToken;

    beforeEach(() => {
        jest.clearAllMocks();
        adminToken = generateTestToken('admin-123', 'admin');
        userToken = generateTestToken('user-123', 'customer');
        
        // Setup default mock behaviors
        repairCountMock.mockResolvedValue(10);
        recycleCountMock.mockResolvedValue(5);
        repairAggregateMock.mockResolvedValue([{ _id: 1, count: 5 }]);
        recycleAggregateMock.mockResolvedValue([{ _id: 1, count: 2 }]);
        
        // Fixed: Match the chain exactly as it appears in adminController.js
        const mockFindResults = [{ 
            productName: 'Item', 
            status: 'Pending', 
            createdAt: new Date(),
            _doc: { status: 'Pending', createdAt: new Date() } 
        }];
        
        const mockChain = {
            populate: jest.fn().mockReturnThis(),
            // The controller calls .populate() multiple times, then awaits
            then: jest.fn(function(resolve) { resolve(mockFindResults); })
        };
        
        repairFindMock.mockReturnValue(mockChain);
        recycleFindMock.mockReturnValue(mockChain);
    });

    describe('GET /api/admin/stats', () => {
        it('should return system-wide statistics for admin', async () => {
            const response = await request(app)
                .get('/api/admin/stats')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.kpis).toHaveProperty('totalRepairs', 10);
        });

        it('should block non-admin users from stats', async () => {
            const response = await request(app)
                .get('/api/admin/stats')
                .set('Authorization', `Bearer ${userToken}`);

            expect(response.status).toBe(403);
        });
    });

    describe('GET /api/admin/report', () => {
        it('should generate a combined report with chart data', async () => {
            const response = await request(app)
                .get('/api/admin/report')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('charts');
        });
    });
});
