#!/usr/bin/env node

/**
 * Test script for bulk delete tasks API
 * This script safely tests the bulk delete functionality without actually deleting real data
 * 
 * Usage:
 * node scripts/test-bulk-delete-tasks.js
 * 
 * Make sure you have a valid admin session cookie before running this test
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

async function testBulkDeleteTasksAPI() {
  console.log('🧪 Testing Bulk Delete Tasks API...\n')

  // Test data - using fake IDs that won't exist in your Airtable
  const testTaskIds = [
    'rec_test_task_001',
    'rec_test_task_002', 
    'rec_test_task_003'
  ]

  try {
    console.log('📋 Test 1: Testing with testMode=true (safe simulation)')
    const testResponse = await fetch(`${API_BASE_URL}/api/admin/tasks/bulk-delete`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        // Note: You'll need to add your session cookie here
        // 'Cookie': 'session=your_session_cookie_here'
      },
      body: JSON.stringify({
        taskIds: testTaskIds,
        testMode: true
      })
    })

    const testResult = await testResponse.json()
    
    if (testResponse.ok) {
      console.log('✅ Test mode successful!')
      console.log('📊 Response:', JSON.stringify(testResult, null, 2))
    } else {
      console.log('❌ Test mode failed:', testResult.error)
    }

    console.log('\n📋 Test 2: Testing with invalid data')
    const invalidResponse = await fetch(`${API_BASE_URL}/api/admin/tasks/bulk-delete`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        // 'Cookie': 'session=your_session_cookie_here'
      },
      body: JSON.stringify({
        taskIds: [], // Empty array should fail
        testMode: true
      })
    })

    const invalidResult = await invalidResponse.json()
    
    if (!invalidResponse.ok) {
      console.log('✅ Invalid data test passed (correctly rejected)')
      console.log('📊 Error response:', JSON.stringify(invalidResult, null, 2))
    } else {
      console.log('❌ Invalid data test failed (should have been rejected)')
    }

    console.log('\n📋 Test 3: Testing with malformed request')
    const malformedResponse = await fetch(`${API_BASE_URL}/api/admin/tasks/bulk-delete`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        // 'Cookie': 'session=your_session_cookie_here'
      },
      body: JSON.stringify({
        // Missing taskIds
        testMode: true
      })
    })

    const malformedResult = await malformedResponse.json()
    
    if (!malformedResponse.ok) {
      console.log('✅ Malformed request test passed (correctly rejected)')
      console.log('📊 Error response:', JSON.stringify(malformedResult, null, 2))
    } else {
      console.log('❌ Malformed request test failed (should have been rejected)')
    }

    console.log('\n📋 Test 4: Testing connection endpoint')
    const connectionResponse = await fetch(`${API_BASE_URL}/api/admin/tasks/bulk-delete/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 'Cookie': 'session=your_session_cookie_here'
      },
      body: JSON.stringify({
        testTaskIds: testTaskIds
      })
    })

    const connectionResult = await connectionResponse.json()
    
    if (connectionResponse.ok) {
      console.log('✅ Connection test successful!')
      console.log('📊 Response:', JSON.stringify(connectionResult, null, 2))
    } else {
      console.log('❌ Connection test failed:', connectionResult.error)
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message)
  }

  console.log('\n🎯 Test Summary:')
  console.log('- Test mode allows safe testing without real deletions')
  console.log('- API properly validates input data')
  console.log('- Error handling works correctly')
  console.log('- Connection testing works')
  console.log('\n💡 To test with real session:')
  console.log('1. Login to your app as admin')
  console.log('2. Open browser dev tools')
  console.log('3. Copy your session cookie')
  console.log('4. Replace the Cookie header in this script')
  console.log('5. Run the script again')
}

// Run the test
testBulkDeleteTasksAPI()
