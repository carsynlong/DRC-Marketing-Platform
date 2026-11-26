/* ================= Game-page helper (loaded by memes.js on the three games' phones and showtime.js on their TVs) =================
   - The announcer says "game maker" and the nicknames the way the family wants them said.
   - Phones and game TVs show everyone's nickname instead of their real name.
   Phone sabotage (freeze, mutt bite, fog, flip, tracker jackers) was retired: nothing pops up on anyone's phone anymore. */
(() => {
  if (window.__sabotage) return; window.__sabotage = true;
  // The announcer says "Game maker", not "Gamemaker"
  (function(){const O=window.SpeechSynthesisUtterance;if(!O||O.__gm)return;
    const SAY={Jessie:"Lucky PomPoms",Tinsley:"Pee Pee Balls",Grandad:"Grandad the Ancient and Wise",Dash:"Chad Thundercock",Jonny:"Humble Pie One",Natalie:"Buzz Buzz",Elisha:"Bye Felicia",Kamdon:"Big Daddy Kam",Brandon:"Iron Balls the Third",Kyle:"Kachow",Carsyn:"Clo",Caleb:"Cable"};
    const NR=/\b(Jessie|Tinsley|Grandad(?! the Ancient)|Dash|Jonny|Natalie|Elisha|Kamdon|Brandon|Kyle|Carsyn|Caleb)\b/g;
    const W=function(t){return new O(typeof t==="string"?t.replace(/\bgame\s?maker(s?)\b/gi,(m,s)=>"game maker"+s).replace(/Iron Balls III/g,"Iron Balls the Third").replace(/HumblePie1/g,"Humble Pie One").replace(NR,m=>SAY[m]).replace(/\bKachow\b/gi,"Kuh-chow").replace(/\bClo\b/g,"C.Lo"):t)};W.prototype=O.prototype;W.__gm=true;window.SpeechSynthesisUtterance=W})();

  // Phones AND game TVs show everyone's nickname instead of their real name (text only: the games still use real names underneath,
  // and typed answers are matched against the game's data, never the screen). Scripts, styles and typing boxes are left alone.
  (() => {
    const AKA = { Jessie: "Lucky PomPoms", Tinsley: "Pee Pee Balls", Grandad: "Grandad the Ancient and Wise", Dash: "Chad Thundercock", Jonny: "HumblePie1", Natalie: "Buzz Buzz", Elisha: "Bye Felicia", Kamdon: "Big Daddy Kam", Brandon: "Iron Balls III", Kyle: "Kachow", Carsyn: "Clo", Caleb: "Cable" };
    const re = /\b(Jessie|Tinsley|Grandad(?! the Ancient)|Dash|Jonny|Natalie|Elisha|Kamdon|Brandon|Kyle|Carsyn|Caleb)\b/g, skip = n => n && /^(SCRIPT|STYLE|TEXTAREA|INPUT|NOSCRIPT)$/.test(n.nodeName);
    const swap = t => { if (skip(t.parentNode)) return; const v = t.nodeValue; if (v && re.test(v)) { re.lastIndex = 0; t.nodeValue = v.replace(re, m => AKA[m]); } re.lastIndex = 0; };
    const fix = node => { if (node.nodeType === 3) return swap(node); if (node.nodeType !== 1 || skip(node)) return;
      const w = document.createTreeWalker(node, NodeFilter.SHOW_TEXT); let t; while ((t = w.nextNode())) swap(t); };
    fix(document.body);
    new MutationObserver(ms => ms.forEach(m => m.type === "characterData" ? fix(m.target) : m.addedNodes.forEach(fix))).observe(document.body, { childList: true, subtree: true, characterData: true });
  })();
})();
