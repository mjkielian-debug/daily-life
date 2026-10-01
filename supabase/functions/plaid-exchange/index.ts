import { createClient } from "npm:@supabase/supabase-js@2";

const cors={
  "Access-Control-Allow-Origin":"https://mjkielian-debug.github.io",
  "Access-Control-Allow-Headers":"authorization, apikey, content-type",
  "Access-Control-Allow-Methods":"POST, OPTIONS",
  "Content-Type":"application/json",
};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:cors});

function publicKey(){
  return JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")||"{}").default||Deno.env.get("SUPABASE_ANON_KEY");
}
function adminKey(){
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
}
async function authenticatedUser(req:Request){
  const auth=req.headers.get("Authorization")||"";
  const url=Deno.env.get("SUPABASE_URL"),pub=publicKey();
  if(!auth.startsWith("Bearer ")||!url||!pub)return null;
  const client=createClient(url,pub,{global:{headers:{Authorization:auth}},auth:{persistSession:false}});
  const {data,error}=await client.auth.getUser();
  return error?null:data.user;
}
async function plaidPost(path:string,payload:Record<string,unknown>){
  const clientId=Deno.env.get("PLAID_CLIENT_ID");
  const secret=Deno.env.get("PLAID_SECRET");
  const env=Deno.env.get("PLAID_ENV")||"production";
  if(!clientId||!secret)throw new Error("plaid_not_configured");
  const res=await fetch(`https://${env}.plaid.com${path}`,{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({client_id:clientId,secret,...payload})
  });
  const body=await res.json();
  if(!res.ok)throw Object.assign(new Error("plaid_error"),{detail:body,status:res.status});
  return body;
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return json({error:"method_not_allowed"},405);
  const user=await authenticatedUser(req);
  if(!user)return json({error:"unauthorized"},401);

  let input:any;
  try{input=await req.json()}catch{return json({error:"invalid_json"},400)}
  const publicToken=String(input?.public_token||"");
  if(!publicToken)return json({error:"missing_public_token"},400);

  const url=Deno.env.get("SUPABASE_URL"),serviceKey=adminKey();
  if(!url||!serviceKey)return json({error:"server_not_configured"},500);
  const admin=createClient(url,serviceKey,{auth:{persistSession:false}});

  try{
    const exchanged=await plaidPost("/item/public_token/exchange",{public_token:publicToken});
    const accessToken=String(exchanged.access_token);
    const itemId=String(exchanged.item_id);
    const institutionName=String(input?.institution_name||"").trim()||null;

    const accountsResult=await plaidPost("/accounts/get",{access_token:accessToken});
    const now=new Date().toISOString();

    const {data:connection,error:connectionError}=await admin
      .from("financial_connections")
      .upsert({
        owner_user_id:user.id,
        provider:"plaid",
        provider_item_id:itemId,
        institution_name:institutionName,
        status:"linked",
        last_synced_at:now,
        sync_error:null,
        updated_at:now
      },{onConflict:"owner_user_id,provider,provider_item_id"})
      .select("id")
      .single();
    if(connectionError)throw connectionError;

    const {error:secretError}=await admin.from("financial_connection_secrets").upsert({
      connection_id:connection.id,
      owner_user_id:user.id,
      access_token:accessToken,
      updated_at:now
    },{onConflict:"connection_id"});
    if(secretError)throw secretError;

    const rows=(accountsResult.accounts||[]).map((a:any)=>({
      owner_user_id:user.id,
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
      metadata:{official_name:a.official_name||null},
      updated_at:now
    }));
    if(rows.length){
      const {error:accountsError}=await admin.from("financial_accounts")
        .upsert(rows,{onConflict:"owner_user_id,provider_account_id"});
      if(accountsError)throw accountsError;
    }

    return json({ok:true,connection_id:connection.id,item_id:itemId,accounts:rows.length});
  }catch(error:any){
    if(error?.message==="plaid_not_configured")return json({error:"plaid_not_configured"},503);
    if(error?.message==="plaid_error")return json({error:"plaid_error",detail:error.detail},error.status||502);
    return json({error:"exchange_failed",detail:error?.message||"Unknown error"},500);
  }
});
