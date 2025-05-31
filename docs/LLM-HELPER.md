# LLM Terminal Assistant

The LLM Terminal Assistant is a feature that provides AI-powered assistance for terminal sessions in IntelliSSH. It can analyze terminal output, suggest commands, and help troubleshoot issues in real-time.

## Features

- **Auto Command Suggestions**: The assistant can suggest commands based on terminal output
- **Manual Prompting**: Ask questions or request specific help directly
- **Command Execution with Approval**: Only execute commands after user review and approval
- **Structured Outputs**: Uses OpenAI function calling and JSON schemas for reliable, consistent responses
- **Support for Multiple LLM Providers**: Use either OpenAI API or Ollama
- **Configurable**: Easily toggle the assistant on/off or change settings

## Setup

### Prerequisites

To use the LLM Terminal Assistant, you'll need either:

1. An OpenAI API key (for using GPT models)
2. Ollama running locally (for using open-source models)

### Configuration

1. Copy the `.env.example` file to `.env` in the server directory:

```bash
cp webssh-control/server/.env.example webssh-control/server/.env
```

2. Configure the LLM settings in your `.env` file:

```
# LLM Helper Configuration
LLM_PROVIDER=openai  # openai or ollama
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-3.5-turbo
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama2
```

3. If using Ollama, make sure it's installed and running:

```bash
# For Ollama (https://ollama.ai)
ollama run llama2  # or any other model you prefer
```

## Usage

### Enabling the Assistant

1. Connect to an SSH session in IntelliSSH
2. The LLM Terminal Assistant panel will appear on the right side
3. Toggle the switch to enable the assistant

### Manual Prompts

You can ask the assistant questions or request specific help:

1. Type your question in the text input at the bottom of the assistant panel
2. Click "Send" to submit your question
3. The assistant will respond and may suggest commands

### Command Execution with Approval

When the assistant suggests a command:

1. The command will be displayed with an explanation
2. You'll see "Approve" and "Reject" buttons for the suggested command
3. If you click "Execute Command", the command will be run in the terminal
4. If you click "Reject", the command will be discarded
5. All suggestions, approvals, and rejections are logged in the assistant's history

This approval workflow ensures that you always have control over what commands are executed, while still benefiting from the assistant's suggestions.

### Troubleshooting

If you encounter issues:

- Check that your API key is correct (for OpenAI)
- Verify that Ollama is running (for Ollama)
- Check the server logs for any errors
- Try disabling and re-enabling the assistant

## Models

### OpenAI

- Requires an API key
- Supported models: gpt-3.5-turbo, gpt-4
- More accurate but requires internet connection and has usage costs

### Ollama

- Runs locally, no API key required
- Supported models: llama2, mistral, orca-mini
- Free to use but may be less accurate than OpenAI models
- Requires more system resources

## Security Considerations

- The terminal output is sent to the LLM for processing
- If using OpenAI, data leaves your system - consider privacy implications
- With Ollama, everything stays local but requires more computing resources
- The assistant will never execute destructive commands without explicit permission
- Always review suggested commands before they're executed

## Examples

### Getting Help with a Command

If you're unsure how to use a command, ask the assistant:

```
How do I search for files containing specific text?
```

### Troubleshooting Errors

If you encounter an error, the assistant can help explain it:

```
Why am I getting "permission denied" when trying to access this file?
```

### Learning about System Status

The assistant can help interpret system information:

```
What does this CPU usage information mean?
