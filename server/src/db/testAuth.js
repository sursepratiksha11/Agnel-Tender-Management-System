import { pool } from '../config/db.js';

const API_BASE = 'http://localhost:5000/api';

async function testAuth() {
  console.log('\n=== Testing Authentication System ===\n');

  try {
    // Test 1: Signup as AUTHORITY
    console.log('1. Testing AUTHORITY signup...');
    const signupAuthority = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Admin User',
        email: 'admin@authority.com',
        password: 'admin123',
        role: 'AUTHORITY',
        organizationName: 'City Municipal Corporation',
      }),
    });

    if (!signupAuthority.ok) {
      const error = await signupAuthority.json();
      console.log('   ❌ Authority signup failed:', error);
    } else {
      const data = await signupAuthority.json();
      console.log('   ✅ Authority signup successful');
      console.log('   → User:', data.user.name, '| Role:', data.user.role);
      console.log('   → Token:', data.token.substring(0, 30) + '...');
    }

    // Test 2: Signup as BIDDER
    console.log('\n2. Testing BIDDER signup...');
    const signupBidder = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Bidder User',
        email: 'bidder@company.com',
        password: 'bidder123',
        role: 'BIDDER',
        organizationName: 'Tech Solutions Pvt Ltd',
      }),
    });

    if (!signupBidder.ok) {
      const error = await signupBidder.json();
      console.log('   ❌ Bidder signup failed:', error);
    } else {
      const data = await signupBidder.json();
      console.log('   ✅ Bidder signup successful');
      console.log('   → User:', data.user.name, '| Role:', data.user.role);
      console.log('   → Organization:', data.user.organization);
    }

    // Test 3: Login as AUTHORITY
    console.log('\n3. Testing AUTHORITY login...');
    const loginAuthority = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@authority.com',
        password: 'admin123',
      }),
    });

    let authorityToken = '';
    if (!loginAuthority.ok) {
      const error = await loginAuthority.json();
      console.log('   ❌ Authority login failed:', error);
    } else {
      const data = await loginAuthority.json();
      authorityToken = data.token;
      console.log('   ✅ Authority login successful');
      console.log('   → Role:', data.user.role);
    }

    // Test 4: Login as BIDDER
    console.log('\n4. Testing BIDDER login...');
    const loginBidder = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'bidder@company.com',
        password: 'bidder123',
      }),
    });

    let bidderToken = '';
    if (!loginBidder.ok) {
      const error = await loginBidder.json();
      console.log('   ❌ Bidder login failed:', error);
    } else {
      const data = await loginBidder.json();
      bidderToken = data.token;
      console.log('   ✅ Bidder login successful');
      console.log('   → Role:', data.user.role);
    }

    // Test 5: Get current user (protected route)
    console.log('\n5. Testing protected route /auth/me...');
    const meResponse = await fetch(`${API_BASE}/auth/me`, {
      headers: {
        Authorization: `Bearer ${authorityToken}`,
      },
    });

    if (!meResponse.ok) {
      const error = await meResponse.json();
      console.log('   ❌ Get current user failed:', error);
    } else {
      const data = await meResponse.json();
      console.log('   ✅ Get current user successful');
      console.log('   → User:', data.user.name, '| Email:', data.user.email);
    }

    // Test 6: Invalid login
    console.log('\n6. Testing invalid credentials...');
    const invalidLogin = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@authority.com',
        password: 'wrongpassword',
      }),
    });

    if (invalidLogin.status === 401) {
      console.log('   ✅ Invalid credentials properly rejected (401)');
    } else {
      console.log('   ❌ Invalid credentials not handled correctly');
    }

    // Test 7: Duplicate email
    console.log('\n7. Testing duplicate email...');
    const duplicateSignup = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Another Admin',
        email: 'admin@authority.com',
        password: 'password123',
        role: 'AUTHORITY',
        organizationName: 'Another Org',
      }),
    });

    if (duplicateSignup.status === 400) {
      const error = await duplicateSignup.json();
      console.log('   ✅ Duplicate email properly rejected:', error.error);
    } else {
      console.log('   ❌ Duplicate email not handled correctly');
    }

    // Test 8: Missing Authorization header
    console.log('\n8. Testing missing token...');
    const noTokenResponse = await fetch(`${API_BASE}/auth/me`);

    if (noTokenResponse.status === 401) {
      console.log('   ✅ Missing token properly rejected (401)');
    } else {
      console.log('   ❌ Missing token not handled correctly');
    }

    console.log('\n=== All Tests Completed ===\n');
  } catch (err) {
    console.error('Test error:', err.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

// Start server check
console.log('Checking if server is running on http://localhost:5000...');
fetch('http://localhost:5000/health')
  .then((res) => {
    if (res.ok) {
      console.log('✅ Server is running\n');
      testAuth();
    } else {
      console.log('❌ Server responded with error');
      process.exit(1);
    }
  })
  .catch((err) => {
    console.error('❌ Cannot connect to server. Make sure it is running on port 5000');
    console.error('Run: npm run dev');
    process.exit(1);
  });
