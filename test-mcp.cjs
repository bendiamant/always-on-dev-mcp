#!/usr/bin/env node

// Simple test script to validate MCP server functionality
const { spawn } = require('child_process');

function testMCPServer() {
  console.log('🧪 Testing MCP Server...\n');

  const server = spawn('node', ['./dist/index.js'], {
    stdio: ['pipe', 'pipe', 'inherit']
  });

  // Test 1: Initialize request
  const initRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {}
      },
      clientInfo: {
        name: 'test-client',
        version: '1.0.0'
      }
    }
  };

  // Test 2: List tools request
  const listToolsRequest = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
    params: {}
  };

  console.log('📤 Sending initialize request...');
  server.stdin.write(JSON.stringify(initRequest) + '\n');

  setTimeout(() => {
    console.log('📤 Sending list tools request...');
    server.stdin.write(JSON.stringify(listToolsRequest) + '\n');
  }, 100);

  let responseBuffer = '';

  server.stdout.on('data', (data) => {
    responseBuffer += data.toString();
    const lines = responseBuffer.split('\n');
    
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim();
      if (line) {
        try {
          const response = JSON.parse(line);
          console.log('📥 Server response:', JSON.stringify(response, null, 2));
          
          // Check if we got the tools list
          if (response.result && response.result.tools) {
            const tools = response.result.tools;
            console.log('\n✅ Found mandatory tools:');
            tools.forEach(tool => {
              console.log(`   • ${tool.name}: ${tool.description}`);
            });
            
            if (tools.some(t => t.name === 'initialize_coding_workspace') &&
                tools.some(t => t.name === 'finalize_coding_workspace')) {
              console.log('\n🎉 SUCCESS: Both mandatory tools are available!');
            } else {
              console.log('\n❌ ERROR: Missing mandatory tools');
            }
            
            server.kill();
          }
        } catch (e) {
          console.log('📥 Raw response:', line);
        }
      }
    }
    
    responseBuffer = lines[lines.length - 1];
  });

  server.on('close', (code) => {
    console.log('\n🔚 Server test completed');
  });

  // Cleanup after 5 seconds
  setTimeout(() => {
    server.kill();
  }, 5000);
}

testMCPServer(); 