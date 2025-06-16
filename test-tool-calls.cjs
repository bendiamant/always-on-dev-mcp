#!/usr/bin/env node

// Test script to verify MCP tool calls work correctly with modern SDK
const { spawn } = require('child_process');

function testToolCalls() {
  console.log('🧪 Testing Modern MCP Tool Calls...\n');

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

  // Test 2: Call initialize_coding_workspace tool
  const initWorkspaceCall = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'initialize_coding_workspace',
      arguments: {
        task_description: 'Test modern MCP server implementation',
        workspace_path: '/test/workspace'
      }
    }
  };

  console.log('📤 Sending initialize request...');
  server.stdin.write(JSON.stringify(initRequest) + '\n');

  // Send initialized notification to complete handshake
  const initializedNotification = {
    jsonrpc: '2.0',
    method: 'initialized',
    params: {}
  };

  let sessionId = null;

  setTimeout(() => {
    console.log('📤 Sending initialized notification...');
    server.stdin.write(JSON.stringify(initializedNotification) + '\n');
    
    setTimeout(() => {
      console.log('📤 Calling initialize_coding_workspace tool...');
      server.stdin.write(JSON.stringify(initWorkspaceCall) + '\n');
    }, 100);
  }, 100);

  let responseBuffer = '';
  let testStep = 0;

  server.stdout.on('data', (data) => {
    responseBuffer += data.toString();
    const lines = responseBuffer.split('\n');
    
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim();
      if (line && !line.startsWith('{')) {
        // Skip log lines
        continue;
      }
      if (line) {
        try {
          const response = JSON.parse(line);
          
          if (response.result && response.result.content && response.id === 2) {
            const content = response.result.content[0];
            if (content && content.text) {
              try {
                const toolResult = JSON.parse(content.text);
                console.log('✅ Tool Response:', toolResult);
                
                if (toolResult.session_id && toolResult.status === 'initialized') {
                  sessionId = toolResult.session_id;
                  console.log('✅ Initialize tool call successful! Session ID:', sessionId);
                  
                  // Now test finalize_coding_workspace
                  setTimeout(() => {
                    const finalizeCall = {
                      jsonrpc: '2.0',
                      id: 3,
                      method: 'tools/call',
                      params: {
                        name: 'finalize_coding_workspace',
                        arguments: {
                          session_id: sessionId,
                          completion_summary: 'Modern MCP test completed successfully',
                          files_modified: ['src/index.ts', 'test-tool-calls.cjs']
                        }
                      }
                    };
                    console.log('📤 Calling finalize_coding_workspace tool...');
                    server.stdin.write(JSON.stringify(finalizeCall) + '\n');
                  }, 500);
                }
              } catch (e) {
                console.log('📥 Non-JSON tool response:', content.text);
              }
            }
          } else if (response.result && response.result.content && response.id === 3) {
            const content = response.result.content[0];
            if (content && content.text) {
              try {
                const toolResult = JSON.parse(content.text);
                console.log('✅ Finalize Response:', toolResult);
                
                if (toolResult.status === 'finalized') {
                  console.log('✅ Finalize tool call successful!');
                  console.log('🎉 ALL TESTS PASSED - Modern MCP SDK implementation working!');
                  setTimeout(() => server.kill(), 1000);
                }
              } catch (e) {
                console.log('📥 Non-JSON finalize response:', content.text);
              }
            }
          }
        } catch (e) {
          // Likely a log line, ignore
        }
      }
    }
    
    responseBuffer = lines[lines.length - 1];
  });

  server.on('close', (code) => {
    console.log('\n🔚 Modern MCP tool call test completed');
  });

  // Cleanup after 15 seconds
  setTimeout(() => {
    server.kill();
  }, 15000);
}

testToolCalls(); 