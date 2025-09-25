/**
 * Integration Tests untuk Alonica Restaurant Self-Order System
 * Test ini mencakup:
 * - Authentication flow
 * - Admin dashboard access
 * - Kasir dashboard access  
 * - API endpoints
 * - Layout consistency
 */

import fetch from 'node-fetch';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

class AlonicaIntegrationTest {
  constructor() {
    this.adminToken = null;
    this.kasirToken = null;
    this.testResults = [];
  }

  async runTest(testName, testFn) {
    console.log(`🧪 Running: ${testName}`);
    try {
      await testFn();
      console.log(`✅ PASS: ${testName}`);
      this.testResults.push({ name: testName, status: 'PASS' });
    } catch (error) {
      console.error(`❌ FAIL: ${testName} - ${error.message}`);
      this.testResults.push({ name: testName, status: 'FAIL', error: error.message });
    }
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    if (!response.ok && !options.expectError) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return { response, data };
  }

  // Test 1: Health Check
  async testHealthCheck() {
    const { data } = await this.makeRequest('/api/health');
    if (!data.status || data.status !== 'healthy') {
      throw new Error('Health check failed');
    }
  }

  // Test 2: Initialize Default Users
  async testInitializeDefaultUsers() {
    const { data } = await this.makeRequest('/api/auth/init-default-users', {
      method: 'POST'
    });
    
    if (!data.message || !data.message.includes('initialized')) {
      throw new Error('Failed to initialize default users');
    }
  }

  // Test 3: Admin Login
  async testAdminLogin() {
    const { data } = await this.makeRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });

    if (!data.user || data.user.role !== 'admin' || !data.token) {
      throw new Error('Admin login failed');
    }

    this.adminToken = data.token;
  }

  // Test 4: Kasir Login
  async testKasirLogin() {
    const { data } = await this.makeRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: 'kasir1',
        password: 'kasir123'
      })
    });

    if (!data.user || data.user.role !== 'kasir' || !data.token) {
      throw new Error('Kasir login failed');
    }

    this.kasirToken = data.token;
  }

  // Test 5: Admin Access Control
  async testAdminEndpoints() {
    if (!this.adminToken) {
      throw new Error('Admin token not available');
    }

    // Test users endpoint (admin only)
    const { data } = await this.makeRequest('/api/users', {
      headers: { 'Authorization': `Bearer ${this.adminToken}` }
    });

    if (!Array.isArray(data)) {
      throw new Error('Admin users endpoint failed');
    }
  }

  // Test 6: Kasir Access Control
  async testKasirAccessControl() {
    if (!this.kasirToken) {
      throw new Error('Kasir token not available');
    }

    // Test that kasir cannot access admin-only endpoints
    const { response } = await this.makeRequest('/api/users', {
      headers: { 'Authorization': `Bearer ${this.kasirToken}` },
      expectError: true
    });

    if (response.status !== 403) {
      throw new Error('Kasir should not have access to admin endpoints');
    }
  }

  // Test 7: Menu API
  async testMenuAPI() {
    const { data } = await this.makeRequest('/api/menu');
    
    if (!Array.isArray(data)) {
      throw new Error('Menu API should return an array');
    }
  }

  // Test 8: Categories API
  async testCategoriesAPI() {
    const { data } = await this.makeRequest('/api/categories');
    
    if (!Array.isArray(data)) {
      throw new Error('Categories API should return an array');
    }
  }

  // Test 9: Orders API (with auth)
  async testOrdersAPI() {
    if (!this.adminToken) {
      throw new Error('Admin token not available');
    }

    const { data } = await this.makeRequest('/api/orders', {
      headers: { 'Authorization': `Bearer ${this.adminToken}` }
    });

    if (!Array.isArray(data)) {
      throw new Error('Orders API should return an array');
    }
  }

  // Test 10: Invalid Login (with rate limit handling)
  async testInvalidLogin() {
    // Wait a bit to avoid rate limiting from previous tests
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const { response } = await this.makeRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: 'invalid',
        password: 'invalid'
      }),
      expectError: true
    });

    // Accept both 401 (invalid credentials) and 429 (rate limited)
    if (response.status !== 401 && response.status !== 429) {
      throw new Error(`Invalid login should return 401 or 429, got ${response.status}`);
    }
  }

  // Test 11: Logout
  async testLogout() {
    if (!this.adminToken) {
      throw new Error('Admin token not available');
    }

    const { data } = await this.makeRequest('/api/auth/logout', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.adminToken}` }
    });

    if (!data.message || !data.message.includes('Logged out')) {
      throw new Error('Logout failed');
    }
  }

  // Test 12: Frontend Routes (basic check)
  async testFrontendRoutes() {
    const routes = ['/', '/login', '/menu', '/cart'];
    
    for (const route of routes) {
      const response = await fetch(`${BASE_URL}${route}`);
      if (!response.ok) {
        throw new Error(`Route ${route} returned ${response.status}`);
      }
    }
  }

  // Main test runner
  async runAllTests() {
    console.log('🚀 Starting Alonica Integration Tests...\n');

    // Backend API Tests
    await this.runTest('Health Check', () => this.testHealthCheck());
    await this.runTest('Initialize Default Users', () => this.testInitializeDefaultUsers());
    await this.runTest('Admin Login', () => this.testAdminLogin());
    await this.runTest('Kasir Login', () => this.testKasirLogin());
    await this.runTest('Admin Endpoints Access', () => this.testAdminEndpoints());
    await this.runTest('Kasir Access Control', () => this.testKasirAccessControl());
    await this.runTest('Menu API', () => this.testMenuAPI());
    await this.runTest('Categories API', () => this.testCategoriesAPI());
    await this.runTest('Orders API', () => this.testOrdersAPI());
    await this.runTest('Invalid Login Handling', () => this.testInvalidLogin());
    await this.runTest('Logout', () => this.testLogout());
    
    // Frontend Tests
    await this.runTest('Frontend Routes', () => this.testFrontendRoutes());

    // Print Results
    console.log('\n📊 Test Results Summary:');
    console.log('=' .repeat(50));
    
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    
    this.testResults.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : '❌';
      console.log(`${icon} ${result.name}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });

    console.log('=' .repeat(50));
    console.log(`Total: ${this.testResults.length} | Passed: ${passed} | Failed: ${failed}`);
    
    if (failed > 0) {
      console.log('\n⚠️  Some tests failed. Please check the errors above.');
      process.exit(1);
    } else {
      console.log('\n🎉 All tests passed!');
    }
  }
}

// Run tests if this file is executed directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const tester = new AlonicaIntegrationTest();
  tester.runAllTests().catch(console.error);
}

export default AlonicaIntegrationTest;