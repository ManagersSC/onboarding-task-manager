#!/usr/bin/env node

/**
 * Test script for bulk create tasks API
 * 
 * This script tests the bulk create tasks API endpoint with various scenarios
 * to ensure it works correctly before using it in production.
 * 
 * Usage:
 *   node scripts/test-bulk-create-tasks.js
 * 
 * Make sure to set the following environment variables:
 *   - NEXT_PUBLIC_API_URL (e.g., http://localhost:3000)
 *   - TEST_SESSION_COOKIE (get from browser dev tools)
 */

const https = require('https')
const http = require('http')

// Configuration
const config = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  sessionCookie: process.env.TEST_SESSION_COOKIE,
  testMode: true // Always start with test mode
}

// Test data
const testResources = [
  {
    taskName: "Test Resource 1",
    taskDescription: "This is a test resource for bulk creation",
    taskWeek: 1,
    taskDay: 1,
    taskMedium: "Doc",
    taskLink: "https://example.com/resource1"
  },
  {
    taskName: "Test Resource 2", 
    taskDescription: "Another test resource",
    taskWeek: 1,
    taskDay: 2,
    taskMedium: "Video",
    taskLink: "https://example.com/resource2"
  },
  {
    taskName: "Test Resource 3",
    taskDescription: "Third test resource",
    taskWeek: 2,
    taskDay: 1,
    taskMedium: "Quiz",
    taskLink: ""
  }
]

const invalidTestResources = [
  {
    taskName: "", // Invalid: empty name
    taskDescription: "Invalid resource",
    taskWeek: 1,
    taskDay: 1,
    taskMedium: "Doc",
    taskLink: "https://example.com"
  },
  {
    taskName: "Invalid Resource 2",
    taskDescription: "Invalid resource",
    taskWeek: 10, // Invalid: out of range
    taskDay: 1,
    taskMedium: "Doc",
    taskLink: "https://example.com"
  },
  {
    taskName: "Invalid Resource 3",
    taskDescription: "Invalid resource",
    taskWeek: 1,
    taskDay: 1,
    taskMedium: "InvalidMedium", // Invalid: not in allowed list
    taskLink: "https://example.com"
  }
]

// Utility function to make HTTP requests
function makeRequest(url, options, data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    const isHttps = urlObj.protocol === 'https:'
    const client = isHttps ? https : http

    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session=${config.sessionCookie}`,
        ...options.headers
      }
    }

    if (data) {
      const jsonData = JSON.stringify(data)
      requestOptions.headers['Content-Length'] = Buffer.byteLength(jsonData)
    }

    const req = client.request(requestOptions, (res) => {
      let responseData = ''
      
      res.on('data', (chunk) => {
        responseData += chunk
      })
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData)
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: parsedData
          })
        } catch (err) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: responseData
          })
        }
      })
    })

    req.on('error', (err) => {
      reject(err)
    })

    if (data) {
      req.write(JSON.stringify(data))
    }
    
    req.end()
  })
}

// Test functions
async function testConnection() {
  console.log('🔍 Testing API connection...')
  
  try {
    const response = await makeRequest(`${config.apiUrl}/api/admin/tasks/bulk-create/test`, {
      method: 'POST'
    }, { testResources: [] })

    if (response.status === 200) {
      console.log('✅ API connection successful')
      return true
    } else {
      console.log(`❌ API connection failed: ${response.status}`)
      console.log('Response:', response.data)
      return false
    }
  } catch (error) {
    console.log(`❌ API connection error: ${error.message}`)
    return false
  }
}

async function testValidation() {
  console.log('\n🔍 Testing validation with invalid data...')
  
  try {
    const response = await makeRequest(`${config.apiUrl}/api/admin/tasks/bulk-create`, {
      method: 'POST'
    }, {
      resources: invalidTestResources,
      testMode: true
    })

    if (response.status === 400) {
      console.log('✅ Validation working correctly - rejected invalid data')
      console.log('Error:', response.data.error)
      return true
    } else {
      console.log(`❌ Validation failed: Expected 400, got ${response.status}`)
      console.log('Response:', response.data)
      return false
    }
  } catch (error) {
    console.log(`❌ Validation test error: ${error.message}`)
    return false
  }
}

async function testBulkCreate() {
  console.log('\n🔍 Testing bulk create with valid data...')
  
  try {
    const response = await makeRequest(`${config.apiUrl}/api/admin/tasks/bulk-create`, {
      method: 'POST'
    }, {
      resources: testResources,
      testMode: config.testMode
    })

    if (response.status === 200) {
      console.log('✅ Bulk create successful')
      console.log('Response:', response.data)
      return true
    } else {
      console.log(`❌ Bulk create failed: ${response.status}`)
      console.log('Response:', response.data)
      return false
    }
  } catch (error) {
    console.log(`❌ Bulk create test error: ${error.message}`)
    return false
  }
}

async function testEmptyArray() {
  console.log('\n🔍 Testing empty resources array...')
  
  try {
    const response = await makeRequest(`${config.apiUrl}/api/admin/tasks/bulk-create`, {
      method: 'POST'
    }, {
      resources: [],
      testMode: true
    })

    if (response.status === 400) {
      console.log('✅ Empty array correctly rejected')
      return true
    } else {
      console.log(`❌ Empty array test failed: Expected 400, got ${response.status}`)
      console.log('Response:', response.data)
      return false
    }
  } catch (error) {
    console.log(`❌ Empty array test error: ${error.message}`)
    return false
  }
}

async function testUnauthorized() {
  console.log('\n🔍 Testing unauthorized access...')
  
  try {
    const response = await makeRequest(`${config.apiUrl}/api/admin/tasks/bulk-create`, {
      method: 'POST'
    }, {
      resources: testResources,
      testMode: true
    })

    if (response.status === 401) {
      console.log('✅ Unauthorized access correctly rejected')
      return true
    } else {
      console.log(`❌ Unauthorized test failed: Expected 401, got ${response.status}`)
      console.log('Response:', response.data)
      return false
    }
  } catch (error) {
    console.log(`❌ Unauthorized test error: ${error.message}`)
    return false
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Bulk Create Tasks API Tests')
  console.log('=====================================')
  
  if (!config.sessionCookie) {
    console.log('❌ TEST_SESSION_COOKIE environment variable is required')
    console.log('   Get it from your browser dev tools (Application > Cookies)')
    process.exit(1)
  }

  const results = {
    connection: false,
    validation: false,
    bulkCreate: false,
    emptyArray: false,
    unauthorized: false
  }

  // Run tests
  results.connection = await testConnection()
  results.validation = await testValidation()
  results.bulkCreate = await testBulkCreate()
  results.emptyArray = await testEmptyArray()
  
  // Test unauthorized access (remove session cookie)
  const originalCookie = config.sessionCookie
  config.sessionCookie = 'invalid_session'
  results.unauthorized = await testUnauthorized()
  config.sessionCookie = originalCookie

  // Summary
  console.log('\n📊 Test Results Summary')
  console.log('======================')
  console.log(`Connection Test: ${results.connection ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`Validation Test: ${results.validation ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`Bulk Create Test: ${results.bulkCreate ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`Empty Array Test: ${results.emptyArray ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`Unauthorized Test: ${results.unauthorized ? '✅ PASS' : '❌ FAIL'}`)

  const passedTests = Object.values(results).filter(Boolean).length
  const totalTests = Object.keys(results).length

  console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`)

  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! The API is ready for use.')
    process.exit(0)
  } else {
    console.log('⚠️  Some tests failed. Please check the API implementation.')
    process.exit(1)
  }
}

// Run the tests
runTests().catch((error) => {
  console.error('💥 Test runner error:', error)
  process.exit(1)
})
