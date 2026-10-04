/* SunCalc v1.9.0 — https://github.com/mourner/suncalc/tree/v1.9.0
Copyright (c) 2014, Vladimir Agafonkin
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are
permitted provided that the following conditions are met:

   1. Redistributions of source code must retain the above copyright notice, this list of
      conditions and the following disclaimer.

   2. Redistributions in binary form must reproduce the above copyright notice, this list
      of conditions and the following disclaimer in the documentation and/or other materials
      provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY
EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

*/
/*
 (c) 2011-2015, Vladimir Agafonkin
 SunCalc is a JavaScript library for calculating sun/moon position and light phases.
 https://github.com/mourner/suncalc
*/

(function () { 'use strict';

// shortcuts for easier to read formulas

var PI   = Math.PI,
    sin  = Math.sin,
    cos  = Math.cos,
    tan  = Math.tan,
    asin = Math.asin,
    atan = Math.atan2,
    acos = Math.acos,
    rad  = PI / 180;

// sun calculations are based on http://aa.quae.nl/en/reken/zonpositie.html formulas


// date/time constants and conversions

var dayMs = 1000 * 60 * 60 * 24,
    J1970 = 2440588,
    J2000 = 2451545;

function toJulian(date) { return date.valueOf() / dayMs - 0.5 + J1970; }
function fromJulian(j)  { return new Date((j + 0.5 - J1970) * dayMs); }
function toDays(date)   { return toJulian(date) - J2000; }


// general calculations for position

var e = rad * 23.4397; // obliquity of the Earth

function rightAscension(l, b) { return atan(sin(l) * cos(e) - tan(b) * sin(e), cos(l)); }
function declination(l, b)    { return asin(sin(b) * cos(e) + cos(b) * sin(e) * sin(l)); }

function azimuth(H, phi, dec)  { return atan(sin(H), cos(H) * sin(phi) - tan(dec) * cos(phi)); }
function altitude(H, phi, dec) { return asin(sin(phi) * sin(dec) + cos(phi) * cos(dec) * cos(H)); }

function siderealTime(d, lw) { return rad * (280.16 + 360.9856235 * d) - lw; }

function astroRefraction(h) {
    if (h < 0) // the following formula works for positive altitudes only.
        h = 0; // if h = -0.08901179 a div/0 would occur.

    // formula 16.4 of "Astronomical Algorithms" 2nd edition by Jean Meeus (Willmann-Bell, Richmond) 1998.
    // 1.02 / tan(h + 10.26 / (h + 5.10)) h in degrees, result in arc minutes -> converted to rad:
    return 0.0002967 / Math.tan(h + 0.00312536 / (h + 0.08901179));
}

// general sun calculations

function solarMeanAnomaly(d) { return rad * (357.5291 + 0.98560028 * d); }

function eclipticLongitude(M) {

    var C = rad * (1.9148 * sin(M) + 0.02 * sin(2 * M) + 0.0003 * sin(3 * M)), // equation of center
        P = rad * 102.9372; // perihelion of the Earth

    return M + C + P + PI;
}

function sunCoords(d) {

    var M = solarMeanAnomaly(d),
        L = eclipticLongitude(M);

    return {
        dec: declination(L, 0),
        ra: rightAscension(L, 0)
    };
}


var SunCalc = {};


// calculates sun position for a given date and latitude/longitude

SunCalc.getPosition = function (date, lat, lng) {

    var lw  = rad * -lng,
        phi = rad * lat,
        d   = toDays(date),

        c  = sunCoords(d),
        H  = siderealTime(d, lw) - c.ra;

    return {
        azimuth: azimuth(H, phi, c.dec),
        altitude: altitude(H, phi, c.dec)
    };
};


// sun times configuration (angle, morning name, evening name)

var times = SunCalc.times = [
    [-0.833, 'sunrise',       'sunset'      ],
    [  -0.3, 'sunriseEnd',    'sunsetStart' ],
    [    -6, 'dawn',          'dusk'        ],
    [   -12, 'nauticalDawn',  'nauticalDusk'],
    [   -18, 'nightEnd',      'night'       ],
    [     6, 'goldenHourEnd', 'goldenHour'  ]
];

// adds a custom time to the times config

SunCalc.addTime = function (angle, riseName, setName) {
    times.push([angle, riseName, setName]);
};


// calculations for sun times

var J0 = 0.0009;

function julianCycle(d, lw) { return Math.round(d - J0 - lw / (2 * PI)); }

function approxTransit(Ht, lw, n) { return J0 + (Ht + lw) / (2 * PI) + n; }
function solarTransitJ(ds, M, L)  { return J2000 + ds + 0.0053 * sin(M) - 0.0069 * sin(2 * L); }

function hourAngle(h, phi, d) { return acos((sin(h) - sin(phi) * sin(d)) / (cos(phi) * cos(d))); }
function observerAngle(height) { return -2.076 * Math.sqrt(height) / 60; }

// returns set time for the given sun altitude
function getSetJ(h, lw, phi, dec, n, M, L) {

    var w = hourAngle(h, phi, dec),
        a = approxTransit(w, lw, n);
    return solarTransitJ(a, M, L);
}


// calculates sun times for a given date, latitude/longitude, and, optionally,
// the observer height (in meters) relative to the horizon

SunCalc.getTimes = function (date, lat, lng, height) {

    height = height || 0;

    var lw = rad * -lng,
        phi = rad * lat,

        dh = observerAngle(height),

        d = toDays(date),
        n = julianCycle(d, lw),
        ds = approxTransit(0, lw, n),

        M = solarMeanAnomaly(ds),
        L = eclipticLongitude(M),
        dec = declination(L, 0),

        Jnoon = solarTransitJ(ds, M, L),

        i, len, time, h0, Jset, Jrise;


    var result = {
        solarNoon: fromJulian(Jnoon),
        nadir: fromJulian(Jnoon - 0.5)
    };

    for (i = 0, len = times.length; i < len; i += 1) {
        time = times[i];
        h0 = (time[0] + dh) * rad;

        Jset = getSetJ(h0, lw, phi, dec, n, M, L);
        Jrise = Jnoon - (Jset - Jnoon);

        result[time[1]] = fromJulian(Jrise);
        result[time[2]] = fromJulian(Jset);
    }

    return result;
};


// moon calculations, based on http://aa.quae.nl/en/reken/hemelpositie.html formulas

function moonCoords(d) { // geocentric ecliptic coordinates of the moon

    var L = rad * (218.316 + 13.176396 * d), // ecliptic longitude
        M = rad * (134.963 + 13.064993 * d), // mean anomaly
        F = rad * (93.272 + 13.229350 * d),  // mean distance

        l  = L + rad * 6.289 * sin(M), // longitude
        b  = rad * 5.128 * sin(F),     // latitude
        dt = 385001 - 20905 * cos(M);  // distance to the moon in km

    return {
        ra: rightAscension(l, b),
        dec: declination(l, b),
        dist: dt
    };
}

SunCalc.getMoonPosition = function (date, lat, lng) {

    var lw  = rad * -lng,
        phi = rad * lat,
        d   = toDays(date),

        c = moonCoords(d),
        H = siderealTime(d, lw) - c.ra,
        h = altitude(H, phi, c.dec),
        // formula 14.1 of "Astronomical Algorithms" 2nd edition by Jean Meeus (Willmann-Bell, Richmond) 1998.
        pa = atan(sin(H), tan(phi) * cos(c.dec) - sin(c.dec) * cos(H));

    h = h + astroRefraction(h); // altitude correction for refraction

    return {
        azimuth: azimuth(H, phi, c.dec),
        altitude: h,
        distance: c.dist,
        parallacticAngle: pa
    };
};


// calculations for illumination parameters of the moon,
// based on http://idlastro.gsfc.nasa.gov/ftp/pro/astro/mphase.pro formulas and
// Chapter 48 of "Astronomical Algorithms" 2nd edition by Jean Meeus (Willmann-Bell, Richmond) 1998.

SunCalc.getMoonIllumination = function (date) {

    var d = toDays(date || new Date()),
        s = sunCoords(d),
        m = moonCoords(d),

        sdist = 149598000, // distance from Earth to Sun in km

        phi = acos(sin(s.dec) * sin(m.dec) + cos(s.dec) * cos(m.dec) * cos(s.ra - m.ra)),
        inc = atan(sdist * sin(phi), m.dist - sdist * cos(phi)),
        angle = atan(cos(s.dec) * sin(s.ra - m.ra), sin(s.dec) * cos(m.dec) -
                cos(s.dec) * sin(m.dec) * cos(s.ra - m.ra));

    return {
        fraction: (1 + cos(inc)) / 2,
        phase: 0.5 + 0.5 * inc * (angle < 0 ? -1 : 1) / Math.PI,
        angle: angle
    };
};


function hoursLater(date, h) {
    return new Date(date.valueOf() + h * dayMs / 24);
}

// calculations for moon rise/set times are based on http://www.stargazing.net/kepler/moonrise.html article

SunCalc.getMoonTimes = function (date, lat, lng, inUTC) {
    var t = new Date(date);
    if (inUTC) t.setUTCHours(0, 0, 0, 0);
    else t.setHours(0, 0, 0, 0);

    var hc = 0.133 * rad,
        h0 = SunCalc.getMoonPosition(t, lat, lng).altitude - hc,
        h1, h2, rise, set, a, b, xe, ye, d, roots, x1, x2, dx;

    // go in 2-hour chunks, each time seeing if a 3-point quadratic curve crosses zero (which means rise or set)
    for (var i = 1; i <= 24; i += 2) {
        h1 = SunCalc.getMoonPosition(hoursLater(t, i), lat, lng).altitude - hc;
        h2 = SunCalc.getMoonPosition(hoursLater(t, i + 1), lat, lng).altitude - hc;

        a = (h0 + h2) / 2 - h1;
        b = (h2 - h0) / 2;
        xe = -b / (2 * a);
        ye = (a * xe + b) * xe + h1;
        d = b * b - 4 * a * h1;
        roots = 0;

        if (d >= 0) {
            dx = Math.sqrt(d) / (Math.abs(a) * 2);
            x1 = xe - dx;
            x2 = xe + dx;
            if (Math.abs(x1) <= 1) roots++;
            if (Math.abs(x2) <= 1) roots++;
            if (x1 < -1) x1 = x2;
        }

        if (roots === 1) {
            if (h0 < 0) rise = i + x1;
            else set = i + x1;

        } else if (roots === 2) {
            rise = i + (ye < 0 ? x2 : x1);
            set = i + (ye < 0 ? x1 : x2);
        }

        if (rise && set) break;

        h0 = h2;
    }

    var result = {};

    if (rise) result.rise = hoursLater(t, rise);
    if (set) result.set = hoursLater(t, set);

    if (!rise && !set) result[ye > 0 ? 'alwaysUp' : 'alwaysDown'] = true;

    return result;
};


// export as Node module / AMD module / browser variable
if (typeof exports === 'object' && typeof module !== 'undefined') module.exports = SunCalc;
else if (typeof define === 'function' && define.amd) define(SunCalc);
else window.SunCalc = SunCalc;

}());

// Scene lighting adapter. SunCalc above is vendored, pinned to v1.9.0.
(function(root){
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  // Moon: SunCalc's moon is geocentric (no ~1° parallax) and keeps only the main lunar term, so
  // its rise ran minutes early and its set/fade-out up to ~7 min late. Truncated Meeus ch. 47
  // (~0.05°) + topocentric parallax; rise/set = upper limb on the horizon with 34' refraction.
  const R=Math.PI/180,OBL=23.4397*R,S=Math.sin,C=Math.cos;
  function moonGeo(d){   // d = days since J2000
    const T=d/36525,D=(297.8501921+445267.1114034*T)*R,M=(357.5291092+35999.0502909*T)*R,
      Mp=(134.9633964+477198.8675055*T)*R,F=(93.272095+483202.0175233*T)*R;
    const lon=(218.3164477+481267.88123421*T+6.288774*S(Mp)+1.274027*S(2*D-Mp)+.658314*S(2*D)+.213618*S(2*Mp)
      -.185116*S(M)-.114332*S(2*F)+.058793*S(2*D-2*Mp)+.057066*S(2*D-M-Mp)+.053322*S(2*D+Mp)+.045758*S(2*D-M)
      -.040923*S(M-Mp)-.03472*S(D)-.030383*S(M+Mp))*R;
    const lat=(5.128122*S(F)+.280602*S(Mp+F)+.277693*S(Mp-F)+.173237*S(2*D-F)+.055413*S(2*D-Mp+F)+.046271*S(2*D-Mp-F))*R;
    const dist=385000.56-20905.355*C(Mp)-3699.111*C(2*D-Mp)-2955.968*C(2*D)-569.925*C(2*Mp);
    return {ra:Math.atan2(S(lon)*C(OBL)-Math.tan(lat)*S(OBL),C(lon)),dec:Math.asin(S(lat)*C(OBL)+C(lat)*S(OBL)*S(lon)),dist};
  }
  function moonSky(date,lat,lon){
    const d=+date/864e5+2440587.5-2451545,m=moonGeo(d),phi=lat*R,H=(280.46061837+360.98564736629*d+lon)*R-m.ra;   // GMST (SunCalc's 280.16 drifts ~0.5° by 2026)
    const geo=Math.asin(S(phi)*S(m.dec)+C(phi)*C(m.dec)*C(H));
    const h=geo-Math.asin(6378.14/m.dist)*C(geo),sd=Math.asin(1737.4/m.dist);   // topocentric, true
    const refr=h>-1.5*R?.0002967/Math.tan(Math.max(h,-.5*R)+.00312536/(Math.max(h,-.5*R)+.08901179)):0;
    // limb: upper limb's apparent height over the horizon (0 = rising/setting), standard 34' refraction
    return {altitude:h+refr,azimuth:Math.atan2(S(H),C(H)*S(phi)-Math.tan(m.dec)*C(phi)),limb:h+sd+.5667*R};
  }
  // Rise/set within the local day of `date` (same 2-hour quadratic scan as SunCalc.getMoonTimes).
  function moonTimes(date,lat,lon){
    const t=new Date(date);t.setHours(0,0,0,0);
    const f=i=>moonSky(new Date(+t+i*36e5),lat,lon).limb;
    let h0=f(0),rise,set,ye=h0;
    for(let i=1;i<=24;i+=2){
      const h1=f(i),h2=f(i+1),a=(h0+h2)/2-h1,b=(h2-h0)/2,xe=-b/(2*a),disc=b*b-4*a*h1;ye=(a*xe+b)*xe+h1;
      let roots=0,x1,x2;
      if(disc>=0){const dx=Math.sqrt(disc)/(Math.abs(a)*2);x1=xe-dx;x2=xe+dx;if(Math.abs(x1)<=1)roots++;if(Math.abs(x2)<=1)roots++;if(x1<-1)x1=x2;}
      if(roots===1){if(h0<0)rise=i+x1;else set=i+x1;}
      else if(roots===2){rise=i+(ye<0?x2:x1);set=i+(ye<0?x1:x2);}
      if(rise!==undefined&&set!==undefined)break;
      h0=h2;
    }
    return {rise:rise!==undefined?new Date(+t+rise*36e5):null,set:set!==undefined?new Date(+t+set*36e5):null};
  }
  function calculate(date,location){
    const lat=location&&location.latitude,lon=location&&location.longitude;
    if(!Number.isFinite(lat)||Math.abs(lat)>90||!Number.isFinite(lon)||Math.abs(lon)>180||!Number.isFinite(+date))return null;
    const calc=root.SunCalc || (typeof module!=='undefined'&&module.exports),sun=calc.getPosition(date,lat,lon),moon=moonSky(date,lat,lon);
    const marks=[['nadir',0],['nightEnd',5],['dawn',5.8],['sunrise',6.3],['goldenHourEnd',7.6],['solarNoon',12],['goldenHour',16.3],['sunset',18.3],['dusk',19.6],['night',21]];
    const knots=[];
    for(let offset=-2;offset<=2;offset++){
      const times=calc.getTimes(new Date(+date+offset*86400000),lat,lon);
      for(const [key,hour]of marks)if(Number.isFinite(+times[key]))knots.push({t:+times[key],hour});
    }
    knots.sort((a,b)=>a.t-b.t);
    const today=calc.getTimes(date,lat,lon);let hour;
    if(Number.isFinite(+today.sunrise)&&Number.isFinite(+today.sunset)){
      for(let i=1;i<knots.length;i++)if(knots[i-1].t<=+date&&+date<=knots[i].t){const a=knots[i-1],b=knots[i],end=b.hour<a.hour?b.hour+24:b.hour;hour=(a.hour+(end-a.hour)*(+date-a.t)/Math.max(1,b.t-a.t))%24;break;}
    }
    // Polar day/night: altitude remains authoritative when rise/set is absent.
    if(!Number.isFinite(hour)){const alt=sun.altitude*180/Math.PI;hour=alt>=6?12:alt>=-.833?6.3+(alt+.833)/6.833*1.3:alt>=-6?5.8+(alt+6)/5.167*.5:alt>=-18?5+(alt+18)/12*.8:0;}
    const lunar=moonTimes(date,lat,lon),phase=calc.getMoonIllumination(date);
    const stamp=d=>Number.isFinite(+d)?+d:null;
    return {hour,isDay:sun.altitude>-.833*Math.PI/180,sunrise:stamp(today.sunrise),sunset:stamp(today.sunset),dawn:stamp(today.dawn),dusk:stamp(today.dusk),moonrise:stamp(lunar.rise),moonset:stamp(lunar.set),
      sun:{altitude:sun.altitude,azimuth:sun.azimuth},moon:{altitude:moon.altitude,azimuth:moon.azimuth,visibility:clamp(.5+moon.limb/(.5*R),0,1),fraction:phase.fraction,phase:phase.phase},approximate:!!location.approximate};
  }
  root.LWAstronomy={calculate,moonTimes,moonSky};
  if(typeof module!=='undefined'&&module.exports)module.exports.sceneAstronomy=root.LWAstronomy;
})(typeof window!=='undefined'?window:globalThis);
