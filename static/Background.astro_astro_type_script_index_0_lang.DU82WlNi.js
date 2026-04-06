let e={grid_size:64,dye_size:256,sim_speed:5,contain_fluid:!0,velocity_add_intensity:.28,velocity_add_radius:.001,velocity_diffusion:1,dye_add_intensity:.8,dye_add_radius:.0035,dye_diffusion:.96204,viscosity:0,vorticity:0,pressure_iterations:8,buffer_view:"dye",input_symmetry:"none"},s,q,x,D;const f={current:null,last:null,velocity:null};let _,b,P,$,A,V,G,B,Y;const p={};let T,S,M,m,H,N,Z,j,J,K,Q,ee,re,F,ie,te,ne,oe,ae,ue,de,se,fe,le,ye,ce,pe,O;function U(a){const r=a.touches?a.touches[0]:a,i=x.getBoundingClientRect();f.current||(f.current=[]),f.current[0]=(r.clientX-i.left)/i.width,f.current[1]=1-(r.clientY-i.top)/i.height}function L(a){return console.log("Could not initialize WebGPU: "+a),document.querySelector(".webgpu-not-supported").style.visibility="visible",!1}async function me(){if(navigator.gpu==null)return L("WebGPU NOT Supported");const a=await navigator.gpu.requestAdapter();if(!a)return L("No adapter found");if(s=await a.requestDevice(),x=document.getElementById("fluid-webgpu"),D=x.getContext("webgpu"),!D)return L("Canvas does not support WebGPU");x.style.width="100%",x.style.height="100%",x.addEventListener("mousemove",U),x.addEventListener("touchmove",i=>{U(i)}),x.addEventListener("touchstart",i=>{U(i),f.last=[...f.current]}),q=navigator.gpu.getPreferredCanvasFormat(a),D.configure({device:s,format:q,usage:GPUTextureUsage.RENDER_ATTACHMENT,alphaMode:"premultiplied"}),ve();let r;return window.addEventListener("resize",()=>{clearTimeout(r),r=setTimeout(be,150)}),!0}function be(){ve(),xe(),_e(),p.gridSize.needsUpdate=[e.grid_w,e.grid_h,e.dye_w,e.dye_h,e.dx,e.rdx,e.dyeRdx]}function ve(){const a=window.devicePixelRatio||1,r=window.innerWidth/window.innerHeight,i=s.limits.maxStorageBufferBindingSize,t=s.limits.maxTextureDimension2D,o=v=>{let u,y;const R=v*a;return r>1?(y=R,u=Math.floor(y*r)):(u=R,y=Math.floor(u/r)),n(u,y)},n=(v,u)=>{let y=1;return v*u*4>=i&&(y=Math.sqrt(i/(v*u*4))),v>t?y=t/v:u>t&&(y=t/u),{w:Math.floor(v*y),h:Math.floor(u*y)}};let d=o(e.grid_size);e.grid_w=d.w,e.grid_h=d.h;let w=o(e.dye_size);e.dye_w=w.w,e.dye_h=w.h,e.rdx=e.grid_size*4,e.dyeRdx=e.dye_size*4,e.dx=1/e.rdx,x.width=e.dye_w,x.height=e.dye_h}const c=`
struct GridSize {
  w : f32,
  h : f32,
  dyeW: f32,
  dyeH: f32,
  dx : f32,
  rdx : f32,
  dyeRdx : f32
}`,z=`
var pos = vec2<f32>(global_id.xy);

if (pos.x == 0 || pos.y == 0 || pos.x >= uGrid.w - 1 || pos.y >= uGrid.h - 1) {
    return;
}      

let index = ID(pos.x, pos.y);`,W=`
var pos = vec2<f32>(global_id.xy);

if (pos.x == 0 || pos.y == 0 || pos.x >= uGrid.dyeW - 1 || pos.y >= uGrid.dyeH - 1) {
    return;
}      

let index = ID(pos.x, pos.y);`,X=`    
var pos = vec2<f32>(global_id.xy);

if (pos.x >= uGrid.w || pos.y >= uGrid.h) {
    return;
}      

let index = ID(pos.x, pos.y);`,ge=`
var m = uMouse.pos;
var v = uMouse.vel*2.;

var splat = createSplat(p, m, v, uRadius);
if (uSymmetry == 1. || uSymmetry == 3.) {splat += createSplat(p, vec2(1. - m.x, m.y), v * vec2(-1., 1.), uRadius);}
if (uSymmetry == 2. || uSymmetry == 3.) {splat += createSplat(p, vec2(m.x, 1. - m.y), v * vec2(1., -1.), uRadius);}
if (uSymmetry == 3. || uSymmetry == 4.) {splat += createSplat(p, vec2(1. - m.x, 1. - m.y), v * vec2(-1., -1.), uRadius);}
`,he=`

${c}

struct Mouse {
  pos: vec2<f32>,
  vel: vec2<f32>,
}
@group(0) @binding(0) var<storage, read> x_in : array<f32>;
@group(0) @binding(1) var<storage, read> y_in : array<f32>;
@group(0) @binding(2) var<storage, read_write> x_out : array<f32>;
@group(0) @binding(3) var<storage, read_write> y_out : array<f32>;
@group(0) @binding(4) var<uniform> uGrid: GridSize;
@group(0) @binding(5) var<uniform> uMouse: Mouse;
@group(0) @binding(6) var<uniform> uForce : f32;
@group(0) @binding(7) var<uniform> uRadius : f32;
@group(0) @binding(8) var<uniform> uDiffusion : f32;
@group(0) @binding(9) var<uniform> uDt : f32;
@group(0) @binding(10) var<uniform> uTime : f32;
@group(0) @binding(11) var<uniform> uSymmetry : f32;

fn ID(x : f32, y : f32) -> u32 { return u32(x + y * uGrid.w); }
fn inBetween(x : f32, lower : f32, upper : f32) -> bool {
  return x > lower && x < upper;
}
fn inBounds(pos : vec2<f32>, xMin : f32, xMax : f32, yMin: f32, yMax : f32) -> bool {
  return inBetween(pos.x, xMin * uGrid.w, xMax * uGrid.w) && inBetween(pos.y, yMin * uGrid.h, yMax * uGrid.h);
}

fn createSplat(pos : vec2<f32>, splatPos : vec2<f32>, vel : vec2<f32>, radius : f32) -> vec2<f32> {
  var p = pos - splatPos;
  p.x *= uGrid.w / uGrid.h;
  var v = vel;
  v.x *= uGrid.w / uGrid.h;
  var splat = exp(-dot(p, p) / radius) * v;
  return splat;
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {
    
    ${z}

    let tmpT = uTime;
    var p = pos/vec2(uGrid.w, uGrid.h);

    ${ge}
    
    splat *= uForce * uDt * 200.;

    x_out[index] = x_in[index]*uDiffusion + splat.x;
    y_out[index] = y_in[index]*uDiffusion + splat.y;
}`,we=`

${c}

struct Mouse {
  pos: vec2<f32>,
  vel: vec2<f32>,
}
@group(0) @binding(0) var<storage, read> x_in : array<f32>;
@group(0) @binding(1) var<storage, read> y_in : array<f32>;
@group(0) @binding(2) var<storage, read> z_in : array<f32>;
@group(0) @binding(3) var<storage, read_write> x_out : array<f32>;
@group(0) @binding(4) var<storage, read_write> y_out : array<f32>;
@group(0) @binding(5) var<storage, read_write> z_out : array<f32>;
@group(0) @binding(6) var<uniform> uGrid: GridSize;
@group(0) @binding(7) var<uniform> uMouse: Mouse;
@group(0) @binding(8) var<uniform> uForce : f32;
@group(0) @binding(9) var<uniform> uRadius : f32;
@group(0) @binding(10) var<uniform> uDiffusion : f32;
@group(0) @binding(11) var<uniform> uTime : f32;
@group(0) @binding(12) var<uniform> uDt : f32;
@group(0) @binding(13) var<uniform> uSymmetry : f32;

fn ID(x : f32, y : f32) -> u32 { return u32(x + y * uGrid.dyeW); }
fn inBetween(x : f32, lower : f32, upper : f32) -> bool {
  return x > lower && x < upper;
}
fn inBounds(pos : vec2<f32>, xMin : f32, xMax : f32, yMin: f32, yMax : f32) -> bool {
  return inBetween(pos.x, xMin * uGrid.dyeW, xMax * uGrid.dyeW) && inBetween(pos.y, yMin * uGrid.dyeH, yMax * uGrid.dyeH);
}
// cosine based palette, 4 vec3 params
fn palette(t : f32, a : vec3<f32>, b : vec3<f32>, c : vec3<f32>, d : vec3<f32> ) -> vec3<f32> {
    return a + b*cos( 6.28318*(c*t+d) );
}

fn createSplat(pos : vec2<f32>, splatPos : vec2<f32>, vel : vec2<f32>, radius : f32) -> vec3<f32> {
  var p = pos - splatPos;
  p.x *= uGrid.w / uGrid.h;
  var v = vel;
  v.x *= uGrid.w / uGrid.h;
  var splat = exp(-dot(p, p) / radius) * length(v);
  return vec3(splat);
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {

    ${W}

    let col_incr = 0.15;
    let col_start = palette(uTime/8., vec3(1), vec3(0.5), vec3(1), vec3(0, col_incr, col_incr*2.));

    var p = pos/vec2(uGrid.dyeW, uGrid.dyeH);

    ${ge}

    splat *= col_start * uForce * uDt * 100.;

    x_out[index] = max(0., x_in[index]*uDiffusion + splat.x);
    y_out[index] = max(0., y_in[index]*uDiffusion + splat.y);
    z_out[index] = max(0., z_in[index]*uDiffusion + splat.z);
}`,Ge=`

${c}

@group(0) @binding(0) var<storage, read> x_in : array<f32>;
@group(0) @binding(1) var<storage, read> y_in : array<f32>;
@group(0) @binding(2) var<storage, read> x_vel : array<f32>;
@group(0) @binding(3) var<storage, read> y_vel : array<f32>;
@group(0) @binding(4) var<storage, read_write> x_out : array<f32>;
@group(0) @binding(5) var<storage, read_write> y_out : array<f32>;
@group(0) @binding(6) var<uniform> uGrid : GridSize;
@group(0) @binding(7) var<uniform> uDt : f32;

fn ID(x : f32, y : f32) -> u32 { return u32(x + y * uGrid.w); }
fn in(x : f32, y : f32) -> vec2<f32> { let id = ID(x, y); return vec2(x_in[id], y_in[id]); }

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {
  
    ${z}
    
    var x = pos.x - uDt * uGrid.rdx * x_vel[index];
    var y = pos.y - uDt * uGrid.rdx * y_vel[index];

    if (x < 0) { x = 0; }
    else if (x >= uGrid.w - 1) { x = uGrid.w - 1; }
    if (y < 0) { y = 0; }
    else if (y >= uGrid.h - 1) { y = uGrid.h - 1; }

    let x1 = floor(x);
    let y1 = floor(y);
    let x2 = x1 + 1;
    let y2 = y1 + 1;

    let TL = in(x1, y2);
    let TR = in(x2, y2);
    let BL = in(x1, y1);
    let BR = in(x2, y1);

    let xMod = fract(x);
    let yMod = fract(y);
    
    let bilerp = mix( mix(BL, BR, xMod), mix(TL, TR, xMod), yMod );

    x_out[index] = bilerp.x;
    y_out[index] = bilerp.y;
}`,ze=`

${c}

@group(0) @binding(0) var<storage, read> x_in : array<f32>;
@group(0) @binding(1) var<storage, read> y_in : array<f32>;
@group(0) @binding(2) var<storage, read> z_in : array<f32>;
@group(0) @binding(3) var<storage, read> x_vel : array<f32>;
@group(0) @binding(4) var<storage, read> y_vel : array<f32>;
@group(0) @binding(5) var<storage, read_write> x_out : array<f32>;
@group(0) @binding(6) var<storage, read_write> y_out : array<f32>;
@group(0) @binding(7) var<storage, read_write> z_out : array<f32>;
@group(0) @binding(8) var<uniform> uGrid : GridSize;
@group(0) @binding(9) var<uniform> uDt : f32;

fn ID(x : f32, y : f32) -> u32 { return u32(x + y * uGrid.dyeW); }
fn in(x : f32, y : f32) -> vec3<f32> { let id = ID(x, y); return vec3(x_in[id], y_in[id], z_in[id]); }
fn vel(x : f32, y : f32) -> vec2<f32> { 
  let id = u32(i32(x) + i32(y) * i32(uGrid.w));
  return vec2(x_vel[id], y_vel[id]);
}

fn vel_bilerp(x0 : f32, y0 : f32) -> vec2<f32> {
    var x = x0 * uGrid.w / uGrid.dyeW;
    var y = y0 * uGrid.h / uGrid.dyeH;

    if (x < 0) { x = 0; }
    else if (x >= uGrid.w - 1) { x = uGrid.w - 1; }
    if (y < 0) { y = 0; }
    else if (y >= uGrid.h - 1) { y = uGrid.h - 1; }

    let x1 = floor(x);
    let y1 = floor(y);
    let x2 = x1 + 1;
    let y2 = y1 + 1;

    let TL = vel(x1, y2);
    let TR = vel(x2, y2);
    let BL = vel(x1, y1);
    let BR = vel(x2, y1);

    let xMod = fract(x);
    let yMod = fract(y);

    return mix( mix(BL, BR, xMod), mix(TL, TR, xMod), yMod );
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {

    ${W}

    let V = vel_bilerp(pos.x, pos.y);

    var x = pos.x - uDt * uGrid.dyeRdx * V.x;
    var y = pos.y - uDt * uGrid.dyeRdx * V.y;

    if (x < 0) { x = 0; }
    else if (x >= uGrid.dyeW - 1) { x = uGrid.dyeW - 1; }
    if (y < 0) { y = 0; }
    else if (y >= uGrid.dyeH - 1) { y = uGrid.dyeH - 1; }

    let x1 = floor(x);
    let y1 = floor(y);
    let x2 = x1 + 1;
    let y2 = y1 + 1;

    let TL = in(x1, y2);
    let TR = in(x2, y2);
    let BL = in(x1, y1);
    let BR = in(x2, y1);

    let xMod = fract(x);
    let yMod = fract(y);

    let bilerp = mix( mix(BL, BR, xMod), mix(TL, TR, xMod), yMod );

    x_out[index] = bilerp.x;
    y_out[index] = bilerp.y;
    z_out[index] = bilerp.z;
}`,Se=`   

${c}

@group(0) @binding(0) var<storage, read> x_vel : array<f32>;
@group(0) @binding(1) var<storage, read> y_vel : array<f32>;
@group(0) @binding(2) var<storage, read_write> div : array<f32>;
@group(0) @binding(3) var<uniform> uGrid : GridSize;

fn ID(x : f32, y : f32) -> u32 { return u32(x + y * uGrid.w); }
fn vel(x : f32, y : f32) -> vec2<f32> { let id = ID(x, y); return vec2(x_vel[id], y_vel[id]); }

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {

  ${z}

  let L = vel(pos.x - 1, pos.y).x;
  let R = vel(pos.x + 1, pos.y).x;
  let B = vel(pos.x, pos.y - 1).y;
  let T = vel(pos.x, pos.y + 1).y;

  div[index] = 0.5 * uGrid.rdx * ((R - L) + (T - B));
}`,Pe=`      

${c}

@group(0) @binding(0) var<storage, read> pres_in : array<f32>;
@group(0) @binding(1) var<storage, read> div : array<f32>;
@group(0) @binding(2) var<storage, read_write> pres_out : array<f32>;
@group(0) @binding(3) var<uniform> uGrid : GridSize;

fn ID(x : f32, y : f32) -> u32 { return u32(x + y * uGrid.w); }
fn in(x : f32, y : f32) -> f32 { let id = ID(x, y); return pres_in[id]; }

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {

  ${z}
        
  let L = pos - vec2(1, 0);
  let R = pos + vec2(1, 0);
  let B = pos - vec2(0, 1);
  let T = pos + vec2(0, 1);

  let Lx = in(L.x, L.y);
  let Rx = in(R.x, R.y);
  let Bx = in(B.x, B.y);
  let Tx = in(T.x, T.y);

  let bC = div[index];

  let alpha = -(uGrid.dx * uGrid.dx);
  let rBeta = .25;

  pres_out[index] = (Lx + Rx + Bx + Tx + alpha * bC) * rBeta;
}`,Be=`      

${c}

@group(0) @binding(0) var<storage, read> pressure : array<f32>;
@group(0) @binding(1) var<storage, read> x_vel : array<f32>;
@group(0) @binding(2) var<storage, read> y_vel : array<f32>;
@group(0) @binding(3) var<storage, read_write> x_out : array<f32>;
@group(0) @binding(4) var<storage, read_write> y_out : array<f32>;
@group(0) @binding(5) var<uniform> uGrid : GridSize;

fn ID(x : f32, y : f32) -> u32 { return u32(x + y * uGrid.w); }
fn pres(x : f32, y : f32) -> f32 { let id = ID(x, y); return pressure[id]; }

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {

  ${z}

  let L = pos - vec2(1, 0);
  let R = pos + vec2(1, 0);
  let B = pos - vec2(0, 1);
  let T = pos + vec2(0, 1);

  let xL = pres(L.x, L.y);
  let xR = pres(R.x, R.y);
  let yB = pres(B.x, B.y);
  let yT = pres(T.x, T.y);
  
  let finalX = x_vel[index] - .5 * uGrid.rdx * (xR - xL);
  let finalY = y_vel[index] - .5 * uGrid.rdx * (yT - yB);

  x_out[index] = finalX;
  y_out[index] = finalY;
}`,De=`      

${c}

@group(0) @binding(0) var<storage, read> x_vel : array<f32>;
@group(0) @binding(1) var<storage, read> y_vel : array<f32>;
@group(0) @binding(2) var<storage, read_write> vorticity : array<f32>;
@group(0) @binding(3) var<uniform> uGrid : GridSize;

fn ID(x : f32, y : f32) -> u32 { return u32(x + y * uGrid.w); }
fn vel(x : f32, y : f32) -> vec2<f32> { let id = ID(x, y); return vec2(x_vel[id], y_vel[id]); }

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {

  ${z}

  let Ly = vel(pos.x - 1, pos.y).y;
  let Ry = vel(pos.x + 1, pos.y).y;
  let Bx = vel(pos.x, pos.y - 1).x;
  let Tx = vel(pos.x, pos.y + 1).x;

  vorticity[index] = 0.5 * uGrid.rdx * ((Ry - Ly) - (Tx - Bx));
}`,Te=`      

${c}

@group(0) @binding(0) var<storage, read> x_vel_in : array<f32>;
@group(0) @binding(1) var<storage, read> y_vel_in : array<f32>;
@group(0) @binding(2) var<storage, read> vorticity : array<f32>;
@group(0) @binding(3) var<storage, read_write> x_vel_out : array<f32>;
@group(0) @binding(4) var<storage, read_write> y_vel_out : array<f32>;
@group(0) @binding(5) var<uniform> uGrid : GridSize;
@group(0) @binding(6) var<uniform> uDt : f32;
@group(0) @binding(7) var<uniform> uVorticity : f32;

fn ID(x : f32, y : f32) -> u32 { return u32(x + y * uGrid.w); }
fn vort(x : f32, y : f32) -> f32 { let id = ID(x, y); return vorticity[id]; }

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {

  ${z}

  let L = vort(pos.x - 1, pos.y);
  let R = vort(pos.x + 1, pos.y);
  let B = vort(pos.x, pos.y - 1);
  let T = vort(pos.x, pos.y + 1);
  let C = vorticity[index];

  var force = 0.5 * uGrid.rdx * vec2(abs(T) - abs(B), abs(R) - abs(L));

  let epsilon = 2.4414e-4;
  let magSqr = max(epsilon, dot(force, force));

  force = force / sqrt(magSqr);
  force *= uGrid.dx * uVorticity * uDt * C * vec2(1, -1);

  x_vel_out[index] = x_vel_in[index] + force.x;
  y_vel_out[index] = y_vel_in[index] + force.y;
}`,Me=`  

${c}

@group(0) @binding(0) var<storage, read> x_in : array<f32>;
@group(0) @binding(1) var<storage, read_write> x_out : array<f32>;
@group(0) @binding(2) var<uniform> uGrid : GridSize;
@group(0) @binding(3) var<uniform> uVisc : f32;

fn ID(x : f32, y : f32) -> u32 { return u32(x + y * uGrid.w); }

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {

  ${X}

  x_out[index] = x_in[index]*uVisc;
}`,Re=`

${c}

@group(0) @binding(0) var<storage, read> x_in : array<f32>;
@group(0) @binding(1) var<storage, read> y_in : array<f32>;
@group(0) @binding(2) var<storage, read_write> x_out : array<f32>;
@group(0) @binding(3) var<storage, read_write> y_out : array<f32>;
@group(0) @binding(4) var<uniform> uGrid : GridSize;
@group(0) @binding(5) var<uniform> containFluid : f32;

fn ID(x : f32, y : f32) -> u32 { return u32(x + y * uGrid.w); }

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {

  ${X}

  // disable scale to disable contained bounds
  var scaleX = 1.;
  var scaleY = 1.;

  if (pos.x == 0) { pos.x += 1; scaleX = -1.; }
  else if (pos.x == uGrid.w - 1) { pos.x -= 1; scaleX = -1.; }
  if (pos.y == 0) { pos.y += 1; scaleY = -1.; }
  else if (pos.y == uGrid.h - 1) { pos.y -= 1; scaleY = -1.; }

  if (containFluid == 0.) {
    scaleX = 1.;
    scaleY = 1.;
  }

  x_out[index] = x_in[ID(pos.x, pos.y)] * scaleX;
  y_out[index] = y_in[ID(pos.x, pos.y)] * scaleY;
}`,k=`    

${c}

@group(0) @binding(0) var<storage, read> x_in : array<f32>;
@group(0) @binding(1) var<storage, read_write> x_out : array<f32>;
@group(0) @binding(2) var<uniform> uGrid : GridSize;

fn ID(x : f32, y : f32) -> u32 { return u32(x + y * uGrid.w); }

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {

  ${X}

  if (pos.x == 0) { pos.x += 1; }
  else if (pos.x == uGrid.w - 1) { pos.x -= 1; }
  if (pos.y == 0) { pos.y += 1; }
  else if (pos.y == uGrid.h - 1) { pos.y -= 1; }

  x_out[index] = x_in[ID(pos.x, pos.y)];
}`,Ue=`    

${c}

@group(0) @binding(0) var<storage, read_write> x_out : array<f32>;
@group(0) @binding(1) var<storage, read_write> y_out : array<f32>;
@group(0) @binding(2) var<storage, read_write> z_out : array<f32>;
@group(0) @binding(3) var<uniform> uGrid : GridSize;
@group(0) @binding(4) var<uniform> uTime : f32;

fn ID(x : f32, y : f32) -> u32 { return u32(x + y * uGrid.dyeW); }

fn noise(p_ : vec3<f32>) -> f32 {
  var p = p_;
	var ip=floor(p);
  p-=ip; 
  var s=vec3(7.,157.,113.);
  var h=vec4(0.,s.y, s.z,s.y+s.z)+dot(ip,s);
  p=p*p*(3. - 2.*p); 
  h=mix(fract(sin(h)*43758.5),fract(sin(h+s.x)*43758.5),p.x);
  var r=mix(h.xz,h.yw,p.y);
  h.x = r.x;
  h.y = r.y;
  return mix(h.x,h.y,p.z); 
}

fn fbm(p_ : vec3<f32>, octaveNum : i32) -> vec2<f32> {
  var p=p_;
	var acc = vec2(0.);	
	var freq = 1.0;
	var amp = 0.5;
  var shift = vec3(100.);
	for (var i = 0; i < octaveNum; i++) {
		acc += vec2(noise(p), noise(p + vec3(0.,0.,10.))) * amp;
    p = p * 2.0 + shift;
    amp *= 0.5;
	}
	return acc;
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {

  ${W}

  var uv = pos/vec2(uGrid.dyeW, uGrid.dyeH);
  var zoom = 4.;

  var smallNoise = fbm(vec3(uv.x*zoom*2., uv.y*zoom*2., uTime+2.145), 7) - .5;
  var bigNoise = fbm(vec3(uv.x*zoom, uv.y*zoom, uTime*.1+30.), 7) - .5;

  var noise = max(length(bigNoise) * 0.035, 0.);
  var noise2 = max(length(smallNoise) * 0.035, 0.);

  noise = noise + noise2 * .05;

  var czoom = 4.;
  var n = fbm(vec3(uv.x*czoom, uv.y*czoom, uTime*.1+63.1), 7)*.75+.25;
  var n2 = fbm(vec3(uv.x*czoom, uv.y*czoom, uTime*.1+23.4), 7)*.75+.25;
  
  var col = vec3(1.);

  x_out[index] += noise * col.x;
  y_out[index] += noise * col.y;
  z_out[index] += noise * col.z;
}`,Le=`
${c}

struct VertexOut {
  @builtin(position) position : vec4<f32>,
  @location(1) uv : vec2<f32>,
};

@group(0) @binding(0) var<storage, read> fieldX : array<f32>;
@group(0) @binding(1) var<storage, read> fieldY : array<f32>;
@group(0) @binding(2) var<storage, read> fieldZ : array<f32>;
@group(0) @binding(3) var<uniform> uGrid : GridSize;
@group(0) @binding(4) var<uniform> multiplier : f32;


@vertex
fn vertex_main(@location(0) position: vec4<f32>) -> VertexOut
{
    var output : VertexOut;
    output.position = position;
    output.uv = position.xy*.5+.5;
    return output;
}

@fragment
fn fragment_main(fragData : VertexOut) -> @location(0) vec4<f32>
{
    var w = uGrid.dyeW;
    var h = uGrid.dyeH;

    let fuv = vec2<f32>((floor(fragData.uv*vec2(w, h))));
    let id = u32(fuv.x + fuv.y * w);

    let r = fieldX[id];
    let g = fieldY[id];
    let b = fieldZ[id];
    let col = vec3(r, g, b);

    let alpha = clamp(length(col), 0.0, 1.0);
    return vec4(col * multiplier, alpha);
}
`;class Ce{constructor(){const r=new Float32Array([-1,-1,0,1,-1,1,0,1,1,-1,0,1,1,-1,0,1,-1,1,0,1,1,1,0,1]);this.vertexBuffer=s.createBuffer({size:r.byteLength,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST,mappedAtCreation:!0}),new Float32Array(this.vertexBuffer.getMappedRange()).set(r),this.vertexBuffer.unmap();const i=[{attributes:[{shaderLocation:0,offset:0,format:"float32x4"}],arrayStride:16,stepMode:"vertex"}],t=s.createShaderModule({code:Le});this.renderPipeline=s.createRenderPipeline({layout:"auto",vertex:{module:t,entryPoint:"vertex_main",buffers:i},fragment:{module:t,entryPoint:"fragment_main",targets:[{format:q}]},primitive:{topology:"triangle-list"}}),this.buffer=new g({dims:3,w:e.dye_w,h:e.dye_h});const o=[...this.buffer.buffers,p.gridSize.buffer,p.render_intensity_multiplier.buffer].map((n,d)=>({binding:d,resource:{buffer:n}}));this.renderBindGroup=s.createBindGroup({layout:this.renderPipeline.getBindGroupLayout(0),entries:o}),this.renderPassDescriptor={colorAttachments:[{clearValue:{r:0,g:0,b:0,a:0},loadOp:"clear",storeOp:"store"}]}}dispatch(r){this.renderPassDescriptor.colorAttachments[0].view=D.getCurrentTexture().createView();const i=r.beginRenderPass(this.renderPassDescriptor);i.setPipeline(this.renderPipeline),i.setBindGroup(0,this.renderBindGroup),i.setVertexBuffer(0,this.vertexBuffer),i.draw(6),i.end()}}class g{constructor({dims:r=1,w:i=e.grid_w,h:t=e.grid_h}={}){this.dims=r,this.bufferSize=i*t*4,this.w=i,this.h=t,this.buffers=new Array(r).fill().map(o=>s.createBuffer({size:this.bufferSize,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST}))}copyTo(r,i){for(let t=0;t<Math.max(this.dims,r.dims);t++)i.copyBufferToBuffer(this.buffers[Math.min(t,this.buffers.length-1)],0,r.buffers[Math.min(t,r.buffers.length-1)],0,this.bufferSize)}clear(r){for(let i=0;i<this.dims;i++)r.writeBuffer(this.buffers[i],0,new Float32Array(this.w*this.h))}}class l{constructor(r,{size:i,value:t}={}){if(this.name=r,this.size=i??(t&&typeof t=="object"?t.length:1),this.needsUpdate=!1,this.size===1&&e[r]==null&&(e[r]=t??0,this.alwaysUpdate=!0),this.size===1||t!=null){this.buffer=s.createBuffer({mappedAtCreation:!0,size:this.size*4,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});const o=this.buffer.getMappedRange(),n=t??[e[this.name]],d=typeof n=="number"?[n]:Array.isArray(n)?n:[0];new Float32Array(o).set(new Float32Array(d)),this.buffer.unmap()}else this.buffer=s.createBuffer({size:this.size*4,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});p[r]=this}setValue(r){e[this.name]=r,this.needsUpdate=!0}update(r,i){(this.needsUpdate||this.alwaysUpdate||i!=null)&&(typeof this.needsUpdate!="boolean"&&(i=this.needsUpdate),r.writeBuffer(this.buffer,0,new Float32Array(i??[parseFloat(e[this.name])]),0,this.size),this.needsUpdate=!1)}}class h{constructor({buffers:r=[],uniforms:i=[],shader:t,dispatchX:o=e.grid_w,dispatchY:n=e.grid_h}){this.computePipeline=s.createComputePipeline({layout:"auto",compute:{module:s.createShaderModule({code:t}),entryPoint:"main"}});const d=r.map(u=>u.buffers).flat(),w=i.filter(u=>u&&u.buffer).map(u=>u.buffer),v=[...d,...w].map((u,y)=>({binding:y,resource:{buffer:u}}));this.bindGroup=s.createBindGroup({layout:this.computePipeline.getBindGroupLayout(0),entries:v}),this.dispatchX=o,this.dispatchY=n}dispatch(r){r.setPipeline(this.computePipeline),r.setBindGroup(0,this.bindGroup),r.dispatchWorkgroups(Math.ceil(this.dispatchX/8),Math.ceil(this.dispatchY/8))}}class E extends h{constructor({in_quantity:r,in_velocity:i,out_quantity:t,uniforms:o,shader:n=Ge,...d}){o??=[p.gridSize],super({buffers:[r,i,t],uniforms:o,shader:n,...d})}}class Ie extends h{constructor({in_velocity:r,out_divergence:i,uniforms:t,shader:o=Se}){t??=[p.gridSize],super({buffers:[r,i],uniforms:t,shader:o})}}class qe extends h{constructor({in_pressure:r,in_divergence:i,out_pressure:t,uniforms:o,shader:n=Pe}){o??=[p.gridSize],super({buffers:[r,i,t],uniforms:o,shader:n})}}class $e extends h{constructor({in_pressure:r,in_velocity:i,out_velocity:t,uniforms:o,shader:n=Be}){o??=[p.gridSize],super({buffers:[r,i,t],uniforms:o,shader:n})}}class C extends h{constructor({in_quantity:r,out_quantity:i,uniforms:t,shader:o=Re}){t??=[p.gridSize],super({buffers:[r,i],uniforms:t,shader:o})}}class I extends h{constructor({in_quantity:r,out_quantity:i,uniforms:t,shader:o=he,...n}){t??=[p.gridSize],super({buffers:[r,i],uniforms:t,shader:o,...n})}}class Ae extends h{constructor({in_velocity:r,out_vorticity:i,uniforms:t,shader:o=De,...n}){t??=[p.gridSize],super({buffers:[r,i],uniforms:t,shader:o,...n})}}class Ve extends h{constructor({in_velocity:r,in_vorticity:i,out_velocity:t,uniforms:o,shader:n=Te,...d}){o??=[p.gridSize],super({buffers:[r,i,t],uniforms:o,shader:n,...d})}}function xe(){_=new g({dims:2}),b=new g({dims:2}),P=new g({dims:3,w:e.dye_w,h:e.dye_h}),$=new g({dims:3,w:e.dye_w,h:e.dye_h}),A=new g,V=new g,G=new g,B=new g,Y=new g}function Ye(){T=new l("time"),S=new l("dt"),M=new l("mouseInfos",{size:4}),m=new l("gridSize",{size:7,value:[e.grid_w,e.grid_h,e.dye_w,e.dye_h,e.dx,e.rdx,e.dyeRdx]}),new l("sim_speed",{value:e.sim_speed}),H=new l("velocity_add_intensity",{value:e.velocity_add_intensity}),N=new l("velocity_add_radius",{value:e.velocity_add_radius}),Z=new l("velocity_diffusion",{value:e.velocity_diffusion}),j=new l("dye_add_intensity",{value:e.dye_add_intensity}),J=new l("dye_add_radius",{value:e.dye_add_radius}),K=new l("dye_diffusion",{value:e.dye_diffusion}),Q=new l("viscosity",{value:e.viscosity}),ee=new l("vorticity",{value:e.vorticity}),re=new l("contain_fluid",{value:e.contain_fluid}),F=new l("mouse_type",{value:0}),new l("render_intensity_multiplier",{value:1})}function _e(){new h({buffers:[P],shader:Ue,dispatchX:e.dye_w,dispatchY:e.dye_h,uniforms:[m,T]}),ie=new I({in_quantity:P,out_quantity:$,uniforms:[m,M,j,J,K,T,S,F],dispatchX:e.dye_w,dispatchY:e.dye_h,shader:we}),te=new I({in_quantity:_,out_quantity:b,uniforms:[m,M,H,N,Z,S,T,F]}),ne=new E({in_quantity:b,in_velocity:b,out_quantity:_,uniforms:[m,S]}),oe=new C({in_quantity:_,out_quantity:b,uniforms:[m,re]}),ae=new Ie({in_velocity:b,out_divergence:V}),ue=new C({in_quantity:V,out_quantity:A,shader:k}),de=new qe({in_pressure:G,in_divergence:A,out_pressure:B}),se=new C({in_quantity:B,out_quantity:G,shader:k}),fe=new $e({in_pressure:G,in_velocity:b,out_velocity:_}),le=new E({in_quantity:$,in_velocity:_,out_quantity:P,uniforms:[m,S],dispatchX:e.dye_w,dispatchY:e.dye_h,shader:ze}),ye=new I({in_quantity:G,out_quantity:B,uniforms:[m,Q],shader:Me}),ce=new Ae({in_velocity:_,out_vorticity:Y}),pe=new Ve({in_velocity:_,in_vorticity:Y,out_velocity:b,uniforms:[m,S,ee]}),O=new Ce}async function Fe(){if(!await me())return;xe(),Ye(),_e();function r(){_.clear(s.queue),P.clear(s.queue),G.clear(s.queue),e.time=0}e.reset=r;function i(n){ie.dispatch(n),te.dispatch(n),ne.dispatch(n),oe.dispatch(n),ae.dispatch(n),ue.dispatch(n);for(let d=0;d<e.pressure_iterations;d++)de.dispatch(n),se.dispatch(n);fe.dispatch(n),ye.dispatch(n),ce.dispatch(n),pe.dispatch(n),le.dispatch(n)}let t=performance.now();async function o(){requestAnimationFrame(o);const n=performance.now();if(e.dt=Math.min(1/60,(n-t)/1e3)*e.sim_speed,e.time+=e.dt,t=n,Object.values(p).forEach(u=>u.update(s.queue)),f.current){let u=f.last?f.current[0]-f.last[0]:0,y=f.last?f.current[1]-f.last[1]:0;("ontouchstart"in window||navigator.maxTouchPoints>0)&&(u*=.2,y*=.2),f.velocity=[u,y],M.update(s.queue,[...f.current,...f.velocity]),f.last=[...f.current]}const d=s.createCommandEncoder(),w=d.beginComputePass();i(w),w.end(),b.copyTo(_,d),B.copyTo(G,d),P.copyTo(O.buffer,d),O.dispatch(d);const v=d.finish();s.queue.submit([v])}o()}Fe();
