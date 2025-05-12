var fpscountersetactive = null;
var fpscountergetactive = null;
var fpsconttopleftelemname;
document.addEventListener("DOMContentLoaded", ()=>{
	let lastfpstime = 0;
	let lasttimedifflog = [];
	const container = document.getElementById("fpscounter2");
	let lastTop = 0;
	let lastLeft = 0;
	const counter = document.createElement("div");
	const chartelem = document.createElement("canvas");
	const chartavgelem = document.createElement("div");
	const chartwidth = Number(container.getAttribute("width"));
	const chartheight = Number(container.getAttribute("height"));
	const maxframes = Number(chartelem.dataset["maxlasttimediffloglen"]);
	const fpschartwidthmulti = chartwidth/maxframes;
	
	container.appendChild(counter);
	container.appendChild(chartelem);
	container.appendChild(chartavgelem);
	//true if using `file` protocol, or reduced motion off and not mobile and more than 8 logical processors
	let fpscounteractive = !(window.matchMedia("(prefers-reduced-motion)")?.matches??true)//reduced motion off
			&& (!navigator.userAgent.match(/Mobile/i) && navigator.hardwareConcurrency>=8)//and not mobile and more than 8 logical processors
			|| window.location.protocol.match(/^file/i);//if using `file` protocol
	
	function nextFrame(time){
		const timediff = time - lastfpstime;
		lastfpstime = time;
		maxfps = 1000/Math.min(...lasttimedifflog);
		lasttimedifflog.push(timediff);
		if (lasttimedifflog.length > maxframes) {
			lasttimedifflog = lasttimedifflog.slice(-maxframes);
		}
		const fpschartheightmulti = chartheight/maxfps;
		const fpsavg = (1000/(lasttimedifflog.reduce((a,b)=>a+b)/lasttimedifflog.length)).toFixed(5);
		const chartavg = fpsavg*fpschartheightmulti;
		const xoffset = maxframes-lasttimedifflog.length;
		counter.textContent = fpsavg + " fps avg (last "+lasttimedifflog.length+" frames)\n"
		                 + (1000/timediff).toFixed(5) + " fps";
		chartelem.setAttribute("d", "M"+Object.entries(lasttimedifflog).map(a=>((Number(a[0])+xoffset)*fpschartwidthmulti+","+(1000/a[1]*fpschartheightmulti).toFixed(3))).join(" "));
		chartavgelem.setAttribute("d", "M 0,"+chartavg+"h"+chartwidth);
		
		if(fpsconttopleftelemname!=null){
			const fpsconttopleftelem = document.getElementById(fpsconttopleftelemname);
			if(fpsconttopleftelem){
				const compStyle = window.getComputedStyle(fpsconttopleftelem)
				const newTop = parseFloat(compStyle.height) + parseFloat(compStyle.top);
				const newLeft = compStyle.left;
				// Only update if position has changed
				if (lastTop !== newTop || lastLeft !== newLeft) {
					container.style.top = newTop + "px";
					container.style.left = newLeft;
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
