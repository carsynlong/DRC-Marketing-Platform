/* 🎙️ FULL WALKTHROUGH for the screen games (Who's That Tribute, District Feud, District Secrets).
   The "🎙️ Full walkthrough" button on each game's lobby opens one of these with briefing.js: every step is read out
   in the Capitol Escort voice (recorded lines in /xmas/voice-escort/, played by escort.js).
   It only shows a briefing: no game state, saves or phone sync are touched.
   Steps: [icon, text shown (HTML ok), text spoken]. If you change a spoken line, it needs a new recording
   (otherwise that line falls back to the browser voice). */
(() => {
  if (window.Walkthrough) return;
  const css = document.createElement("style");
  css.textContent = ".brf.wt .st{font-size:clamp(.92rem,1.25vw,1.12rem);padding:7px 12px}.brf.wt .in{gap:9px}";
  document.head.appendChild(css);
  const W = {
    wtt: {
      eyebrow: "🎙️ FULL WALKTHROUGH", title: "Who's That Tribute: How It All Works",
      intro: "Welcome to Who's That Tribute. Here's the full walkthrough, straight from the Capitol.",
      outro: "That's Who's That Tribute. May the odds be ever in your favor.",
      steps: [
        ["🎯", "<b>The goal:</b> name the mystery tribute. Most points at the end wins the <b>major award</b>.", "The goal: name the mystery tribute. Most points at the end wins the major award."],
        ["📸", "Each face starts <b>zoomed way in</b>, then slowly zooms out. <b>10 seconds</b> to look, then <b>one minute</b> to answer. Halfway through, a <b>hint</b> pops up.", "Each face starts zoomed way in, then slowly zooms out. You get ten seconds to look, then one minute to answer. Halfway through, a hint pops up."],
        ["📱", "On your phone, <b>type the name</b> and tap <b>Lock it in</b>. Nicknames count. Nobody else sees your answer.", "On your phone, type the name and tap Lock it in. Nicknames count. Nobody else sees your answer."],
        ["✅", "A right answer is worth <b>1,000 points</b>.", "A right answer is worth one thousand points."],
        ["⚡", "<b>Speed bonus:</b> the faster you lock in a right answer, the more you get. Up to <b>+500</b>.", "Speed bonus: the faster you lock in a right answer, the more you get. Up to five hundred extra."],
        ["🔥", "<b>Streak bonus:</b> every right answer in a row adds <b>+100</b> more, up to <b>+500</b>.", "Streak bonus: every right answer in a row adds one hundred more, up to five hundred."],
        ["⏰", "No answer before the cannon fires? <b>−250</b>. You never drop below zero.", "No answer before the cannon fires? You lose two hundred fifty points. You never drop below zero."],
        ["🎁", "The last face of rounds 1 and 2 counts <b>double</b>. The final round, <b>The Feast</b>, counts <b>triple</b>.", "The last face of rounds one and two counts double. The final round, The Feast, counts triple."],
        ["🐺", "<b>Mutt Mashup:</b> two faces blended into one. Name <b>both</b> for double points. Name one for normal points.", "Mutt Mashup: two faces blended into one. Name both for double points. Name one for normal points."],
        ["🎲", "<b>Gamemaker twists</b> pop up during the countdown: fog, flipped photos, a <b>1,000 point jackpot</b> for the fastest right answer, and <b>Underdog's chance</b>, where the bottom 3 score double.", "Watch for Gamemaker twists during the countdown. Fog, flipped photos, a one thousand point jackpot for the fastest right answer, and Underdog's chance, where the bottom three score double."],
        ["🪙", "<b>Sponsor shop:</b> tap the floating coins on your phone to earn Capitol coins, then spend them on the scoreboard screen. Power-ups work on the <b>next face</b>.", "Sponsor shop. Tap the floating coins on your phone to earn Capitol coins, then spend them on the scoreboard screen. Power-ups work on the next face."],
        ["🛡️", "<b>🛡️ Shield</b> stops the penalty and saves your streak. <b>🔍 Spyglass</b> shows 4 possible names. <b>🎯 Double down</b>: right doubles, wrong costs 500. <b>🌹 Rose</b>: a rival loses 200.", "The shield stops the penalty and saves your streak. The spyglass shows four possible names. Double down: right doubles your points, wrong costs five hundred. And a rose makes a rival lose two hundred."],
        ["🏃", "Between rounds: <b>mini-games</b> on your phone. The top 3 win <b>+500, +300 and +200</b>.", "Between rounds, play mini-games on your phone. The top three win five hundred, three hundred, and two hundred points."],
        ["🔮", "<b>Clo</b>, your Host &amp; Gamemaker, knows every face. She predicts how many of you get each one. Exactly right: <b>+500</b>. Off by one: <b>+200</b>.", "Clo, your Host and Gamemaker, knows every face. So she predicts how many of you get each one right. Exactly right is five hundred. Off by one is two hundred."],
        ["👑", "Highest score wins the <b>major award</b>. Tied at the top? A <b>showdown</b>: one more face, fastest right answer wins.", "Highest score wins the major award. Tied at the top? A showdown. One more face, and the fastest right answer wins."],
        ["🎡", "<b>Second Chance Round:</b> the Victor sits out. A fast round: the first right answers score <b>1,000, 700, 500</b>, then 300. Top score is the <b>Second Victor</b>.", "Then the Second Chance Round. The Victor sits out. It's a speed round. The first right answers score one thousand, seven hundred, five hundred, then three hundred. Top score is the Second Victor."],
        ["😂", "Tap the <b>emojis</b> on your phone anytime to send them up the TV.", "Tap the emojis on your phone anytime to send them up the TV."]]
    },
    feud: {
      eyebrow: "🎙️ FULL WALKTHROUGH", title: "District Feud: How It All Works",
      intro: "Welcome to District Feud. Here's the full walkthrough. Phones out, tributes.",
      outro: "That's District Feud. Survey says, have fun.",
      steps: [
        ["📋", "<b>We surveyed the district.</b> The number one answer to every question is someone in this room.", "We surveyed the district. The number one answer to every question is someone in this room."],
        ["🎤", "First, the <b>walk-outs</b>. Tap the emojis on your phone to fill each tribute's <b>crowd meter</b>. The loudest crowd wins <b>Fan Favorite</b> and starts with <b>+1</b>.", "First, the walk-outs. Tap the emojis on your phone to fill each tribute's crowd meter. The loudest crowd wins Fan Favorite, and starts with one point."],
        ["📱", "A question hits the TV. On your phone, <b>tap the name</b> you think is number one. One tap locks it in.", "A question hits the TV. On your phone, tap the name you think is number one. One tap locks it in."],
        ["⏱️", "You have <b>45 seconds</b>. When the clock runs out: <b>survey says!</b>", "You have forty five seconds. When the clock runs out, survey says!"],
        ["🎯", "Call the number one answer: <b>+1</b> toward the major award.", "Call the number one answer, and you score one point toward the major award."],
        ["⚡", "Lock in a right answer within <b>10 seconds</b>: speed bonus, <b>+1</b> more.", "Lock in a right answer within ten seconds, and you get a speed bonus. One more point."],
        ["🔥", "<b>3 right in a row</b> and you're <b>on fire</b>: an extra point on every right answer while it lasts.", "Get three right in a row and you're on fire. An extra point on every right answer while it lasts."],
        ["⏰", "No guess in time? <b>−1</b>. You never drop below zero.", "No guess in time? You lose one point. You never drop below zero."],
        ["🏆", "<b>Are you</b> the number one answer? Every vote you got goes into your major award total too.", "Are you the number one answer? Every vote you got goes into your major award total too."],
        ["⚔️", "<b>Tied</b> for number one? <b>Face-off!</b> The tied tributes keep hands off. Everyone else votes in secret, <b>20 seconds</b>. Every vote counts. Don't vote in time: <b>−1</b>.", "Tied for number one? Face-off! The tied tributes keep hands off. Everyone else votes in secret, twenty seconds. Every vote counts. Don't vote in time, and you lose a point."],
        ["🎯", "<b>Clo</b>, your Host &amp; Gamemaker, made the survey, so she plays <b>Stump the Room</b>. She bets on someone to miss. They miss: Clo <b>+1</b>. They call it: they <b>steal +1</b>.", "Clo, your Host and Gamemaker, made the survey, so she plays Stump the Room. She bets on someone to miss it. If they miss, Clo gets a point. If they call it, they steal one."],
        ["💰", "The <b>final question</b> counts <b>double</b>. Everything on it is worth twice as much.", "The final question counts double. Everything on it is worth twice as much."],
        ["👑", "Highest total wins the <b>major award</b>. Tied? A <b>sudden death face-off</b>, then a lucky spin.", "Highest total wins the major award. Tied? A sudden death face-off, then a lucky spin."],
        ["🎡", "<b>Second Chance Spin:</b> the Victor sits out. The wheel picks two tributes for a face-off. Everyone else votes. The winner is the <b>Second Victor</b>.", "Then the Second Chance Spin. The Victor sits out. The wheel picks two tributes for a face-off, and everyone else votes. The winner is the Second Victor."],
        ["😂", "Tap the <b>emojis</b> on your phone anytime to send them up the TV.", "Tap the emojis on your phone anytime to send them up the TV."]]
    },
    secrets: {
      eyebrow: "🎙️ FULL WALKTHROUGH", title: "District Secrets: How It All Works",
      intro: "Welcome to District Secrets. Here's the full walkthrough. Keep your secrets close.",
      outro: "That's District Secrets. Trust no one.",
      steps: [
        ["🤫", "A <b>real secret</b> from someone in this room appears on the TV. Figure out whose it is.", "A real secret from someone in this room appears on the TV. Your job: figure out whose it is."],
        ["📱", "On your phone, <b>type a name</b> and tap <b>Seal my guess</b>. Nobody else sees it.", "On your phone, type a name and tap Seal my guess. Nobody else sees it."],
        ["✅", "A right guess is <b>1,000</b>. Guess fast for a <b>speed bonus</b> up to <b>+500</b>. Every right answer in a row adds <b>+100</b>, up to <b>+500</b>.", "A right guess is one thousand points. Guess fast for a speed bonus, up to five hundred. And every right answer in a row adds one hundred more, up to five hundred."],
        ["⏰", "No guess before time's up? <b>−200</b>. You never drop below zero.", "No guess before time's up? You lose two hundred points. You never drop below zero."],
        ["🎭", "<b>Your</b> secret? Keep a straight face and type a <b>decoy</b>: <b>+150</b> for everyone you fool. <b>Frame</b> someone: if the room accuses them most, <b>+400</b>.", "Is it your secret? Keep a straight face, and type a decoy. Every person you fool is one hundred fifty points. You can also frame someone. If the room accuses them the most, four hundred points."],
        ["🃏", "<b>Fake secrets:</b> the Capitol slips in a few. Tap <b>It's fake! Nobody said that</b>. Spot one and it scores like a right guess.", "Fake secrets. The Capitol slips in a few. Tap It's fake, nobody said that. Spot one, and it scores like a right guess."],
        ["🎲", "<b>Sponsor bets</b> before you seal: <b>Hunch</b> is normal. <b>Sure</b>: +500 if right, −250 if wrong. <b>All in</b>: double if right, −500 if wrong.", "Sponsor bets, before you seal. Hunch is the normal way. Sure is plus five hundred if you're right, and minus two fifty if you're wrong. All in doubles your points, or costs you five hundred."],
        ["🔦", "<b>Interrogation Room:</b> someone takes the hot seat and you can change your vote. Switch to the right person: <b>+250</b>. Switch away from it: <b>−500</b>. Switch and still wrong: <b>−250</b>.", "The Interrogation Room. Someone takes the hot seat, and you can change your vote. Switch to the right person, plus two fifty. Switch away from the right person, minus five hundred. Switch and still wrong, minus two fifty."],
        ["🤐", "In the hot seat? <b>Plead the Fifth</b> once per game. It ends the questions, but costs <b>100</b>.", "In the hot seat? Plead the Fifth, once per game. It ends the questions, but costs one hundred."],
        ["🎤", "<b>Story time:</b> accept and tell the story behind your secret: <b>+300</b>. Decline: <b>−200</b>. Every good vote: <b>+100</b>. Every 😴 or 👎: <b>−50</b>.", "Story time. Accept, and tell the story behind your secret, for three hundred points. Decline, and lose two hundred. Every good vote is plus one hundred. Every boring or thumbs down is minus fifty."],
        ["🐀", "<b>The mole:</b> one guesser gets a secret mission to steer the room to a wrong name. <b>+150</b> for everyone who falls for it.", "The mole. One guesser gets a secret mission, to steer the room to a wrong name. Plus one fifty for everyone who falls for it."],
        ["✨", "<b>🖤 Redacted files</b> hide words: guess early for a speed bonus up to <b>+1,000</b>. A <b>golden file</b> counts <b>triple</b>. The <b>lightning round</b>: 10 seconds, <b>double</b> points.", "Redacted files hide words, so guess early for a speed bonus up to one thousand. A golden file counts triple. And the lightning round gives you ten seconds, at double points."],
        ["🤥", "<b>Two truths and a lie:</b> find the lie for <b>1,000</b>. Write your own on your phone: <b>+150</b> for everyone you fool. A <b>bonus secret</b> you write that gets played: <b>+500</b>.", "Two truths and a lie. Find the lie for one thousand. Write your own on your phone, and get one fifty for everyone you fool. A bonus secret you write that gets played is worth five hundred."],
        ["🕵️", "<b>Clo</b>, your Host &amp; Gamemaker, knows every secret, so she plays <b>Most Wanted</b>: guess who the room wrongly accuses most. Nail it: <b>+400</b>.", "Clo, your Host and Gamemaker, knows every secret, so she plays Most Wanted. She guesses who the room will wrongly accuse the most. Nail it, four hundred points."],
        ["👑", "The <b>final secret</b> counts <b>double</b>. Most points wins the <b>major award</b>. Tied? A <b>Quick Draw</b>: first tap after <b>DRAW!</b> wins.", "The final secret counts double. Most points wins the major award. Tied at the top? A Quick Draw. First tap after draw wins."],
        ["🎡", "<b>Second Chance Spin:</b> the Victor sits out. The wheel picks two tributes for a Quick Draw. The winner is the <b>Second Victor</b>.", "Then the Second Chance Spin. The Victor sits out. The wheel picks two tributes for a Quick Draw. The winner is the Second Victor."]]
    }
  };
  window.Walkthrough = {
    data: W,
    // every line spoken, in order (for recordings and tests)
    lines: g => { const o = W[g]; return [o.intro, ...o.steps.map(s => s[2]), o.outro]; },
    show(g, opt = {}) {
      const o = W[g]; if (!o || !window.Briefing) return false;
      try { if (Briefing.open()) return false; } catch (e) {}
      const ov = Briefing.show({ ...o, start: "▶ Got it", muted: opt.muted || (() => false), onStart: opt.onClose || null });
      if (ov) {   // lots of steps: a bit smaller, and keep the step being read in view
        ov.classList.add("wt");
        const mo = new MutationObserver(() => { const on = ov.querySelector(".st.on"); if (on && on !== mo.last) { mo.last = on; try { on.scrollIntoView({ block: "nearest", behavior: "smooth" }); } catch (e) {} } });
        mo.observe(ov, { subtree: true, attributes: true, attributeFilter: ["class"] });
      }
      return true;
    }
  };
})();
