import {afterEach,describe,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {PersonDetail} from './V2App';

afterEach(()=>{cleanup();vi.unstubAllGlobals();});
const detail={id:'person-1',display_name:'Allan Test',lead_count:1,labels:[{id:'label-1',label:'Owner note',active:1}],identities:[{id:'identity-1',platform:'MESSENGER',external_id:'123456',profile_sync_status:'AVAILABLE',conversation_url:'https://www.facebook.com/messages/t/provider-thread'}],signals:[{signal_key:'MOVE_IN_DATE',normalized_value:'ASAP',occurrence_count:2,channels:'MESSENGER',last_seen_at:'2026-10-08T00:00:00Z'}],attention:[],leads:[{id:'lead-1',status:'QUALIFIED',interest_score:5,move_in_precision:'ASAP',duration_months:6,occupancy_count:2}]};
const props={person:{id:'person-1'},creating:false,onCreated:vi.fn(),onSaved:vi.fn(),onCancel:vi.fn()};
describe('Person dossier messaging workflow',()=>{
  it('loads full dossier, presents consolidated signals, qualification, private labels and real conversation link',async()=>{
    const fetcher=vi.fn(async()=>Response.json({data:detail}));vi.stubGlobal('fetch',fetcher);render(<PersonDetail {...props}/>);
    expect(screen.queryByRole('button',{name:'messages'})).not.toBeInTheDocument();
    await screen.findByRole('heading',{name:'Allan Test'});fireEvent.click(screen.getByRole('button',{name:'messages'}));
    expect(screen.getByText('MOVE IN DATE · ASAP')).toBeInTheDocument();expect(screen.getByText(/2 occurrence/)).toBeInTheDocument();
    expect(screen.getByText('QUALIFIED · score 5')).toBeInTheDocument();expect(screen.getByText('Owner note')).toBeInTheDocument();
    expect(screen.getByRole('link',{name:'Open conversation'})).toHaveAttribute('href',detail.identities[0].conversation_url);
    fireEvent.click(screen.getByRole('button',{name:'Refresh Messenger profile'}));
    await waitFor(()=>expect(fetcher).toHaveBeenCalledWith('/api/v2/people/person-1/messenger/sync',expect.objectContaining({method:'POST'})));
  });
  it('shows recoverable dossier loading failure rather than empty relationships',async()=>{
    vi.stubGlobal('fetch',vi.fn(async()=>Response.json({error:{message:'Failed'}},{status:500})));render(<PersonDetail {...props}/>);
    expect(await screen.findByRole('alert')).toHaveTextContent('could not be loaded');expect(screen.getByRole('button',{name:'Retry'})).toBeInTheDocument();
  });
  it('does not fabricate a link if Meta has not returned one',async()=>{
    vi.stubGlobal('fetch',vi.fn(async()=>Response.json({data:{...detail,identities:[{id:'identity-1',platform:'MESSENGER',external_id:'123456',profile_sync_status:'UNAVAILABLE'}]}})));render(<PersonDetail {...props}/>);
    await screen.findByRole('heading',{name:'Allan Test'});fireEvent.click(screen.getByRole('button',{name:'messages'}));
    expect(screen.queryByRole('link',{name:'Open conversation'})).not.toBeInTheDocument();expect(screen.getByText('Conversation link not returned by provider.')).toBeInTheDocument();
  });
});
