var fpscountersetactive = null;
var fpscountergetactive = null;
var fpsconttopleftelemname;
document.addEventListener("DOMContentLoaded", ()=>{
	const SVGNS = "http://www.w3.org/2000/svg";
	const fpscont = document.getElementById("fpscountercontainer");
	let lasttimedifflog = [];
	let lastfpstime = 0;
	let maxfps = 60;
	let lastTop = 0;
	let lastLeft = 0;
	
	const fpscounter = document.createElementNS(SVGNS, "text");
	fpscounter.setAttribute("alignment-baseline", "hanging");
	fpscounter.classList.add("fpscounter");
	fpscont.appendChild(fpscounter);
	
	const fpschartelem = document.createElementNS(SVGNS, "path");
	fpschartelem.classList.add("fpschart");
	fpscont.appendChild(fpschartelem);
	
	const fpschartavg = document.createElementNS(SVGNS, "path");
	fpschartavg.classList.add("fpschartavg");
	fpscont.appendChild(fpschartavg);
	
	const fpschartwidth = Number(fpscont.getAttribute("width"));
	const fpschartheight = Number(fpscont.getAttribute("height"));
	
	//true if using `file` protocol, or reduced motion off and not mobile and more than 8 logical processors
	let fpscounteractive = !(window.matchMedia("(prefers-reduced-motion)")?.matches??true)//reduced motion off
			&& (!navigator.userAgent.match(/Mobile/i) && navigator.hardwareConcurrency>=8)//and not mobile and more than 8 logical processors
			|| window.location.protocol.match(/^file/i);//if using `file` protocol
	
	function nextFrame(time){
		const timediff = time - lastfpstime;
		lastfpstime = time;
		maxfps = 1000/Math.min(...lasttimedifflog);
		lasttimedifflog.push(timediff);
		const maxframes = Number(fpscont.dataset.maxlasttimediffloglen);
		if (lasttimedifflog.length > maxframes) {
			lasttimedifflog = lasttimedifflog.slice(-maxframes);
		}
		const fpschartwidthmulti = fpschartwidth/maxframes;
		const fpschartheightmulti = fpschartheight/maxfps;
		const fpsavg = (1000/(lasttimedifflog.reduce((a,b)=>a+b)/lasttimedifflog.length)).toFixed(5);
		const chartavg = fpsavg*fpschartheightmulti;
		const xoffset = maxframes-lasttimedifflog.length;
		fpscounter.textContent = fpsavg + " fps avg (last "+lasttimedifflog.length+" frames)\n"
		                 + (1000/timediff).toFixed(5) + " fps";
		fpschartelem.setAttribute("d", "M"+Object.entries(lasttimedifflog).map(a=>((Number(a[0])+xoffset)*fpschartwidthmulti+","+(1000/a[1]*fpschartheightmulti).toFixed(3))).join(" "));
		fpschartavg.setAttribute("d", "M 0,"+chartavg+"h"+fpschartwidth);
		
		if(fpsconttopleftelemname!=null){
			const fpsconttopleftelem = document.getElementById(fpsconttopleftelemname);
			if(fpsconttopleftelem){
				const compStyle = window.getComputedStyle(fpsconttopleftelem)
				const newTop = parseFloat(compStyle.height) + parseFloat(compStyle.top);
				const newLeft = compStyle.left;
				// Only update if position has changed
				if (lastTop !== newTop || lastLeft !== newLeft) {
					fpscont.style.top = newTop + "px";
					fpscont.style.left = newLeft;
					lastTop = newTop;
					lastLeft = newLeft;
				}
			}
		}
		if(fpscounteractive){
			window.requestAnimationFrame(nextFrame);
		}
	}
	fpscountersetactive = function(active){
		if(!fpscounteractive && active){
			window.requestAnimationFrame(nextFrame);
		}
		fpscounteractive = active;
	}
	fpscountergetactive = function(){
		return fpscounteractive;
	}
	
	window.requestAnimationFrame(nextFrame);

});
