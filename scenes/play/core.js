/* Shared deterministic rules; no browser or host capabilities. */
(function(root){
'use strict';
const datePattern=/^\d{4}-\d{2}-\d{2}$/;
function dayNumber(day){if(!datePattern.test(day))throw Error('Invalid local date');const n=Date.parse(day+'T12:00:00Z');if(!Number.isFinite(n)||new Date(n).toISOString().slice(0,10)!==day)throw Error('Invalid local date');return Math.floor(n/86400000);}
function dailyIndex(day,length){if(!Number.isInteger(length)||length<1)throw Error('Empty content');return ((dayNumber(day)-dayNumber('2026-01-01'))%length+length)%length;}
function today(d=new Date()){return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');}
function feedback(answer,guess){answer=answer.toUpperCase();guess=guess.toUpperCase();if(!/^[A-Z]{5}$/.test(answer)||!/^[A-Z]{5}$/.test(guess))throw Error('Five letters required');const out=Array(5).fill('absent'),remaining={};for(let i=0;i<5;i++){if(guess[i]===answer[i])out[i]='exact';else remaining[answer[i]]=(remaining[answer[i]]||0)+1;}for(let i=0;i<5;i++)if(out[i]!=='exact'&&remaining[guess[i]]){out[i]='present';remaining[guess[i]]--;}return out;}
function checkCrossword(solution,entry,indices){return (indices||[...solution].map((_,i)=>i)).filter(i=>solution[i]!=='#').map(i=>({i,correct:(entry[i]||'').toUpperCase()===solution[i]}));}
function revealCrossword(solution,entry,indices){const result=[...entry];for(const {i} of checkCrossword(solution,entry,indices))result[i]=solution[i];return {entry:result,assisted:true};}
function completeCrossword(solution,entry){return checkCrossword(solution,entry).every(c=>c.correct);}
function streak(previous,day){return {day,count:previous?.day===day?previous.count:previous&&dayNumber(day)-dayNumber(previous.day)===1?previous.count+1:1};}
function titleKey(s){return s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu,' ').split(/\s+/).filter(Boolean);}
function dedupe(items){const result=[];for(const item of [...items].sort((a,b)=>Date.parse(b.published)-Date.parse(a.published))){const a=new Set(titleKey(item.title));if(!result.some(b=>{if(b.link===item.link)return true;const t=new Set(titleKey(b.title));const common=[...a].filter(w=>t.has(w)).length;return common/Math.max(a.size,t.size,1)>=.85;}))result.push(item);}return result;}
const api={dayNumber,dailyIndex,today,feedback,checkCrossword,revealCrossword,completeCrossword,streak,dedupe};if(typeof module!=='undefined')module.exports=api;else root.PlayCore=api;
})(typeof window!=='undefined'?window:globalThis);
