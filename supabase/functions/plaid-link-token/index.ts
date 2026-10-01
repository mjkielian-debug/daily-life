import { createClient } from "npm:@supabase/supabase-js@2";

const cors={
  "Access-Control-Allow-Origin":"https://mjkielian-debug.github.io",
  "Access-Control-Allow-Headers":"authorization, apikey, content-type",
  "Access-Control-Allow-Methods":"POST, OPTIONS",
  "Content-Type":"application/json",
};

const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:cors});

function supabaseKeys(){
  const pub=JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")||"{}").default||Deno.env.get("SUPABASE_ANON_KEY");
  const secret=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}").default||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  return {pub,secret};
}

async function authenticatedUser(req:Request){
  const auth=req.headers.get("Authorization")||"";
  if(!auth.startsWith("Bearer "))return null;
  const {pub}=supabaseKeys(),url=Deno.env.get("SUPABASE_URL");
  if(!pub||!url)return null;
  const client=createClient(url,pub,{global:{headers:{Authorization:auth}},auth:{persistSession:false}});
  const {data,error}=await client.auth.getUser();
  return error?null:data.user;
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return json({error:"method_not_allowed"},405);

  const user=await authenticatedUser(req);
  if(!user)return json({error:"unauthorized"},401);

  const clientId=Deno.env.get("PLAID_CLIENT_ID");
  const secret=Deno.env.get("PLAID_SECRET");
  const plaidEnv=Deno.env.get("PLAID_ENV")||"production";
  if(!clientId||!secret)return json({error:"plaid_not_configured"},503);

  let input:any={};
  try{input=await req.json()}catch{}
  const mode=input?.mode==="investment"?"investment":"bank";
  const linkRequest:any={
    client_id:clientId,
    secret,
    client_name:"Daily Life",
    language:"en",
    country_codes:["US"],
    user:{client_user_id:user.id},
    redirect_uri:"https://mjkielian-debug.github.io/daily-life/"
  };
  if(mode==="investment"){
    linkRequest.products=["investments"];
  }else{
    linkRequest.products=["transactions"];
    linkRequest.optional_products=["liabilities"];
    linkRequest.transactions={days_requested:365};
  }

  const response=await fetch(`https://${plaidEnv}.plaid.com/link/token/create`,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(linkRequest)
  });

  const body=await response.json();
  if(!response.ok)return json({error:"plaid_error",detail:body},response.status);
  return json({link_token:body.link_token,expiration:body.expiration,mode});
});
