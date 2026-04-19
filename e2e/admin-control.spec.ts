import { test, expect } from '@playwright/test';

// Test to verify admin control plane routes render without crashing

test.describe('Admin Control Plane', () => {
    test('should load overview without crashing', async ({ page }) => {
        await page.goto('/admin/control/overview');
        expect(await page.title()).toContain('Overview'); // Assuming that the page title contains 'Overview'
    });

    test('should load agents without crashing', async ({ page }) => {
        await page.goto('/admin/control/agents');
        expect(await page.title()).toContain('Agents'); // Assuming that the page title contains 'Agents'
    });
});
