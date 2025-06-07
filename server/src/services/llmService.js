const fetch = require('node-fetch');
const settingsService = require('./settingsService');

class LLMService {
  constructor() {
    // Initialize with default values
    this.provider = 'openai'; // 'openai', 'ollama', or 'custom'
    this.apiKey = '';
    this.baseUrl = 'https://api.openai.com/v1';
    this.model = 'gpt-3.5-turbo';
    this.conversationHistory = new Map(); // Store conversation history by connectionId
    
    // Settings will be loaded when needed
    this.initialized = false;
  }
  
  async init(userId = null) {
    try {
      // Always re-initialize to pick up user-specific settings
      this.initialized = false;
      
      console.log(`Initializing LLM Service for user: ${userId || 'global'}`);
      
      // Load settings from database - use user-specific settings if userId is provided
      this.provider = await settingsService.getSettingValue('llm_provider', userId);
      
      // Set base URL, API key and model based on provider
      if (this.provider === 'openai') {
        this.baseUrl = 'https://api.openai.com/v1';
        this.apiKey = await settingsService.getSettingValue('openai_api_key', userId);
        this.model = await settingsService.getSettingValue('openai_model', userId);
      } else if (this.provider === 'custom') {
        this.baseUrl = await settingsService.getSettingValue('custom_api_url', userId);
        this.apiKey = await settingsService.getSettingValue('custom_api_key', userId);
        this.model = await settingsService.getSettingValue('custom_model', userId);
      } else {
        // Ollama
        this.baseUrl = await settingsService.getSettingValue('ollama_url', userId);
        this.model = await settingsService.getSettingValue('ollama_model', userId);
        // Ollama doesn't use an API key
        this.apiKey = '';
      }
      
      console.log(`LLM Provider: ${this.provider}, API key present: ${this.apiKey ? 'Yes' : 'No'}`);
      console.log(`Base URL: ${this.baseUrl}, Model: ${this.model}`);
      
      this.initialized = true;
      console.log(`LLM Service initialized with provider: ${this.provider}, model: ${this.model}`);
    } catch (error) {
      console.error('Failed to initialize LLM Service:', error);
      // Fall back to default values if settings can't be loaded
      this.initialized = false;
      throw error;
    }
  }

  async processTerminalOutput(connectionId, output, context = {}) {
    // Get or initialize conversation history
    if (!this.conversationHistory.has(connectionId)) {
      this.initializeConversation(connectionId, context);
    }
    
    const history = this.conversationHistory.get(connectionId);
    
    // Add terminal output to history if it's not empty or just whitespace
    if (output && output.trim()) {
      history.push({ role: 'user', content: `Terminal output: ${output.trim()}` });
    }
    
    // If this is a direct user prompt, add it differently
    if (context.isDirectPrompt && context.prompt) {
      history.push({ role: 'user', content: context.prompt });
    }
    
    // Keep history at reasonable size (max 20 messages)
    if (history.length > 20) {
      // Keep first system message and trim the oldest messages
      const systemMessage = history[0];
      history.splice(1, history.length - 20);
      history[0] = systemMessage;
    }
    
    // Generate response based on provider
    try {
      let response;
      if (this.provider === 'openai' || this.provider === 'custom') {
        response = await this.callOpenAI(history);
      } else {
        response = await this.callOllama(history);
      }
      
      // Process the response to determine if it's a command
      const processedResponse = this.processResponse(response);
      
      // Add the assistant's response to history - make sure to store it as a string
      if (typeof response === 'object') {
        // If response is an object, convert it to JSON string before storing
        history.push({ role: 'assistant', content: JSON.stringify(response) });
      } else {
        // If it's already a string, store as is
        history.push({ role: 'assistant', content: response });
      }
      
      return processedResponse;
    } catch (error) {
      console.error(`LLM API error: ${error.message}`);
      return {
        message: `Error: ${error.message}`,
        shouldExecuteCommand: false
      };
    }
  }
  
  initializeConversation(connectionId, context = {}) {
    // Create system prompt based on context
    const systemPrompt = this.createSystemPrompt(context);
    
    // Initialize history with system message
    this.conversationHistory.set(connectionId, [
      { role: 'system', content: systemPrompt }
    ]);
  }
  
  createSystemPrompt(context = {}) {
    // Base system prompt
    let prompt = `You are a helpful terminal assistant. You'll receive terminal output and can suggest commands or explain what's happening.
    
When specifically asked to suggest a command, use this exact format to suggest a command to run:

<#command_start#>command goes here<#command_end#>

Before suggesting any command, always:
1. Explain what the command will do
2. Explain why you're suggesting it
3. Then provide the command in the format above

IMPORTANT: 
- Only suggest commands when specifically asked for them
- Do not automatically suggest commands unless requested
- Be concise and clear
- Only suggest commands that are safe to run
- If you're unsure about something, say so rather than guessing
- Don't spam multiple commands - suggest only the most essential one needed
- For OpenAI models, your response will be formatted as a JSON object`;

    // Add session-specific context if available
    if (context.sessionData) {
      prompt += `\n\nYou're currently connected to a SSH session with these details:
- Hostname: ${context.sessionData.hostname}
- Username: ${context.sessionData.username}`;
    }
    
    // Add recent commands context if available
    if (context.lastCommands && context.lastCommands.length > 0) {
      prompt += `\n\nRecent commands executed in this session:
${context.lastCommands.map(cmd => `- ${cmd}`).join('\n')}`;
    }
    
    return prompt;
  }

  // Helper method to sanitize JSON strings before parsing
  sanitizeJsonString(jsonStr) {
    if (!jsonStr || typeof jsonStr !== 'string') {
      console.log("Invalid JSON string received:", jsonStr);
      return '{"chat_msg": "Invalid response from API"}';
    }
    
    try {
      // Try to extract just a JSON object if embedded in other text
      const jsonMatch = jsonStr.match(/{.*}/s);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }
      
      // Simple approach: just take the raw string and try to convert it to valid JSON
      // For complex JSON with nested quotes and escaping issues, the safest approach
      // is to create a new JSON object from the extracted content
      
      try {
        // First, try parsing it directly - it might already be valid
        JSON.parse(jsonStr);
        return jsonStr;
      } catch (parseError) {
        console.log("Initial parse failed, attempting to fix JSON:", parseError.message);
        
        // If parsing fails, try to extract the essential data using regex
        const chatMsgMatch = jsonStr.match(/"chat_msg"\s*:\s*"([^"]*(?:"[^"]*"[^"]*)*)"/);
        const messageMsgMatch = jsonStr.match(/"message"\s*:\s*"([^"]*(?:"[^"]*"[^"]*)*)"/);
        const commandSuggestionMatch = jsonStr.match(/"command_suggestion"\s*:\s*"([^"]*(?:"[^"]*"[^"]*)*)"/);
        const commandMatch = jsonStr.match(/"command"\s*:\s*"([^"]*(?:"[^"]*"[^"]*)*)"/);
        
        // Extract content or use defaults
        const chatMsg = 
          (chatMsgMatch && chatMsgMatch[1]) ? 
          chatMsgMatch[1].replace(/\\"/g, '"').replace(/"/g, '\\"') : 
          (messageMsgMatch && messageMsgMatch[1]) ? 
          messageMsgMatch[1].replace(/\\"/g, '"').replace(/"/g, '\\"') : 
          "Error extracting response";
        
        const commandSuggestion = 
          (commandSuggestionMatch && commandSuggestionMatch[1]) ? 
          commandSuggestionMatch[1].replace(/\\"/g, '"').replace(/"/g, '\\"') : 
          (commandMatch && commandMatch[1]) ? 
          commandMatch[1].replace(/\\"/g, '"').replace(/"/g, '\\"') : 
          "";
        
        // Create a new, clean JSON object
        const cleanJson = `{"chat_msg": "${chatMsg}", "command_suggestion": "${commandSuggestion}"}`;
        
        console.log("Clean JSON created:", cleanJson);
        
        // Verify it's valid
        JSON.parse(cleanJson);
        return cleanJson;
      }
    } catch (error) {
      console.error("Error sanitizing JSON:", error);
      
      // Always fall back to a valid JSON response with a helpful message
      return '{"chat_msg": "Error processing response from LLM"}';
    }
  }

  async callOpenAI(messages) {
    // Validate configuration based on provider
    if (this.provider === 'custom') {
      if (!this.baseUrl || this.baseUrl.trim() === '') {
        throw new Error('Custom API URL not configured');
      }
      if (!this.apiKey || this.apiKey.trim() === '') {
        throw new Error('Custom API key not configured');
      }
    } else {
      // Standard OpenAI validation
      if (!this.apiKey) {
        throw new Error('OpenAI API key not configured');
      }
    }
    
    // Clone the messages array to avoid modifying the original
    const modifiedMessages = [...messages];
    
    // Add a system message instructing the LLM to use the simplified JSON format
    // First, check if there's already a system message
    let hasSystemMessage = false;
    for (let i = 0; i < modifiedMessages.length; i++) {
      if (modifiedMessages[i].role === 'system') {
        modifiedMessages[i] = {
          role: 'system',
          content: `${modifiedMessages[i].content}\n\nAlways format your response as a simple JSON object with this structure: {"chat_msg": "Your explanation here", "command_suggestion": "command to execute (if needed)"}`
        };
        hasSystemMessage = true;
        break;
      }
    }
    
    // If no system message was found, add one
    if (!hasSystemMessage) {
      modifiedMessages.unshift({
        role: 'system',
        content: 'Always format your response as a simple JSON object with this structure: {"chat_msg": "Your explanation here", "command_suggestion": "command to execute (if needed)"}'
      });
    }
    
    // Add JSON instruction to the last user message as well to ensure "json" appears in messages
    // This is required by OpenAI when using the json_object response format
    if (modifiedMessages.length > 1 && modifiedMessages[modifiedMessages.length - 1].role === 'user') {
      const lastMessage = modifiedMessages[modifiedMessages.length - 1];
      modifiedMessages[modifiedMessages.length - 1] = {
        ...lastMessage,
        content: `${lastMessage.content}\n\nRemember to format your response as a JSON object with chat_msg and command_suggestion fields.`
      };
    }
    
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        messages: modifiedMessages,
        temperature: 0.7,
        max_tokens: 1024,
        response_format: { type: "json_object" }
      })
    });
    
    if (!response.ok) {
      let errorMessage;
      try {
        const error = await response.json();
        errorMessage = error.error?.message || response.statusText;
      } catch (e) {
        // In case the error response is not valid JSON
        errorMessage = await response.text() || response.statusText;
      }
      
      // Customize error message based on provider
      if (this.provider === 'custom') {
        throw new Error(`Custom API error: ${errorMessage}`);
      } else {
        throw new Error(`OpenAI API error: ${errorMessage}`);
      }
    }
    
    const data = await response.json();
    
    // Extract the JSON response
    try {
      const content = data.choices[0]?.message?.content || "{}";
      console.log("Raw LLM response:", content);
      
      let jsonResponse;
      try {
        // Use the sanitizer to clean up the JSON
        const cleanContent = this.sanitizeJsonString(content);
        jsonResponse = JSON.parse(cleanContent);
        console.log("Parsed JSON response:", jsonResponse);
      } catch (parseError) {
        console.error("JSON parse error:", parseError.message);
        console.error("Problematic JSON content:", content);
        
        // Create a default response with the raw content as the message
        jsonResponse = {
          chat_msg: content || "No explanation provided",
          command_suggestion: ""
        };
      }
      
      // Extract chat message and command suggestion
      // First try to get from chat_msg, but also check message as a fallback
      const chatMsg = jsonResponse.chat_msg || jsonResponse.message || "No explanation provided";
      let commandSuggestion = jsonResponse.command_suggestion || jsonResponse.command || "";
      
      // If there's a command suggestion, return it in our special format
      if (commandSuggestion && commandSuggestion.trim() !== "") {
        // Extract command from tags if present
        const commandRegex = /(?:<#command_start#>|#command_start#)(.*?)(?:<#command_end#>|#command_end#)/s;
        const commandMatch = commandSuggestion.match(commandRegex);
        
        if (commandMatch && commandMatch[1]) {
          commandSuggestion = commandMatch[1].trim();
        }
        
        console.log(`Command detected: "${commandSuggestion}"`);
        return {
          message: chatMsg,
          shouldExecuteCommand: false,
          command: commandSuggestion,
          reasoning: chatMsg,
          requiresApproval: true
        };
      } else {
        // No command suggestion
        return {
          message: chatMsg,
          shouldExecuteCommand: false
        };
      }
    } catch (error) {
      console.error("Error parsing JSON response:", error);
      // Fallback to the raw content or a default message
      return {
        message: data.choices?.[0]?.message?.content || "Error processing response",
        shouldExecuteCommand: false
      };
    }
  }

  async callOllama(messages) {
    // Add a specific instruction for structured output to the last message
    const structuredOutputInstructions = `
Please provide your response in JSON format with the following structure:
{
  "chat_msg": "Your explanation or answer to the query",
  "command_suggestion": "command to execute (if needed)"
}`;

    // Clone the messages so we don't modify the original
    const modifiedMessages = [...messages];
    
    // Add to or modify the system message
    let hasSystemMessage = false;
    for (let i = 0; i < modifiedMessages.length; i++) {
      if (modifiedMessages[i].role === 'system') {
        modifiedMessages[i] = {
          role: 'system',
          content: `${modifiedMessages[i].content}\n\nAlways format your response as a simple JSON object with this structure: {"chat_msg": "Your explanation here", "command_suggestion": "command to execute (if needed)"}`
        };
        hasSystemMessage = true;
        break;
      }
    }
    
    // If no system message was found, add one
    if (!hasSystemMessage) {
      modifiedMessages.unshift({
        role: 'system',
        content: 'Always format your response as a simple JSON object with this structure: {"chat_msg": "Your explanation here", "command_suggestion": "command to execute (if needed)"}'
      });
    }
    
    // If the last message is from the user, append our instructions
    if (modifiedMessages.length > 1 && modifiedMessages[modifiedMessages.length - 1].role === 'user') {
      const lastMessage = modifiedMessages[modifiedMessages.length - 1];
      modifiedMessages[modifiedMessages.length - 1] = {
        ...lastMessage,
        content: `${lastMessage.content}\n\n${structuredOutputInstructions}`
      };
    }
    
    // Convert the chat format to what Ollama expects
    const ollamaMessages = modifiedMessages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        messages: ollamaMessages,
        stream: false
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama API error: ${error || response.statusText}`);
    }
    
    const data = await response.json();
    const content = data.message?.content || '';
    
    console.log("Raw Ollama response:", content);
    
    // Try to parse the response as JSON
    try {
      // Extract JSON from the response - it might be surrounded by markdown code blocks
      const jsonMatch = content.match(/```(?:json)?(.*?)```/s) || content.match(/{.*}/s);
      const jsonStr = jsonMatch ? jsonMatch[0].replace(/```json?|```/g, '') : content;
      
      let jsonResponse;
      try {
        // Use the sanitizer to clean up the JSON
        const cleanContent = this.sanitizeJsonString(jsonStr);
        jsonResponse = JSON.parse(cleanContent);
        console.log("Parsed Ollama JSON response:", jsonResponse);
      } catch (parseError) {
        console.error("Ollama JSON parse error:", parseError.message);
        console.error("Problematic JSON string:", jsonStr);
        
        // Create a default response with the raw content as the message
        jsonResponse = {
          chat_msg: content || "No explanation provided",
          command_suggestion: ""
        };
      }
      
      // Extract chat message and command suggestion
      // First try to get from chat_msg, but also check message as a fallback
      const chatMsg = jsonResponse.chat_msg || jsonResponse.message || "No explanation provided";
      let commandSuggestion = jsonResponse.command_suggestion || jsonResponse.command || "";
      
      // If there's a command suggestion, return it in our special format
      if (commandSuggestion && commandSuggestion.trim() !== "") {
        // Extract command from tags if present
        const commandRegex = /(?:<#command_start#>|#command_start#)(.*?)(?:<#command_end#>|#command_end#)/s;
        const commandMatch = commandSuggestion.match(commandRegex);
        
        if (commandMatch && commandMatch[1]) {
          commandSuggestion = commandMatch[1].trim();
        }
        
        console.log(`Ollama command detected: "${commandSuggestion}"`);
        return {
          message: chatMsg,
          shouldExecuteCommand: false,
          command: commandSuggestion,
          reasoning: chatMsg,
          requiresApproval: true
        };
      } else {
        // No command suggestion
        return {
          message: chatMsg,
          shouldExecuteCommand: false
        };
      }
    } catch (error) {
      console.error("Error parsing Ollama JSON response:", error);
      // Fall back to the original response
      return {
        message: content || "Error processing response",
        shouldExecuteCommand: false
      };
    }
  }
  
  processResponse(response) {
    // First check if response is already an object (from our newer structured JSON format)
    if (typeof response === 'object' && response !== null) {
      // Response is already processed by the API-specific methods
      return response;
    }
    
    // Legacy format handling - check for command tags
    const commandRegex = /(?:<#command_start#>|#command_start#)(.*?)(?:<#command_end#>|#command_end#)/s;
    const commandMatch = response.match(commandRegex);
    
    if (commandMatch && commandMatch[1]) {
      const command = commandMatch[1].trim();
      
      // Extract the reasoning - it's the text before the command tags
      let reasoning = 'No explanation provided';
      const parts = response.split(/<#command_start#>|#command_start#/);
      if (parts.length > 1 && parts[0].trim()) {
        // Use the text before the command as reasoning
        reasoning = parts[0].trim();
      }
      
      console.log(`Command detected (legacy format): "${command}"`);
      console.log(`Reasoning: "${reasoning}"`);
      
      // Clean the response to remove the tags for display
      const cleanedMessage = response.replace(/<#command_start#>|<#command_end#>|#command_start#|#command_end#/g, '');
      
      return {
        message: cleanedMessage,
        shouldExecuteCommand: false,
        command,
        reasoning,
        requiresApproval: true
      };
    }
    
    // Try to parse the response as JSON (for older calls that might return JSON strings)
    try {
      if (typeof response === 'string' && (response.startsWith('{') || response.includes('{'))) {
        const jsonMatch = response.match(/{.*}/s);
        if (jsonMatch) {
          let jsonResponse;
          try {
            // Use the sanitizer to clean up the JSON
            const cleanContent = this.sanitizeJsonString(jsonMatch[0]);
            jsonResponse = JSON.parse(cleanContent);
          } catch (parseError) {
            console.error("Error parsing legacy JSON response:", parseError);
            console.error("Problematic JSON content:", jsonMatch[0]);
            // Continue to the next handler - will return raw text response
            throw parseError;
          }
          
          if (jsonResponse.chat_msg || jsonResponse.message || jsonResponse.command_suggestion || jsonResponse.command) {
            // It's our newer format
            const chatMsg = jsonResponse.chat_msg || jsonResponse.message || "No explanation provided";
            let commandSuggestion = jsonResponse.command_suggestion || jsonResponse.command || "";
            
            if (commandSuggestion && commandSuggestion.trim() !== "") {
              // Extract command from tags if present
              const commandRegex = /(?:<#command_start#>|#command_start#)(.*?)(?:<#command_end#>|#command_end#)/s;
              const commandMatch = commandSuggestion.match(commandRegex);
              
              if (commandMatch && commandMatch[1]) {
                commandSuggestion = commandMatch[1].trim();
              }
              
              console.log(`Command detected (JSON format): "${commandSuggestion}"`);
              return {
                message: chatMsg,
                shouldExecuteCommand: false,
                command: commandSuggestion,
                reasoning: chatMsg,
                requiresApproval: true
              };
            } else {
              return {
                message: chatMsg,
                shouldExecuteCommand: false
              };
            }
          }
        }
      }
    } catch (error) {
      console.error("Error trying to parse response as JSON:", error);
    }
    
    // No command found, just return the message
    return {
      message: response,
      shouldExecuteCommand: false
    };
  }

  clearConversationHistory(connectionId) {
    this.conversationHistory.delete(connectionId);
  }
  
  getSettings() {
    return {
      provider: this.provider,
      model: this.model,
      available_providers: ['openai', 'ollama', 'custom'],
      available_models: {
        openai: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo', 'gpt-4o', 'gpt-4o-mini'],
        ollama: ['llama2', 'mistral', 'orca-mini'],
        custom: ['gpt-3.5-turbo', 'gpt-4', 'claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku', 'gemini-pro']
      }
    };
  }
}

module.exports = new LLMService();
