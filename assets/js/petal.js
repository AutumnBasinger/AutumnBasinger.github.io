// petals
const p1 = document.getElementById('p1');
const p2 = document.getElementById('p2');
const p3 = document.getElementById('p3');
const p4 = document.getElementById('p4');

// petal instruction boxes
const pi1 = document.getElementById('pi1');
const pi2 = document.getElementById('pi2');
const pi3 = document.getElementById('pi3');
const pi4 = document.getElementById('pi4');

// controls
const playButton = document.getElementById('play');
const pauseButton = document.getElementById('pause');
const resetButton = document.getElementById('reset');

// colors, actual color in firmware may differ from prototype color
const c = {
  off : '#0f0f0f', //off
  whi : '#FFFFFF', //white actual - A5FFFF
  wh8 : '#cfcfcf', //white at 80%
  wh7 : '#b7b7b7', //white at 70%
  wh6 : '#9f9f9f', //white at 60%
  wh5 : '#878787', //white at 50%
  wh4 : '#6f6f6f', //white at 40%
  wh3 : '#4C4C4C', //white at 30%
  red : '#FF0B06', //red
  blu : '#0000FF', //blue
  ora : '#FF7800', //orange actual - #FF6B00
  yel : '#FFD500', //yellow actual - #FFFF00
  lbl : '#00E8C8', //light blue actual - #00A849, old light blue actual - #00E8B3
  lb4 : '#005c50', //light blue at 40%
  lblg : '#00E8B3', //light blue (greenish) (for fully charged) actual - #008822
  gre : '#80E500', //green actual - #41A500 // dont use
  vio : '#E800FF', //violet actual - #3945C9
  min : '#0074FF', //mint actual - #00A876
}

// on browser load or refresh, Two_Petal_Battery animation loads
let ef = 272; // last frame of animation
let repFrame = false; // animation repeats? Can be false, true (uses endframe) or specify frame
let framecode = [ // Two_Petal_Battery, also defined in animations.js
  [[0,32,c.whi],[256,16,c.off]],
  [[32,32,c.whi],[256,16,c.off]],
  [],
  []
];

// petal instruction sets, petal 1 uses set1, etc
// each set contains any number of instructions where each instruction is: [start frame, transition frames, color]
let set1 = [[0,32,c.whi],[256,16,c.off]];
let set2 = [[32,32,c.whi],[256,16,c.off]];
let set3 = [];
let set4 = [];

// the current render color for each petal, starts at off
let rc1 = rc2 = rc3 = rc4 = c.off

// the color that each petal is fading from, starts at off
let fc1 = fc2 = fc3 = fc4 = c.off

// actual ms (millisecond) constant should be 7.8125, but this causes PetalType to play faster by a larger margin than 8ms plays slow
// PetalType plays SLIGHTLY SLOWER than the actual device, but the ammount of error is less than when using 7.8125 (for some reason I can't figure out)
const ms = 8;
let timerID = 'not playing';
let f = 0; // start on frame 0

// turns text box input format into instruction format
function parseSet(pi) {
  let s = []; // full petal set
  let toParse = pi.value.split('\n');
  for (let i=0; i<toParse.length-1; i++) {
    let line = [] // one
    let parseLine = toParse[i].split(',') // array of 3 strings ['s','d','#color']
    line.push(Number(parseLine[0])) //start frame
    line.push(Number(parseLine[1])) //duration frames
    line.push(parseLine[2]) //hex color already string
    s.push(line)
  }
  return s
}

// populates new endFrame
function calcEndFrame() {
  let ef1 = (set1.length===0) ? 0 : set1[set1.length-1][0] + set1[set1.length-1][1];
  let ef2 = (set2.length===0) ? 0 : set2[set2.length-1][0] + set2[set2.length-1][1];
  let ef3 = (set3.length===0) ? 0 : set3[set3.length-1][0] + set3[set3.length-1][1];
  let ef4 = (set4.length===0) ? 0 : set4[set4.length-1][0] + set4[set4.length-1][1];
  ef = Math.max(ef1,ef2,ef3,ef4);
  return ef;
}

// populates petal sets with what's in text box
function parseInput() {
  set1 = parseSet(pi1);
  set2 = parseSet(pi2);
  set3 = parseSet(pi3);
  set4 = parseSet(pi4);
  calcEndFrame(set1,set2,set3,set4);
  return [set1, set2, set3, set4, ef];
}

// turns sets into text box string format
function makeString(s) {
  let output = '';
  for (let i=0; i<s.length; i++) {
    output = output.concat(s[i].toString()+'\n')
  }
  return output;
}

// loads text box display with current sets
function loadDisplay() {
  pi1.value=makeString(set1);
  pi2.value=makeString(set2);
  pi3.value=makeString(set3);
  pi4.value=makeString(set4);
  return [pi1.value, pi2.value, pi3.value, pi4.value];
}

// assigns 'from' colors the current petal color values for replace
function assignFromColors() {
  fc1 = rc1;
  fc2 = rc2;
  fc3 = rc3;
  fc4 = rc4;
  return [fc1,fc2,fc3,fc4];
}

// assign 'from' colors back to off
function resetFromColors() {
  fc1 = c.off;
  fc2 = c.off;
  fc3 = c.off;
  fc4 = c.off;
  return [fc1,fc2,fc3,fc4];
}


function incrementFrame() { // f = f+1
  f = f+1
  // console.log('f+1')
  // if (f % 16 === 0) {
  //   console.log(f)
  // }
  return f
}

// Animation object template
function Animation(name,repeat,s1,s2,s3,s4) {
  this.name = name;
  this.repeat = repeat;
  this.s1 = s1; //holds active
  this.s2 = s2; //holds non-active
  this.s3 = s3; //holds non-active
  this.s4 = s4; //holds non-active
  this.load = function(activePetals) { // [1,2,3]
    if (activePetals === undefined) { // use specified
      set1 = this.s1;
      set2 = this.s2;
      set3 = this.s3;
      set4 = this.s4;
    }
    else { // if active petals are defined
      set1 = (activePetals.includes(1)) ? this.s1 : this.s2;
      set2 = (activePetals.includes(2)) ? this.s1 : this.s2;
      set3 = (activePetals.includes(3)) ? this.s1 : this.s2;
      set4 = (activePetals.includes(4)) ? this.s1 : this.s2;
    };
    repFrame = this.repeat // set up repeat
    calcEndFrame();
    loadDisplay();
  };
  this.animate = function(activePetals) {
    assignFromColors(); // changing fc here changes rc in update
    f=0;
    this.load(activePetals);
    playButton.onmousedown();
  };
}

playButton.onmousedown = function play() {
  if (timerID === 'not playing') {
    parseInput() // prioritize text box
    let timer = setInterval(incrementFrame, ms) //start incrementing
    timerID = timer
  }
}
pauseButton.onmousedown = function pause() {
  clearInterval(timerID); //stop incrementing
  console.log('Paused on frame:', f)
  timerID = 'not playing'
}
resetButton.onmousedown = function reset() {
  console.log('Resetting to 0 from frame:', f)
  f = 0
  clearInterval(timerID);
  timerID = 'not playing'
}

// someone else wrote this, thanks: https://gist.github.com/rosszurowski/67f04465c424a9bc0dae
function lerpColorStolen(a, b, p) { // returns hex color using from, to, and progress
    let ah = +a.replace('#', '0x') // a hex
        ar = ah >> 16, ag = ah >> 8 & 0xff, ab = ah & 0xff, // a rgb
        bh = +b.replace('#', '0x'), // b rgb
        br = bh >> 16, bg = bh >> 8 & 0xff, bb = bh & 0xff, // b hex
        rr = ar + p * (br - ar), // rgb red
        rg = ag + p * (bg - ag), // rgb green
        rb = ab + p * (bb - ab); // rgb blue
    return '#' + ((1 << 24) + (rr << 16) + (rg << 8) + rb | 0).toString(16).slice(1);
}

// get current render color of specific petal
function getRenderColor(f, set, fc) {
  let toColor = c.off
  for (let i=0; i<set.length; i++) {
    let thisStart = set[i][0]
    let thisDur = set[i][1]
    let fromColor = (i===0) ? fc : set[i-1][2]
    toColor = set[i][2]
    let progress = (f-thisStart)/thisDur;
    if (progress < 0) {
      return fromColor;
    }
    else if (progress <= 1) {
      return lerpColorStolen(fromColor, toColor, progress);
    }
  }
  return toColor // only when loop is over and nothing returned
}

// update screen to next animation frame
function update() {
  // update petal render colors
  rc1 = getRenderColor(f, set1, fc1);
  rc2 = getRenderColor(f, set2, fc2);
  rc3 = getRenderColor(f, set3, fc3);
  rc4 = getRenderColor(f, set4, fc4);
  // update petals on screen
  p1.style.backgroundColor = rc1;
  p2.style.backgroundColor = rc2;
  p3.style.backgroundColor = rc3;
  p4.style.backgroundColor = rc4;
  if (repFrame && f >= ef) { // if end and repeat
    console.log('Animation ended on frame:', f, ', now repeating')
    f = repFrame
    console.log('Repeat starting on frame:', f)
  }
  if (f >= ef) { // if end and no repeat
    console.log('Animation ended on frame:', f, ', resetting to 0')
    f = 0
    resetFromColors()
    clearInterval(timerID);
    timerID = 'not playing'
  }
  window.requestAnimationFrame(update); // do it again
  return [rc1,rc2,rc3,rc4]
}

loadDisplay() // load default animation on browser reload
window.requestAnimationFrame(update) // start updating
