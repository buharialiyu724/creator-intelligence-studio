/**
 * Creator Intelligence Studio — Cloudflare Worker
 * Secrets: OPENAI_API_KEY, ANTHROPIC_API_KEY, YOUTUBE_API_KEY
 * Optional variables: OPENAI_MODEL (default gpt-4.1-mini),
 * ANTHROPIC_MODEL (default claude-3-5-haiku-latest), APP_ORIGIN
 *
 * Live website research requires a search provider. This Worker intentionally
 * does not pretend to have web access without one. Add your own licensed search
 * API integration to the research action before enabling it.
 */
const cors = origin => ({
  "Access-Control-Allow-Origin": origin || "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Vary": "Origin"
});
const json = (data, status=200, headers={}) => new Response(JSON.stringify(data), {
  status, headers: { "Content-Type":"application/json; charset=utf-8", ...headers }
});
export default {
 async fetch(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = env.APP_ORIGIN || "";
  const headers = cors(allowed || origin || "*");
  if (request.method === "OPTIONS") return new Response(null,{status:204,headers});
  if (request.method !== "POST") return json({error:"Use POST with a JSON body."},405,headers);
  if (allowed && origin && origin !== allowed) return json({error:"Origin not allowed."},403,headers);
  let body;
  try { body = await request.json(); } catch { return json({error:"Invalid JSON body."},400,headers); }
  try {
   let data;
   switch(body.action) {
    case "assistant": data = await aiAnswer(body,env); break;
    case "niche": data = await aiAnswer({...body,provider:"openai",task:"Act as a careful YouTube strategy analyst. Analyze this niche as a hypothesis. Separate evidence from assumptions. Do not invent current search volumes, CPM, RPM, or competitor metrics. Give audience, content pillars, competition validation plan, monetization possibilities, production difficulty, risks, 10 video ideas, and a 30-day test plan.",prompt:JSON.stringify(body)},env); break;
    case "script": data = await aiAnswer({...body,provider:"openai",task:body.task||"Build a detailed YouTube long-form script.",prompt:JSON.stringify(body)},env); break;
    case "youtube": data = await youtubeLookup(body,env); break;
    case "research": return json({error:"Live web research is not configured. Add a licensed search provider integration to this Worker, or use the built-in Google, YouTube and Trends links."},501,headers);
    default: return json({error:"Unknown action."},400,headers);
   }
   return json(data,200,headers);
  } catch(e) { return json({error:cleanError(e)},e.status||500,headers); }
 }
};
function cleanError(e){const s=String(e?.message||e||"Request failed");if(/api.?key|secret/i.test(s))return "API authentication failed. Check the relevant Worker secret and redeploy.";return s.slice(0,500);}
async function aiAnswer(body,env){
 const provider=body.provider||"openai";
 const system=`You are Creator Intelligence Studio, an expert YouTube strategist, careful researcher and script editor. Be concrete and useful. Never fabricate statistics, live trends, sources, quotations, or private channel metrics. Mark assumptions and recommend verification for factual claims. The user request is: ${body.task||"Help the creator."}`;
 const prompt=typeof body.prompt==="string"?body.prompt:JSON.stringify(body);
 if(provider==="anthropic"){
  if(!env.ANTHROPIC_API_KEY)throw new Error("Missing ANTHROPIC_API_KEY secret in Cloudflare Worker.");
  const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"content-type":"application/json","x-api-key":env.ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01"},body:JSON.stringify({model:env.ANTHROPIC_MODEL||"claude-3-5-haiku-latest",max_tokens:6000,system,messages:[{role:"user",content:prompt}]})});
  const d=await r.json();if(!r.ok)throw new Error(d.error?.message||`Anthropic request failed (${r.status})`);
  return {text:(d.content||[]).filter(x=>x.type==="text").map(x=>x.text).join("\n")};
 }
 if(!env.OPENAI_API_KEY)throw new Error("Missing OPENAI_API_KEY secret in Cloudflare Worker.");
 const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"content-type":"application/json","authorization":`Bearer ${env.OPENAI_API_KEY}`},body:JSON.stringify({model:env.OPENAI_MODEL||"gpt-4.1-mini",instructions:system,input:prompt,max_output_tokens:6000})});
 const d=await r.json();if(!r.ok)throw new Error(d.error?.message||`OpenAI request failed (${r.status})`);
 const text=d.output?.flatMap(x=>x.content||[]).filter(x=>x.type==="output_text").map(x=>x.text).join("\n")||d.output_text;
 if(!text)throw new Error("The AI provider returned no text.");
 return {text};
}
async function youtubeLookup(input,env){
 if(!env.YOUTUBE_API_KEY)throw new Error("Missing YOUTUBE_API_KEY secret. Enable YouTube Data API v3 in Google Cloud, then add the key to Cloudflare.");
 const parsed=input;
 let channelId=parsed.channelId||"";
 if(!channelId && parsed.handle){
  const h=await yt("channels",{part:"snippet,statistics,contentDetails",forHandle:parsed.handle},env);
  channelId=h.items?.[0]?.id||"";
 }
 if(!channelId && parsed.custom){
  const h=await yt("search",{part:"snippet",type:"channel",q:parsed.custom,maxResults:"1"},env);
  channelId=h.items?.[0]?.snippet?.channelId||"";
 }
 if(parsed.videoId){
  const v=await yt("videos",{part:"snippet,statistics",id:parsed.videoId},env);
  const item=v.items?.[0];if(!item)throw new Error("Video not found or unavailable.");
  return {title:item.snippet?.title,description:item.snippet?.description,publishedAt:item.snippet?.publishedAt,videoViews:item.statistics?.viewCount,likes:item.statistics?.likeCount,comments:item.statistics?.commentCount,items:[{id:item.id,title:item.snippet?.title,views:item.statistics?.viewCount}]};
 }
 if(!channelId)throw new Error("Could not resolve the channel from this URL. Try a /channel/UC… URL or an @handle URL.");
 const c=await yt("channels",{part:"snippet,statistics,contentDetails",id:channelId},env);
 const item=c.items?.[0];if(!item)throw new Error("Channel not found.");
 const uploads=item.contentDetails?.relatedPlaylists?.uploads;
 let videos=[];
 if(uploads){const p=await yt("playlistItems",{part:"snippet,contentDetails",playlistId:uploads,maxResults:"10"},env);const ids=(p.items||[]).map(x=>x.contentDetails?.videoId).filter(Boolean);if(ids.length){const vd=await yt("videos",{part:"snippet,statistics",id:ids.join(",")},env);videos=(vd.items||[]).map(v=>({id:v.id,title:v.snippet?.title,views:v.statistics?.viewCount,publishedAt:v.snippet?.publishedAt}));}}
 return {title:item.snippet?.title,description:item.snippet?.description,publishedAt:item.snippet?.publishedAt,subscribers:item.statistics?.subscriberCount,views:item.statistics?.viewCount,videoCount:item.statistics?.videoCount,items:videos};
}
async function yt(resource,params,env){const u=new URL(`https://www.googleapis.com/youtube/v3/${resource}`);for(const [k,v] of Object.entries({...params,key:env.YOUTUBE_API_KEY}))if(v!==undefined&&v!=="")u.searchParams.set(k,String(v));const r=await fetch(u);const d=await r.json();if(!r.ok)throw new Error(d.error?.message||`YouTube API request failed (${r.status})`);return d;}
