import { createClient } from "npm:@supabase/supabase-js@2";

const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{
  status,headers:{"Content-Type":"application/json"}
});

function adminKey(){
  return JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}").default||
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
}
function safeEqual(a:string,b:string){
  if(a.length!==b.length)return false;
  let diff=0;
  for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);
  return diff===0;
}
async function plaidPost(path:string,payload:Record<string,unknown>){
  const clientId=Deno.env.get("PLAID_CLIENT_ID");
  const secret=Deno.env.get("PLAID_SECRET");
  const env=Deno.env.get("PLAID_ENV")||"production";
  if(!clientId||!secret)throw new Error("plaid_not_configured");
  const res=await fetch(`https://${env}.plaid.com${path}`,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({client_id:clientId,secret,...payload})
  });
  const body=await res.json();
  if(!res.ok)throw Object.assign(new Error("plaid_error"),{detail:body,status:res.status});
  return body;
}
async function pullTransactions(accessToken:string,startCursor:string|null){
  for(let attempt=0;attempt<2;attempt++){
    let cursor=startCursor||null;
    const added:any[]=[],modified:any[]=[],removed:any[]=[];
    let hasMore=true,pages=0,restart=false;
    while(hasMore){
      if(++pages>30)throw new Error("too_many_transaction_pages");
      const payload:any={access_token:accessToken,count:500,personal_finance_category_version:"v2"};
      if(cursor)payload.cursor=cursor;
      else if(!startCursor)payload.days_requested=365;
      try{
        const body=await plaidPost("/transactions/sync",payload);
        added.push(...(body.added||[]));
        modified.push(...(body.modified||[]));
        removed.push(...(body.removed||[]));
        cursor=body.next_cursor||cursor;
        hasMore=!!body.has_more;
      }catch(error:any){
        if(error?.detail?.error_code==="TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION"&&attempt===0){
          restart=true;break;
        }
        throw error;
      }
    }
    if(!restart)return {added,modified,removed,nextCursor:cursor};
  }
  throw new Error("transactions_sync_restart_failed");
}

Deno.serve(async(req:Request)=>{
  if(req.method!=="POST")return json({error:"method_not_allowed"},405);

  const url=Deno.env.get("SUPABASE_URL"),secretKey=adminKey();
  if(!url||!secretKey)return json({error:"server_not_configured"},500);
  const admin=createClient(url,secretKey,{auth:{persistSession:false}});

  const supplied=req.headers.get("x-daily-cron-key")||"";
  const {data:expected,error:keyError}=await admin.rpc("get_daily_cron_key");
  if(keyError||!expected||!safeEqual(supplied,String(expected)))return json({error:"unauthorized"},401);
  if(!Deno.env.get("PLAID_CLIENT_ID")||!Deno.env.get("PLAID_SECRET"))return json({error:"plaid_not_configured"},503);

  const {data:connections,error:connectionsError}=await admin
    .from("financial_connections")
    .select("id,owner_user_id,provider_item_id,transactions_cursor")
    .eq("provider","plaid");
  if(connectionsError)return json({error:"database_error",detail:connectionsError.message},500);

  const results:any[]=[];
  for(const connection of connections||[]){
    const now=new Date().toISOString(),owner=String(connection.owner_user_id);
    try{
      const {data:accessTokenValue,error:secretError}=await admin.rpc("get_financial_access_token",{
        p_connection_id:connection.id,
        p_owner_user_id:owner
      });
      if(secretError||!accessTokenValue)throw new Error("missing_access_token");
      const accessToken=String(accessTokenValue);

      // Use /accounts/get for scheduled refreshes. Unlike the Balance endpoint,
      // this endpoint is not a per-request Balance-product charge if the user
      // ever leaves Plaid's free Trial plan.
      const accountsResult=await plaidPost("/accounts/get",{access_token:accessToken});

      const accountRows=(accountsResult.accounts||[]).map((a:any)=>({
        owner_user_id:owner,
        connection_id:connection.id,
        provider_account_id:String(a.account_id),
        display_name:String(a.name||a.official_name||"Account"),
        mask:a.mask?String(a.mask):null,
        account_type:a.type?String(a.type):null,
        account_subtype:a.subtype?String(a.subtype):null,
        currency:String(a.balances?.iso_currency_code||"USD"),
        available_balance:a.balances?.available==null?null:Number(a.balances.available),
        current_balance:a.balances?.current==null?null:Number(a.balances.current),
        balance_as_of:now,
        metadata:{official_name:a.official_name||null,limit:a.balances?.limit??null},
        updated_at:now
      }));
      if(accountRows.length){
        const {error}=await admin.from("financial_accounts")
          .upsert(accountRows,{onConflict:"owner_user_id,provider_account_id"});
        if(error)throw error;
      }

      const {data:dbAccounts,error:dbAccountError}=await admin
        .from("financial_accounts")
        .select("id,provider_account_id")
        .eq("owner_user_id",owner)
        .eq("connection_id",connection.id);
      if(dbAccountError)throw dbAccountError;
      const accountMap=new Map((dbAccounts||[]).map((a:any)=>[String(a.provider_account_id),a.id]));

      const tx=await pullTransactions(accessToken,connection.transactions_cursor||null);
      const transactionRows=[...tx.added,...tx.modified].flatMap((t:any)=>{
        const accountId=accountMap.get(String(t.account_id));
        if(!accountId)return [];
        const primary=String(t.personal_finance_category?.primary||"");
        return [{
          owner_user_id:owner,
          account_id:accountId,
          provider_transaction_id:String(t.transaction_id),
          posted_date:t.date||null,
          authorized_at:t.authorized_datetime||t.authorized_date||null,
          merchant_name:t.merchant_name||null,
          name:t.name||null,
          provider_amount:Number(t.amount||0),
          currency:String(t.iso_currency_code||"USD"),
          pending:!!t.pending,
          is_transfer:primary.startsWith("TRANSFER_"),
          category_primary:primary||null,
          category_detailed:t.personal_finance_category?.detailed||null,
          metadata:{
            confidence_level:t.personal_finance_category?.confidence_level||null,
            pending_transaction_id:t.pending_transaction_id||null,
            payment_channel:t.payment_channel||null
          },
          updated_at:now
        }];
      });
      if(transactionRows.length){
        const {error}=await admin.from("financial_transactions")
          .upsert(transactionRows,{onConflict:"owner_user_id,provider_transaction_id"});
        if(error)throw error;
      }
      const removedIds=(tx.removed||[]).map((x:any)=>String(x.transaction_id)).filter(Boolean);
      if(removedIds.length){
        const {error}=await admin.from("financial_transactions")
          .delete().eq("owner_user_id",owner).in("provider_transaction_id",removedIds);
        if(error)throw error;
      }

      const {error:updateError}=await admin.from("financial_connections").update({
        transactions_cursor:tx.nextCursor||connection.transactions_cursor||null,
        last_synced_at:now,status:"linked",sync_error:null,updated_at:now
      }).eq("id",connection.id).eq("owner_user_id",owner);
      if(updateError)throw updateError;
      results.push({connection_id:connection.id,ok:true,accounts:accountRows.length,added:tx.added.length,modified:tx.modified.length,removed:removedIds.length});
    }catch(error:any){
      await admin.from("financial_connections").update({
        sync_error:error?.detail?.error_code||error?.message||"sync_failed",
        updated_at:now
      }).eq("id",connection.id).eq("owner_user_id",owner);
      results.push({connection_id:connection.id,ok:false,error:error?.detail?.error_code||error?.message||"sync_failed"});
    }
  }
  return json({ok:results.every(x=>x.ok),connections:results,ran_at:new Date().toISOString()});
});
