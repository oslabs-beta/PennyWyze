import Anthropic from '@anthropic-ai/sdk';
import 'dotenv/config';

const client = new Anthropic();

const response = await client.messages.create({
  model: 'claude-haiku-4-5-20251001',
  max_tokens: 50,
  temperature: 0,
  messages: [
    {
      role: 'user',
      content: 'What is 2 + 2? Answer with only the number.',
    },
  ],
});

console.dir(response, { depth: null });

/* {
  model: 'claude-opus-5',
  id: 'msg_011CdyweXZEgHh1D39hJPV3d',
  type: 'message',
  role: 'assistant',
  content: [ { type: 'text', text: '4' } ],
  stop_reason: 'end_turn',
  stop_sequence: null,
  stop_details: null,
  usage: {
    input_tokens: 23,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
    cache_creation: { ephemeral_5m_input_tokens: 0, ephemeral_1h_input_tokens: 0 },
    output_tokens: 3,
    output_tokens_details: { thinking_tokens: 0 },
    service_tier: 'standard',
    inference_geo: 'global'
  }
}
{
  model: 'claude-sonnet-5',
  id: 'msg_011Cdyxi6rfaf81PXw47YDLj',
  type: 'message',
  role: 'assistant',
  content: [ { type: 'text', text: '4' } ],
  stop_reason: 'end_turn',
  stop_sequence: null,
  stop_details: null,
  usage: {
    input_tokens: 23,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
    cache_creation: { ephemeral_5m_input_tokens: 0, ephemeral_1h_input_tokens: 0 },
    output_tokens: 3,
    output_tokens_details: { thinking_tokens: 0 },
    service_tier: 'standard',
    inference_geo: 'global'
  }
}
  {
  model: 'claude-haiku-4-5-20251001',
  id: 'msg_011CdyxxpnwpnJAjGmwosL5u',
  type: 'message',
  role: 'assistant',
  content: [ { type: 'text', text: '4' } ],
  stop_reason: 'end_turn',
  stop_sequence: null,
  stop_details: null,
  usage: {
    input_tokens: 22,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
    cache_creation: { ephemeral_5m_input_tokens: 0, ephemeral_1h_input_tokens: 0 },
    output_tokens: 5,
    service_tier: 'standard',
    inference_geo: 'not_available'
  }
}*/
