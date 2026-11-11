import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseMessengerInbound, MessengerSendAdapter } from '../apps/worker/src/messenger';

describe('Messenger adapter safety',()=>{
  afterEach(()=>vi.unstubAllGlobals());
  it('parses text messages and native postbacks',()=>{
    const result=parseMessengerInbound({object:'page',entry:[{messaging:[{sender:{id:'psid-1'},message:{mid:'m1',text:'available?'}},{sender:{id:'psid-2'},postback:{mid:'p1',payload:'DURATION_3'}},{message:{text:'missing sender'}}]}]});
    expect(result).toEqual([{senderId:'psid-1',messageId:'m1',text:'available?'},{senderId:'psid-2',messageId:'p1',text:'DURATION_3'}]);
  });
  it('preserves the native quick-reply payload rather than interpreting its visible title',()=>{
    const result=parseMessengerInbound({object:'page',entry:[{messaging:[{sender:{id:'psid'},message:{mid:'selection',text:'ASAP',quick_reply:{payload:'MOVE_IN_ASAP'}}}]}]});
    expect(result).toEqual([{senderId:'psid',messageId:'selection',text:'MOVE_IN_ASAP'}]);
  });
  it('does not call the Send API without a page token',async()=>{
    const result=await new MessengerSendAdapter().sendText('psid-1','hello');
    expect(result).toEqual({sent:false,reason:'MISSING_PAGE_TOKEN'});
  });
  it('ignores echoes, unsupported objects, empty messages and invalid timestamps',()=>{
    expect(parseMessengerInbound({object:'instagram',entry:[]})).toEqual([]);
    expect(parseMessengerInbound({object:'page',entry:[{messaging:[
      {sender:{id:'page'},message:{text:'echo',is_echo:true}},
      {sender:{id:'user'},message:{text:' '}},
      {sender:{id:'user'},timestamp:Infinity,message:{text:'hi'}},
    ]}]})).toEqual([]);
  });
  it('only accepts messages addressed to the configured Page',()=>{
    const message={sender:{id:'user'},recipient:{id:'123'},message:{mid:'m1',text:'hm?'}};
    expect(parseMessengerInbound({object:'page',entry:[{id:'123',messaging:[message]}]},'123')).toHaveLength(1);
    expect(parseMessengerInbound({object:'page',entry:[{id:'456',messaging:[message]}]},'123')).toEqual([]);
    expect(parseMessengerInbound({object:'page',entry:[{id:'123',messaging:[{...message,recipient:{id:'456'}}]}]},'123')).toEqual([]);
  });
  it('sends a response with a Bearer credential, never a token in the URL',async()=>{
    const transport=vi.fn().mockResolvedValue(Response.json({message_id:'outbound-1'})); vi.stubGlobal('fetch',transport);
    expect(await new MessengerSendAdapter('synthetic-token','v26.0','123').sendText('psid-1','hello')).toEqual({sent:true});
    const [url,options]=transport.mock.calls[0];
    expect(url).toBe('https://graph.facebook.com/v26.0/123/messages');
    expect(options.headers.authorization).toBe('Bearer synthetic-token');
    expect(JSON.parse(options.body)).toEqual({messaging_type:'RESPONSE',recipient:{id:'psid-1'},message:{text:'hello'}});
  });
  it('sends native quick replies without exposing the token',async()=>{
    const transport=vi.fn().mockResolvedValue(Response.json({message_id:'prompt-1'})); vi.stubGlobal('fetch',transport);
    expect(await new MessengerSendAdapter('synthetic-token','v26.0','123').sendPrompt('psid-1','How long?',[
      {title:'3 months',payload:'DURATION_3'},
      {title:'6 months',payload:'DURATION_6'},
      {title:'1 year',payload:'DURATION_12'},
    ])).toEqual({sent:true});
    const request=transport.mock.calls[0][1]; const body=JSON.parse(request.body);
    expect(body.message.quick_replies).toEqual([
      {content_type:'text',title:'3 months',payload:'DURATION_3'},
      {content_type:'text',title:'6 months',payload:'DURATION_6'},
      {content_type:'text',title:'1 year',payload:'DURATION_12'},
    ]);
    expect(String(transport.mock.calls[0][0])).not.toContain('synthetic-token');
  });
  it('reports API denial without exposing the error body',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({error:{message:'sensitive provider detail'}},{status:403})));
    expect(await new MessengerSendAdapter('synthetic-token').sendText('psid-1','hello')).toEqual({sent:false,reason:'SEND_FAILED_403'});
  });
  it('does not retry an uncertain send and risk a duplicate reply',async()=>{
    const transport=vi.fn().mockRejectedValue(new Error('synthetic network failure')); vi.stubGlobal('fetch',transport);
    expect(await new MessengerSendAdapter('synthetic-token').sendText('psid-1','hello')).toEqual({sent:false,reason:'SEND_UNCERTAIN'});
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it('requires a returned message ID before treating a send as successful',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({success:true})));
    expect(await new MessengerSendAdapter('synthetic-token').sendText('psid-1','hello')).toEqual({sent:false,reason:'SEND_UNCERTAIN'});
  });
  it('rejects injected Graph configuration before sending',async()=>{
    const transport=vi.fn();vi.stubGlobal('fetch',transport);
    expect((await new MessengerSendAdapter('synthetic-token','../evil').sendText('psid-1','hello')).sent).toBe(false);
    expect(transport).not.toHaveBeenCalled();
  });
});
